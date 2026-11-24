import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { auth, db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { applyPaymentEvent } from "../payments/apply-event";
import { reserveSeats } from "../reservations/create-reservation";
import { fillWeekWithDemoCrowd, type CrowdResult } from "./demo-crowd";

/**
 * SITE DE DÉMONSTRATION UNIQUEMENT. « Réinitialiser la démo » (super-admin) : efface tout ce qui s'est passé
 * (réservations, paiements, factures, tables, demandes aux lieux, messages, notifications, avis des membres, dates
 * passées…), remet les dates à venir à zéro, inscrit les comptes invités (ex. une associée qui veut voir le parcours) à
 * plusieurs rendez-vous de la semaine, puis remplit la semaine avec la foule de démonstration.
 *
 * Double garde : `settings/showcase.trial === true` (posé seulement par le contenu de départ du site d'essai) ET
 * paiement de test (`settings/payment` en sandbox / test). En production, le bouton n'existe pas et l'appel est refusé.
 */

/** Collections d'activité, vidées entièrement (le contenu — événements, rendez-vous, lieux, modèles — est gardé). */
const ACTIVITY = [
  "reservations", "payments", "paymentEvents", "invoices", "groups", "venueRequests", "bookingRequests", "reports", "refundRequests",
  "mail", "whatsapp", "connections", "meetWishes", "avoids", "commissionLedger", "payouts", "invitations", "memberships", "carnets", "rateLimits",
];

export async function isDemoSite(): Promise<boolean> {
  const [show, pay] = await Promise.all([db.doc("settings/showcase").get(), db.doc("settings/payment").get()]);
  return show.get("trial") === true && pay.get("provider") === "sandbox" && pay.get("mode") === "test";
}

export type DemoResetResult = { deleted: Record<string, number>; sessionsReset: number; pastSessionsDeleted: number; guests: { email: string; booked: string[]; problem?: string }[]; crowd: CrowdResult };

async function wipeCollection(name: string): Promise<number> {
  const ref = db.collection(name);
  const n = (await ref.count().get()).data().count;
  if (n) await db.recursiveDelete(ref);
  return n;
}

async function deleteGroup(name: string, filter?: (d: FirebaseFirestore.QueryDocumentSnapshot) => boolean): Promise<number> {
  const snap = await db.collectionGroup(name).get();
  const docs = filter ? snap.docs.filter(filter) : snap.docs;
  const w = db.bulkWriter();
  for (const d of docs) void w.delete(d.ref);
  await w.close();
  return docs.length;
}

/** Remet une date à venir à zéro (aucun inscrit, aucune étape de lieux ou de tables faite). */
const SESSION_RESET: Record<string, unknown> = {
  seatsConfirmed: 0, seatsHeld: 0, waitlistCount: 0, status: "published",
  allocation: FieldValue.delete(), venueCapacity: FieldValue.delete(), groupsStatus: FieldValue.delete(), groupsNeedReview: FieldValue.delete(),
  groupsRevealedAt: FieldValue.delete(), alerts: FieldValue.delete(), risk: FieldValue.delete(), tierFallbackAt: FieldValue.delete(),
  tablesFinalAt: FieldValue.delete(), recapCheckAt: FieldValue.delete(), fixedRequestAt: FieldValue.delete(), fixedFinalAt: FieldValue.delete(),
  venueCallAlertAt: FieldValue.delete(), arrivalCheckAt: FieldValue.delete(), absencesAt: FieldValue.delete(), cancellation: FieldValue.delete(),
};

/** Inscrit un compte invité à plusieurs rendez-vous de la semaine (un par rendez-vous ou activité), paiement de test. */
async function bookGuest(email: string, now: Date): Promise<{ email: string; booked: string[]; problem?: string }> {
  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) return { email, booked: [], problem: "Aucun compte avec cette adresse : créez-le d'abord sur le site." };
  const profile = (await db.doc(`users/${user.uid}`).get()).data();
  if (profile?.onboardingCompleted !== true) return { email, booked: [], problem: "Profil pas encore complété : terminez l'inscription sur le site." };
  const sessions = (await db.collection("sessions").where("startAt", ">", Timestamp.fromDate(now)).where("startAt", "<", Timestamp.fromMillis(now.getTime() + 7 * 86_400_000)).get()).docs
    .filter((d) => ["published", "full"].includes(String(d.get("status"))))
    .sort((a, b) => (a.get("startAt") as Timestamp).toMillis() - (b.get("startAt") as Timestamp).toMillis());
  // Un seul créneau par rendez-vous (la gamme Premium si elle existe), une fois par activité ou événement.
  const byKey = new Map<string, { s: FirebaseFirestore.QueryDocumentSnapshot; e: DocumentData }>();
  for (const s of sessions) {
    const e = (await db.doc(`experiences/${s.get("experienceId")}`).get()).data() as DocumentData | undefined;
    if (!e || e.status !== "published") continue;
    if (e.audience === "women" && profile.gender !== "female") continue;
    const key = e.rendezvousId && e.rendezvousKind !== "rotation" ? `${e.rendezvousId}|${(s.get("startAt") as Timestamp).toMillis()}` : String(s.get("experienceId"));
    const cur = byKey.get(key);
    if (!cur || (e.venueTier === "premium" && cur.e.venueTier !== "premium")) byKey.set(key, { s, e });
  }
  const booked: string[] = [];
  for (const { s, e } of byKey.values()) {
    try {
      const questions = (Array.isArray(e.questionnaire) ? e.questionnaire : []) as { id: string; options: unknown[] }[];
      const res = (await reserveSeats({ uid: user.uid, emailVerified: true }, {
        sessionId: s.id, seats: 1, physicalTermsAccepted: true, tierFallback: true,
        ...(questions.length ? { answers: Object.fromEntries(questions.map((q) => [q.id, 0])) } : {}),
      })) as { reservationId: string; status: string };
      if (res.status === "pending_payment") await payTest(res.reservationId, user.uid);
      const rvTitle = e.rendezvousId && e.rendezvousKind !== "rotation" ? String((await db.doc(`rendezvous/${e.rendezvousId}`).get()).get("title.fr") ?? "") : "";
      const day = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Casablanca" }).format((s.get("startAt") as Timestamp).toDate());
      booked.push(`${rvTitle || String(e.title?.fr ?? "")}${e.venueTier ? ` ${String(e.venueTier).charAt(0).toUpperCase()}${String(e.venueTier).slice(1)}` : ""} (${day})`);
    } catch (err) {
      logger.warn("Invité de démonstration : réservation impossible", { email, sessionId: s.id, error: String((err as { details?: { reason?: string } }).details?.reason ?? err) });
    }
  }
  return { email, booked };
}

async function payTest(reservationId: string, uid: string) {
  const r = (await db.doc(`reservations/${reservationId}`).get()).data();
  if (!r || r.status !== "pending_payment") return;
  const payRef = db.collection("payments").doc();
  await payRef.set({ reservationId, userId: uid, type: "payment", provider: "sandbox", mode: "test", providerRef: null, amount: r.pricing.total, currency: r.pricing.currency, status: "initiated", processedEventIds: [], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await db.doc(`reservations/${reservationId}`).update({ paymentId: payRef.id });
  await applyPaymentEvent({ id: `${payRef.id}_succeeded`, provider: "sandbox", paymentId: payRef.id, status: "succeeded", amount: r.pricing.total, currency: r.pricing.currency });
}

export async function resetDemoCore(o: { people?: number; now?: Date } = {}): Promise<DemoResetResult> {
  const now = o.now ?? new Date();
  const deleted: Record<string, number> = {};
  for (const c of ACTIVITY) deleted[c] = await wipeCollection(c);
  deleted.notifications = await deleteGroup("notifications");
  // Avis laissés par les membres (les avis de démonstration livrés avec le site restent).
  const reviews = (await db.collection("reviews").get()).docs.filter((d) => d.get("isDemo") !== true);
  for (const d of reviews) await db.recursiveDelete(d.ref);
  deleted.reviews = reviews.length;
  // Dates passées : supprimées. Dates à venir : remises à zéro (inscrits, listes d'attente, lieux, tables).
  const all = (await db.collection("sessions").get()).docs;
  let past = 0;
  let reset = 0;
  for (const s of all) {
    if ((s.get("startAt") as Timestamp).toMillis() < now.getTime()) {
      await db.recursiveDelete(s.ref);
      past++;
      continue;
    }
    for (const sub of ["seatLocks", "waitlist", "private"]) await db.recursiveDelete(s.ref.collection(sub));
    if (s.get("status") === "cancelled") {
      await db.recursiveDelete(s.ref);
      continue;
    }
    await s.ref.update({ ...SESSION_RESET, updatedAt: FieldValue.serverTimestamp() });
    reset++;
  }
  // Lieux : fiabilité remise à zéro (aucune demande n'a encore été envoyée).
  for (const p of (await db.collection("partners").get()).docs) if (p.get("stats")) await p.ref.update({ stats: FieldValue.delete() });
  // Comptes : plus de gel ni de suspension liés aux anciennes réservations.
  for (const u of (await db.collection("users").where("bookingHold.active", "==", true).get()).docs) await u.ref.update({ bookingHold: FieldValue.delete() });
  // Le programme se recrée (rendez-vous et activité du samedi), puis les invités, puis la foule.
  const { ensureAllRendezvousSessions } = await import("../rendezvous/rendezvous");
  await ensureAllRendezvousSessions(now);
  const settings = (await db.doc("settings/demo").get()).data() ?? {};
  const emails = ((settings.guestEmails ?? []) as string[]).filter(Boolean);
  const guests = [];
  for (const email of emails) guests.push(await bookGuest(email, now));
  const crowd = await fillWeekWithDemoCrowd({ people: o.people ?? Number(settings.people ?? 300), days: 7, now });
  // Le déroulé des dates démarre tout de suite (demandes aux restaurants, etc.), sans attendre la tâche planifiée.
  const { runTablesAutomation } = await import("../tables/automation");
  await runTablesAutomation(now.getTime()).catch((err) => logger.error("Démo : déroulé des dates", { error: String(err) }));
  await db.doc("settings/demo").set({ lastResetAt: FieldValue.serverTimestamp(), lastResult: JSON.parse(JSON.stringify({ deleted, sessionsReset: reset, pastSessionsDeleted: past, guests, crowd: { users: crowd.users, reservations: crowd.reservations, sessions: crowd.sessions } })) }, { merge: true });
  return { deleted, sessionsReset: reset, pastSessionsDeleted: past, guests, crowd };
}

const resetInput = z.object({ confirm: z.literal("RÉINITIALISER") });

/** Bouton « Réinitialiser la démo » (super-admin, site de démonstration seulement). */
export const adminResetDemo = onCall({ region: REGION, timeoutSeconds: 540, memory: "1GiB" }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  if (!resetInput.safeParse(req.data).success) invalidArgument([{ path: ["confirm"], message: "required" }]);
  if (!(await isDemoSite())) throw new HttpsError("failed-precondition", "Réservé au site de démonstration.", { reason: "not_demo" });
  const r = await resetDemoCore();
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "demo.reset", targetType: "settings", targetId: "demo", after: { reservations: r.crowd.reservations, guests: r.guests.map((g) => `${g.email}:${g.booked.length}`).join(" ") } });
  return { ok: true, sessionsReset: r.sessionsReset, pastSessionsDeleted: r.pastSessionsDeleted, reservations: r.crowd.reservations, guests: r.guests };
});

const guestsInput = z.object({ guestEmails: z.array(z.string().trim().toLowerCase().email()).max(10) });

/** Comptes à inscrire à plusieurs rendez-vous à chaque remise à zéro (super-admin, démonstration seulement). */
export const adminSaveDemoGuests = onCall({ region: REGION }, async (req) => {
  requireRole(req, ["superadmin"]);
  const v = guestsInput.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  if (!(await isDemoSite())) throw new HttpsError("failed-precondition", "Réservé au site de démonstration.", { reason: "not_demo" });
  await db.doc("settings/demo").set({ guestEmails: [...new Set(v.data.guestEmails)], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});
