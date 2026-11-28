import { planTierFallback, type TierLoad, type VenueTier } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";
import { audit } from "../lib/audit";
import { sendMail } from "../mail/mailer";
import { tierMovedMail } from "../mail/member-templates";
import { personOf } from "../notify/reminders";
import { dateTimeFor } from "../invoices/format";
import { moveReservationCore } from "../tables/move";

const SYSTEM = "system";
const TIER_LABEL: Record<VenueTier, string> = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" };

/**
 * docs/25, lot C — à la fermeture des réservations d'une date de rendez-vous (toutes gammes ensemble, une seule fois) :
 * une gamme qui n'atteint pas le minimum d'une table envoie dans une gamme voisine les personnes qui ont coché
 * « j'accepte la gamme voisine », si la gamme voisine atteint ainsi (ou garde) le minimum. Chaque personne déplacée
 * est prévenue (notification + e-mail). Les autres suivent le cas « minimum non atteint » (décision 46).
 */
export async function applyTierFallback(rendezvousId: string, startAt: Timestamp): Promise<number> {
  const sessions = (await db.collection("sessions").where("rendezvousId", "==", rendezvousId).where("startAt", "==", startAt).get()).docs
    .filter((d) => ["published", "full"].includes(String(d.get("status"))));
  const fresh = sessions.filter((d) => !d.get("tierFallbackAt"));
  if (!fresh.length) return 0;
  // Marqué d'abord : la tâche (toutes les 15 min) ne repasse jamais deux fois sur la même date.
  await Promise.all(fresh.map((d) => d.ref.update({ tierFallbackAt: FieldValue.serverTimestamp() })));
  if (sessions.length < 2) return 0;

  const loads: TierLoad[] = [];
  let min = 0;
  const exps = new Map<string, DocumentData>();
  for (const d of sessions) {
    const s = d.data();
    const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
    exps.set(d.id, e);
    if (!e.venueTier) continue;
    min = Math.max(min, Number(e.groupConfig?.minSize ?? 0));
    const res = await db.collection("reservations").where("sessionId", "==", d.id).where("status", "==", "confirmed").get();
    loads.push({
      tier: e.venueTier as VenueTier,
      sessionId: d.id,
      people: Number(s.seatsConfirmed ?? 0),
      free: Number(s.capacity ?? 0) - Number(s.seatsConfirmed ?? 0) - Number(s.seatsHeld ?? 0),
      movable: res.docs.filter((r) => r.get("tierFallback") !== false).map((r) => ({ reservationId: r.id, seats: Number(r.get("seats") ?? 1) })),
    });
  }
  if (min <= 0) return 0;
  const moves = planTierFallback(loads, min);
  let moved = 0;
  for (const m of moves) {
    try {
      await moveReservationCore({ reservationId: m.reservationId, targetSessionId: m.to, actorUid: SYSTEM, by: "admin", tierMove: true });
      moved++;
      await notifyTierMove(m.reservationId, m.toTier).catch((err) => logger.error("Gamme voisine : message", { id: m.reservationId, error: String(err) }));
    } catch (err) {
      logger.error("Gamme voisine : déplacement", { id: m.reservationId, error: String(err) });
    }
  }
  // Dates qui atteignent maintenant le minimum : plus « à risque » (sauf proposition déjà envoyée aux inscrits).
  for (const d of sessions) {
    const s = (await d.ref.get()).data() ?? {};
    const people = Number(s.seatsConfirmed ?? 0);
    if (s.risk?.status === "at_risk" && (people >= min || people === 0)) await d.ref.update({ risk: FieldValue.delete() });
  }
  if (moved) {
    await audit({ actorUid: SYSTEM, actorRole: "system", action: "rendezvous.tierFallback", targetType: "rendezvous", targetId: rendezvousId, after: { startAt: startAt.toDate().toISOString(), moved, moves: moves.map((m) => `${m.from}>${m.to}`).join(" ") } });
    logger.info("Gamme voisine", { rendezvousId, moved });
  }
  return moved;
}

async function notifyTierMove(reservationId: string, tier: VenueTier) {
  const r = (await db.doc(`reservations/${reservationId}`).get()).data();
  if (!r) return;
  const p = await personOf(r.userId);
  const label = TIER_LABEL[tier];
  await db.collection(`users/${r.userId}/notifications`).add({
    type: "tier_moved",
    title: { fr: `Vous dînez en ${label}`, ar: `مائدتك في فئة ${label}`, en: `You're in the ${label} tier` },
    body: {
      fr: `Votre gamme n'avait pas assez d'inscrits : comme vous l'aviez accepté, vous rejoignez une table ${label}. Le lieu vous sera révélé comme prévu.`,
      ar: `لم يكن عدد المسجّلين في فئتك كافيًا: كما وافقت، تنضم إلى مائدة ${label}. وسيُكشف لك المكان كما هو مقرر.`,
      en: `Your tier didn't have enough people: as you agreed, you're joining a ${label} table. The venue will be revealed as planned.`,
    },
    link: `/espace/reservations/${reservationId}`,
    createdAt: FieldValue.serverTimestamp(),
  });
  if (p.email && p.emailOk) {
    const title = r.sessionSnapshot?.title?.[p.locale] ?? r.sessionSnapshot?.title?.fr ?? "";
    const when = dateTimeFor((r.sessionSnapshot.startAt as Timestamp).toDate(), p.locale);
    await sendMail({ to: p.email, locale: p.locale, ...tierMovedMail({ locale: p.locale, firstName: p.firstName, title, when, tier: label, reservationId }), kind: "tier_moved", refs: { reservationId } });
  }
}
