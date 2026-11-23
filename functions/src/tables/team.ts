import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";
import { sendMail } from "../mail/mailer";
import { teamAlertMail } from "../mail/templates";

/**
 * Alerte à l'équipe (docs/22 § 17.H, H10) : e-mail aux admins et super-admins, une seule fois par date et par sujet
 * (marquée dans `sessions/{id}.alerts.{key}` avant l'envoi). Renvoie false si elle était déjà partie.
 */
export async function teamAlert(o: { sessionId: string; key: string; subject: string; paragraphs: string[]; path?: string }): Promise<boolean> {
  const ref = db.doc(`sessions/${o.sessionId}`);
  const claimed = await db.runTransaction(async (tx) => {
    const s = (await tx.get(ref)).data();
    if (!s || s.alerts?.[o.key]) return false;
    tx.update(ref, { [`alerts.${o.key}`]: FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) return false;
  const team = await db.collection("users").where("role", "in", ["admin", "superadmin"]).limit(20).get();
  const mail = teamAlertMail({ subject: o.subject, paragraphs: o.paragraphs, path: o.path ?? `/admin/sessions/${o.sessionId}` });
  await Promise.all(
    team.docs
      .map((u) => u.get("email") as string | undefined)
      .filter((e): e is string => Boolean(e))
      .map((to) => sendMail({ to, locale: "fr", ...mail, kind: "team_alert", refs: { sessionId: o.sessionId } }).catch((e) => logger.error("Alerte équipe non envoyée", { error: String(e) }))),
  );
  return true;
}
