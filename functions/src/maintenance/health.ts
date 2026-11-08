import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { SITE_URL } from "../invoices/format";
import { db, FieldValue, REGION } from "../lib/admin";
import { sendMail } from "../mail/mailer";

export type HealthIssue = { code: "backup_failed" | "backup_missing" | "mail_failures" | "transfers_overdue"; count?: number; detail?: string };

/**
 * Étape E — bilan de santé quotidien : sauvegarde de la nuit, e-mails en échec sur 24 h, virements dont
 * l'échéance est passée sans validation. Écrit dans settings/health (carte « Santé du site » du tableau de bord)
 * et, s'il y a un problème, envoie un e-mail aux super-admins. Renvoie les problèmes trouvés.
 */
export async function runHealthCheck(now = Date.now()): Promise<HealthIssue[]> {
  const since = Timestamp.fromMillis(now - 86_400_000);
  const [health, failedMail, overdue] = await Promise.all([
    db.doc("settings/health").get(),
    db.collection("mail").where("status", "==", "failed").where("createdAt", ">=", since).limit(100).get(),
    db.collection("payments").where("status", "==", "initiated").where("transferDeadline", "<", Timestamp.fromMillis(now)).limit(100).get(),
  ]);
  const issues: HealthIssue[] = [];
  const backup = health.data()?.backup;
  const backupAt = backup?.at instanceof Timestamp ? backup.at.toMillis() : 0;
  if (backup?.status === "failed") issues.push({ code: "backup_failed", detail: String(backup.error ?? "") });
  else if (now - backupAt > 36 * 3_600_000) issues.push({ code: "backup_missing" });
  if (failedMail.size > 0) issues.push({ code: "mail_failures", count: failedMail.size });
  const overdueTransfers = overdue.docs.filter((d) => d.data().provider === "bank_transfer").length;
  if (overdueTransfers > 0) issues.push({ code: "transfers_overdue", count: overdueTransfers });

  await db.doc("settings/health").set({ checkedAt: FieldValue.serverTimestamp(), issues }, { merge: true });
  if (issues.length) await alertSuperadmins(issues);
  return issues;
}

const LABELS: Record<HealthIssue["code"], (i: HealthIssue) => string> = {
  backup_failed: (i) => `La sauvegarde de la nuit a échoué${i.detail ? ` (${i.detail.slice(0, 120)})` : ""}.`,
  backup_missing: () => "Aucune sauvegarde réussie depuis plus de 36 heures.",
  mail_failures: (i) => `${i.count} e-mail(s) n'ont pas pu être envoyés ces dernières 24 heures (voir « Boîte d'envoi »).`,
  transfers_overdue: (i) => `${i.count} virement(s) ont dépassé leur échéance sans être validés (voir « Virements »).`,
};

async function alertSuperadmins(issues: HealthIssue[]) {
  const admins = await db.collection("users").where("role", "==", "superadmin").limit(10).get();
  const lines = issues.map((i) => LABELS[i.code](i));
  for (const a of admins.docs) {
    const to = a.data().email as string | undefined;
    if (!to) continue;
    const text = ["Bilan de santé du site The Host Club :", "", ...lines.map((l) => `- ${l}`), "", `Tableau de bord : ${SITE_URL}/admin`].join("\n");
    const html = `<p>Bilan de santé du site The Host Club :</p><ul>${lines.map((l) => `<li>${l.replace(/[<>&]/g, "")}</li>`).join("")}</ul><p><a href="${SITE_URL}/admin">Ouvrir le tableau de bord</a></p>`;
    await sendMail({ to, locale: "fr", subject: `Santé du site : ${issues.length} point(s) à vérifier`, html, text, kind: "health_alert", refs: {} }).catch((e) => logger.error("Alerte santé non envoyée", { error: String(e) }));
  }
}

/** Chaque matin à 8 h 10 (heure de Casablanca), après la sauvegarde de la nuit. */
export const dailyHealthCheck = onSchedule({ schedule: "10 8 * * *", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  const issues = await runHealthCheck();
  if (issues.length) logger.warn("Bilan de santé : points à vérifier", { issues });
});
