import { getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";

/** Sauvegardes gardées 14 jours. */
export const BACKUP_KEEP_DAYS = 14;
const PREFIX = "backups/firestore/";

/** Dossiers de sauvegarde (AAAA-MM-JJ) plus vieux que la durée de conservation. */
export function expiredBackupFolders(folders: string[], now: Date, keepDays = BACKUP_KEEP_DAYS): string[] {
  const limit = now.getTime() - keepDays * 86_400_000;
  return folders.filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f) && Date.parse(`${f}T00:00:00Z`) < limit);
}

/**
 * Étape E — sauvegarde complète de la base (export Firestore) dans le stockage du projet, dossier privé
 * backups/firestore/AAAA-MM-JJ (aucun accès depuis le navigateur : règles Storage), puis suppression des
 * sauvegardes de plus de 14 jours. Le résultat est noté dans settings/health (carte « Santé du site »).
 * Droits nécessaires au compte de service des fonctions : « Administrateur import/export Cloud Datastore »
 * et écriture sur le bucket (docs/16). Sans eux, l'échec est noté et signalé, rien d'autre ne casse.
 */
export async function backupFirestore(now = new Date()): Promise<{ ok: boolean; path?: string; error?: string }> {
  const day = now.toISOString().slice(0, 10);
  const bucket = getStorage().bucket();
  const path = `gs://${bucket.name}/${PREFIX}${day}`;
  try {
    const project = process.env.GCLOUD_PROJECT ?? getApp().options.projectId;
    const token = await getApp().options.credential!.getAccessToken();
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default):exportDocuments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ outputUriPrefix: path }),
    });
    if (!res.ok) throw new Error(`export ${res.status} ${(await res.text()).slice(0, 300)}`);
    // Ménage : sauvegardes de plus de 14 jours.
    const [, , api] = await bucket.getFiles({ prefix: PREFIX, delimiter: "/", autoPaginate: false });
    const folders = ((api as { prefixes?: string[] } | undefined)?.prefixes ?? []).map((p) => p.slice(PREFIX.length).replace(/\/$/, ""));
    for (const f of expiredBackupFolders(folders, now)) await bucket.deleteFiles({ prefix: `${PREFIX}${f}/` });
    await db.doc("settings/health").set({ backup: { status: "ok", at: FieldValue.serverTimestamp(), path, error: null } }, { merge: true });
    return { ok: true, path };
  } catch (e) {
    const error = String(e).slice(0, 300);
    logger.error("Sauvegarde Firestore échouée", { error });
    await db.doc("settings/health").set({ backup: { status: "failed", at: FieldValue.serverTimestamp(), path, error } }, { merge: true });
    return { ok: false, error };
  }
}

/** Chaque nuit à 2 h 45 (heure de Casablanca). */
export const dailyBackup = onSchedule({ schedule: "45 2 * * *", region: REGION, timeZone: "Africa/Casablanca", timeoutSeconds: 300 }, async () => {
  await backupFirestore();
});
