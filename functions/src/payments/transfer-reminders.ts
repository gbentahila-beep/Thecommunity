import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";
import { bankTransferProvider } from "./providers/bank-transfer";
import { sendTransferInstructions } from "./transfer-mail";

/** Le rappel part quand il reste au plus 12 h avant l'échéance du virement. */
export const TRANSFER_REMINDER_HOURS = 12;

/**
 * Étape B — rappel par e-mail ~12 h avant l'échéance d'un virement encore attendu (une seule fois par paiement).
 * Rien pour un virement demandé il y a moins de 6 h (les instructions viennent d'être envoyées), ni pour une
 * réservation qui n'attend plus ce paiement. Renvoie le nombre de rappels envoyés.
 */
export async function sendTransferReminders(now = Date.now()): Promise<number> {
  const due = await db
    .collection("payments")
    .where("status", "==", "initiated")
    .where("transferDeadline", "<=", Timestamp.fromMillis(now + TRANSFER_REMINDER_HOURS * 3_600_000))
    .limit(300)
    .get();
  let sent = 0;
  for (const d of due.docs) {
    const p = d.data();
    if (p.provider !== bankTransferProvider.id || p.reminderSentAt) continue;
    if ((p.transferDeadline as Timestamp).toMillis() <= now) continue;
    if (p.createdAt instanceof Timestamp && now - p.createdAt.toMillis() < 6 * 3_600_000) continue;
    const claimed = await db.runTransaction(async (tx) => {
      const cur = (await tx.get(d.ref)).data();
      if (!cur || cur.status !== "initiated" || cur.reminderSentAt) return false;
      if (cur.reservationId) {
        const r = (await tx.get(db.doc(`reservations/${cur.reservationId}`))).data();
        if (!r || r.status !== "pending_payment" || r.paymentId !== d.id) return false;
      }
      tx.update(d.ref, { reminderSentAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (!claimed) continue;
    await sendTransferInstructions(d.id, { reminder: true });
    sent++;
  }
  return sent;
}

/** Toutes les heures. */
export const transferReminders = onSchedule({ schedule: "every 60 minutes", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  const n = await sendTransferReminders();
  if (n > 0) logger.info(`${n} rappel(s) de virement envoyé(s).`);
});
