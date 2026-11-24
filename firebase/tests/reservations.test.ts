/**
 * Réservations et paiement de test (phase 4a), contre les émulateurs Auth + Firestore + Functions.
 * Chaque utilisateur est un vrai client (SDK web) qui appelle les callables comme le navigateur.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { getStorage as adminStorage } from "firebase-admin/storage";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reserveSeats } from "../../functions/src/reservations/create-reservation";
import { expireDueHolds } from "../../functions/src/reservations/expire-holds";
import { purgeExpiredPreferences } from "../../functions/src/maintenance/purge-preferences";
import { sendTransferReminders } from "../../functions/src/payments/transfer-reminders";
import { expiredBackupFolders } from "../../functions/src/maintenance/backup";
import { runHealthCheck, uninsuredPhysicalExperiences } from "../../functions/src/maintenance/health";
import { sendDueReminders } from "../../functions/src/notify/reminders";
import { runSessionAutomation } from "../../functions/src/tables/automation";
import { processPendingRequests } from "../../functions/src/tables/allocation";
import { checkInSelf } from "../../functions/src/reservations/self-check-in";
import { markAbsences } from "../../functions/src/membership/absences";
import { resetShowcaseCore } from "../../functions/src/experiences/showcase";
import { ORGANIZER_TERMS_VERSION, DEFAULT_EVENT_TEMPLATES, DEFAULT_HOME_SETTINGS, QUESTIONNAIRE_TEMPLATES, tablesTimeline, zonedParts } from "@thecommunity/shared";

const PROJECT = "demo-thecommunity";
const PASSWORD = "MotDePasse!123";
let admin: App;
const clients: FirebaseApp[] = [];
const db = () => adminDb(admin);
const run = Date.now().toString(36);
let seq = 0;

type Client = { uid: string; call: (name: string, data: unknown) => Promise<Record<string, unknown>> };

/** Crée un compte (e-mail vérifié, profil complété par défaut) et un client connecté. */
async function member(opts: { verified?: boolean; onboarded?: boolean; role?: "admin" | "superadmin" } = {}): Promise<Client> {
  const n = ++seq; // capturé AVANT les await : chaque client a son propre nom d'application
  const email = `membre.${run}.${n}@example.com`;
  const user = await adminAuth(admin).createUser({ email, password: PASSWORD, emailVerified: opts.verified ?? true });
  await db().doc(`users/${user.uid}`).set({ status: "active", onboardingCompleted: opts.onboarded ?? true, role: opts.role ?? "user", firstName: "Membre" }, { merge: true });
  if (opts.role) await adminAuth(admin).setCustomUserClaims(user.uid, { role: opts.role });
  const app = initializeApp({ projectId: PROJECT, apiKey: "demo-key", authDomain: `${PROJECT}.firebaseapp.com` }, `client-${run}-${n}`);
  clients.push(app);
  connectAuthEmulator(getAuth(app), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, port] = (process.env.FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001").split(":");
  const fns = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(fns, host!, Number(port));
  await signInWithEmailAndPassword(getAuth(app), email, PASSWORD);
  return { uid: user.uid, call: async (name, data) => (await httpsCallable(fns, name)(data)).data as Record<string, unknown> };
}

/** Code et raison d'une erreur de callable (ou "ok"). */
async function refusal(p: Promise<unknown>) {
  try {
    await p;
    return "ok";
  } catch (e) {
    const err = e as { code?: string; details?: { reason?: string } };
    return `${String(err.code ?? "").replace("functions/", "")}:${err.details?.reason ?? ""}`;
  }
}

async function makeSession(opts: { capacity?: number; price?: number; startInHours?: number; mode?: string; maxSeats?: number; onRequest?: boolean; messageRequired?: boolean; instagramRequired?: boolean; membersOnly?: boolean; memberPrice?: number; createdHoursAgo?: number; extra?: Record<string, unknown> } = {}) {
  const expRef = db().collection("experiences").doc();
  await expRef.set({
    slug: `test-${expRef.id}`,
    title: { fr: "Atelier test" },
    status: "published",
    bookingMode: opts.mode ?? "individual",
    maxSeatsPerBooking: opts.maxSeats ?? 2,
    district: "Gauthier",
    venue: { name: "Studio Test", address: "12 rue Test, Casablanca", revealPolicy: "immediate" },
    images: [],
    cancellationPolicyId: "standard-48h",
    admission: opts.onRequest ? "on_request" : "direct",
    requestMessageRequired: opts.messageRequired ?? false,
    requestInstagramRequired: opts.instagramRequired ?? false,
    membersOnly: opts.membersOnly ?? false,
    memberPrice: opts.memberPrice !== undefined ? { amount: opts.memberPrice, currency: "MAD" } : null,
    ...(opts.extra ?? {}),
  });
  const start = Date.now() + (opts.startInHours ?? 72) * 3_600_000;
  const sessRef = db().collection("sessions").doc();
  await sessRef.set({
    experienceId: expRef.id,
    experienceSnapshot: { title: { fr: "Atelier test" }, slug: `test-${expRef.id}`, coverImagePath: "", categoryId: "create", bookingMode: opts.mode ?? "individual", district: "Gauthier" },
    cityId: "casablanca",
    categoryId: "create",
    startAt: Timestamp.fromMillis(start),
    endAt: Timestamp.fromMillis(start + 7_200_000),
    price: { amount: opts.price ?? 30000, currency: "MAD" },
    capacity: opts.capacity ?? 12,
    seatsConfirmed: 0,
    seatsHeld: 0,
    waitlistCount: 0,
    status: "published",
    ...(opts.createdHoursAgo !== undefined ? { createdAt: Timestamp.fromMillis(Date.now() - opts.createdHoursAgo * 3_600_000) } : {}),
  });
  return sessRef.id;
}

const session = async (id: string) => (await db().doc(`sessions/${id}`).get()).data()!;
const reservation = async (id: string) => (await db().doc(`reservations/${id}`).get()).data()!;
const payment = async (id: string) => (await db().doc(`payments/${id}`).get()).data()!;
/** Simule la fin du délai de 15 minutes. */
const expireHold = (id: string) => db().doc(`reservations/${id}`).update({ holdExpiresAt: Timestamp.fromMillis(Date.now() - 1000) });

beforeAll(async () => {
  admin = initAdmin({ projectId: PROJECT }, `admin-reservations-${run}`);
  await db().doc("cities/casablanca").set({ isActive: true }, { merge: true });
  await db().doc("settings/payment").set({ provider: "sandbox", mode: "test" });
});
afterAll(async () => {
  await Promise.all(clients.map((c) => deleteClient(c)));
  await deleteApp(admin);
});

describe("conditions pour réserver", () => {
  it("e-mail non confirmé : refusé", async () => {
    const sid = await makeSession();
    const u = await member({ verified: false });
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:email_not_verified");
  });
  it("profil incomplet : refusé", async () => {
    const sid = await makeSession();
    const u = await member({ onboarded: false });
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:profile_incomplete");
  });
  it("réservations fermées, trop de places, date inconnue, données invalides", async () => {
    const u = await member();
    const soon = await makeSession({ startInHours: 1 });
    expect(await refusal(u.call("createReservation", { sessionId: soon, seats: 1 }))).toBe("failed-precondition:closed");
    const sid = await makeSession({ maxSeats: 2 });
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 3 }))).toBe("failed-precondition:too_many_seats");
    expect(await refusal(u.call("createReservation", { sessionId: "inconnue", seats: 1 }))).toBe("not-found:not_found");
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 0 }))).toBe("invalid-argument:");
  });
});

describe("parcours complet avec l'adaptateur de test", () => {
  let sid = "";
  let u: Client;
  let reservationId = "";
  it("bloque les places pendant 15 minutes, au prix calculé par le serveur", async () => {
    sid = await makeSession();
    u = await member();
    const res = await u.call("createReservation", { sessionId: sid, seats: 2, price: 1 });
    expect(res).toMatchObject({ status: "pending_payment", resumed: false, total: 60000 });
    reservationId = res.reservationId as string;
    const r = await reservation(reservationId);
    expect(r).toMatchObject({ userId: u.uid, seats: 2, status: "pending_payment", pricing: { unitAmount: 30000, total: 60000, currency: "MAD" } });
    const holdMinutes = ((r.holdExpiresAt as Timestamp).toMillis() - Date.now()) / 60_000;
    expect(holdMinutes).toBeGreaterThan(14);
    expect(holdMinutes).toBeLessThanOrEqual(15);
    expect(await session(sid)).toMatchObject({ seatsHeld: 2, seatsConfirmed: 0 });
    expect(r.venue).toBeUndefined();
  });
  it("un second clic reprend la même réservation (pas de doublon)", async () => {
    const res = await u.call("createReservation", { sessionId: sid, seats: 2 });
    expect(res).toMatchObject({ reservationId, resumed: true });
    expect(await session(sid)).toMatchObject({ seatsHeld: 2 });
  });
  it("un paiement refusé laisse la réservation en attente ; un nouvel essai réussi la confirme", async () => {
    const first = await u.call("startCheckout", { reservationId });
    expect(first.redirectUrl).toBe(`/paiement-test/${first.paymentId}`);
    expect(await payment(first.paymentId as string)).toMatchObject({ status: "initiated", amount: 60000, userId: u.uid, provider: "sandbox" });

    const other = await member();
    expect(await refusal(other.call("sandboxCompletePayment", { paymentId: first.paymentId, outcome: "succeeded" }))).toBe("not-found:not_found");

    expect(await u.call("sandboxCompletePayment", { paymentId: first.paymentId, outcome: "failed" })).toMatchObject({ outcome: "failed" });
    expect((await reservation(reservationId)).status).toBe("pending_payment");
    expect(await refusal(u.call("sandboxCompletePayment", { paymentId: first.paymentId, outcome: "succeeded" }))).toBe("failed-precondition:already_processed");

    const second = await u.call("startCheckout", { reservationId });
    expect(await u.call("sandboxCompletePayment", { paymentId: second.paymentId, outcome: "succeeded" })).toMatchObject({ outcome: "confirmed", reservationId });
    const r = await reservation(reservationId);
    expect(r).toMatchObject({ status: "confirmed", paymentId: second.paymentId, venue: { name: "Studio Test", address: "12 rue Test, Casablanca" } });
    expect(r.paidAt).toBeDefined();
    expect(await session(sid)).toMatchObject({ seatsHeld: 0, seatsConfirmed: 2 });
    expect((await payment(second.paymentId as string)).status).toBe("succeeded");
  });
  it("une deuxième réservation sur la même date est refusée ; plus rien à payer", async () => {
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:already_booked");
    expect(await refusal(u.call("startCheckout", { reservationId }))).toBe("failed-precondition:already_paid");
  });
  it("personne d'autre ne peut payer ou voir cette réservation", async () => {
    const other = await member();
    expect(await refusal(other.call("startCheckout", { reservationId }))).toBe("not-found:not_found");
  });
});

describe("expiration et paiement tardif", () => {
  it("le blocage expiré libère les places et rouvre une date complète", async () => {
    const sid = await makeSession({ capacity: 1 });
    const u = await member();
    const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
    expect((await session(sid)).status).toBe("full");
    await expireHold(reservationId as string);
    expect(await refusal(u.call("startCheckout", { reservationId }))).toBe("failed-precondition:hold_expired");
    expect(await expireDueHolds()).toBeGreaterThanOrEqual(1);
    expect((await reservation(reservationId as string)).status).toBe("expired");
    expect(await session(sid)).toMatchObject({ seatsHeld: 0, status: "published" });
    expect((await db().doc(`sessions/${sid}/seatLocks/${u.uid}`).get()).exists).toBe(false);
    // La personne peut réserver à nouveau.
    expect(await u.call("createReservation", { sessionId: sid, seats: 1 })).toMatchObject({ status: "pending_payment", resumed: false });
  });

  it("paiement arrivé après l'expiration : la place est reprise s'il en reste", async () => {
    const sid = await makeSession({ capacity: 3 });
    const u = await member();
    const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
    const { paymentId } = await u.call("startCheckout", { reservationId });
    await expireHold(reservationId as string);
    await expireDueHolds();
    expect((await reservation(reservationId as string)).status).toBe("expired");
    expect(await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" })).toMatchObject({ outcome: "confirmed" });
    expect(await reservation(reservationId as string)).toMatchObject({ status: "confirmed", latePayment: true });
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 1, seatsHeld: 0 });
  });

  it("paiement arrivé après l'expiration sans place restante : remboursement automatique", async () => {
    const sid = await makeSession({ capacity: 1 });
    const late = await member();
    const { reservationId } = await late.call("createReservation", { sessionId: sid, seats: 1 });
    const { paymentId } = await late.call("startCheckout", { reservationId });
    await expireHold(reservationId as string);
    await expireDueHolds();
    // Quelqu'un d'autre prend la dernière place et paie.
    const fast = await member();
    const other = await fast.call("createReservation", { sessionId: sid, seats: 1 });
    const otherPay = await fast.call("startCheckout", { reservationId: other.reservationId });
    await fast.call("sandboxCompletePayment", { paymentId: otherPay.paymentId, outcome: "succeeded" });

    expect(await late.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" })).toMatchObject({ outcome: "refunded" });
    const r = await reservation(reservationId as string);
    expect(r).toMatchObject({ status: "refunded", cancellation: { by: "system", reason: "late_payment_no_seat", refundAmount: 30000 } });
    expect((await payment(paymentId as string)).status).toBe("refunded");
    const refunds = await db().collection("payments").where("parentPaymentId", "==", paymentId).get();
    expect(refunds.docs.map((d) => d.data())).toMatchObject([{ type: "refund", amount: 30000, status: "succeeded" }]);
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 1, seatsHeld: 0, status: "full" });
  });
});

describe("cas particuliers", () => {
  it("une date gratuite est confirmée immédiatement, sans paiement", async () => {
    const sid = await makeSession({ price: 0 });
    const u = await member();
    const res = await u.call("createReservation", { sessionId: sid, seats: 1 });
    expect(res).toMatchObject({ status: "confirmed", total: 0 });
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 1, seatsHeld: 0 });
    expect((await reservation(res.reservationId as string)).venue).toMatchObject({ name: "Studio Test" });
  });
  it("sans réglage de paiement, ou avec l'adaptateur de test en mode réel, le paiement est désactivé", async () => {
    const sid = await makeSession();
    const u = await member();
    const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
    await db().doc("settings/payment").delete();
    expect(await refusal(u.call("startCheckout", { reservationId }))).toBe("failed-precondition:payments_unavailable");
    await db().doc("settings/payment").set({ provider: "sandbox", mode: "live" });
    expect(await refusal(u.call("startCheckout", { reservationId }))).toBe("failed-precondition:payments_unavailable");
    await db().doc("settings/payment").set({ provider: "sandbox", mode: "test" });
    expect(await u.call("startCheckout", { reservationId })).toHaveProperty("paymentId");
  });
});

describe("concurrence", () => {
  /** Membre prêt à réserver, sans client navigateur (pour lancer la transaction directement). */
  async function readyUid() {
    const user = await adminAuth(admin).createUser({ email: `foule.${run}.${++seq}@example.com`, emailVerified: true });
    await db().doc(`users/${user.uid}`).set({ status: "active", onboardingCompleted: true, role: "user" }, { merge: true });
    return user.uid;
  }

  it("50 réservations simultanées pour 12 places : exactement 12 réussissent", async () => {
    // La transaction de réservation elle-même, lancée 50 fois en parallèle contre l'émulateur Firestore.
    const sid = await makeSession({ capacity: 12, maxSeats: 1 });
    const uids = await Promise.all(Array.from({ length: 50 }, () => readyUid()));
    const results = await Promise.all(uids.map((uid) => refusal(reserveSeats({ uid, emailVerified: true }, { sessionId: sid, seats: 1 }))));
    expect(results.filter((r) => r === "ok")).toHaveLength(12);
    expect(results.filter((r) => r !== "ok").every((r) => r === "failed-precondition:full")).toBe(true);
    expect(await session(sid)).toMatchObject({ seatsHeld: 12, seatsConfirmed: 0, status: "full" });
    const held = await db().collection("reservations").where("sessionId", "==", sid).where("status", "==", "pending_payment").get();
    expect(held.size).toBe(12);
    expect((await db().collection(`sessions/${sid}/seatLocks`).get()).size).toBe(12);
  }, 120_000);

  it("par les vraies callables : 10 personnes en même temps pour 4 places", async () => {
    const sid = await makeSession({ capacity: 4, maxSeats: 1 });
    const users = await Promise.all(Array.from({ length: 10 }, () => member()));
    const results = await Promise.all(users.map((u) => refusal(u.call("createReservation", { sessionId: sid, seats: 1 }))));
    expect(results.filter((r) => r === "ok")).toHaveLength(4);
    expect(results.filter((r) => r !== "ok").every((r) => r === "failed-precondition:full")).toBe(true);
    expect(await session(sid)).toMatchObject({ seatsHeld: 4, status: "full" });
  }, 120_000);

  it("la même personne qui clique 5 fois en même temps n'obtient qu'une réservation", async () => {
    const sid = await makeSession({ capacity: 10, maxSeats: 1 });
    const uid = await readyUid();
    const results = await Promise.all(Array.from({ length: 5 }, () => reserveSeats({ uid, emailVerified: true }, { sessionId: sid, seats: 1 })));
    expect(new Set(results.map((r) => r.reservationId)).size).toBe(1);
    expect(await session(sid)).toMatchObject({ seatsHeld: 1 });
  }, 60_000);
});

describe("demandes de participation (expériences sur demande)", () => {
  let adminClient: Client;
  beforeAll(async () => {
    adminClient = await member({ role: "admin" });
  });

  it("une expérience sur demande ne se réserve pas directement ; une expérience directe ne prend pas de demande", async () => {
    const onRequest = await makeSession({ onRequest: true });
    const direct = await makeSession();
    const u = await member();
    expect(await refusal(u.call("createReservation", { sessionId: onRequest, seats: 1 }))).toBe("failed-precondition:approval_required");
    expect(await refusal(u.call("requestBooking", { sessionId: direct, seats: 1 }))).toBe("failed-precondition:direct_booking");
  });

  it("message obligatoire si l'équipe l'a demandé ; Instagram vérifié et normalisé", async () => {
    const sid = await makeSession({ onRequest: true, messageRequired: true });
    const u = await member();
    expect(await refusal(u.call("requestBooking", { sessionId: sid, seats: 1 }))).toBe("invalid-argument:");
    expect(await refusal(u.call("requestBooking", { sessionId: sid, seats: 1, message: "Bonjour", instagram: "pas valide !" }))).toBe("invalid-argument:");
    const res = await u.call("requestBooking", { sessionId: sid, seats: 1, message: "J'adore les dîners", instagram: "https://instagram.com/Rita.B" });
    expect(res).toMatchObject({ status: "pending" });
    const r = (await db().doc(`bookingRequests/${res.requestId}`).get()).data()!;
    expect(r).toMatchObject({ userId: u.uid, status: "pending", message: "J'adore les dîners", instagram: "rita.b", seats: 1 });
    // Aucune place bloquée tant que l'équipe n'a pas accepté.
    expect(await session(sid)).toMatchObject({ seatsHeld: 0, seatsConfirmed: 0 });
    expect(await refusal(u.call("requestBooking", { sessionId: sid, seats: 1, message: "Encore" }))).toBe("failed-precondition:already_requested");
  });

  it("Instagram obligatoire si l'équipe l'a demandé (11h)", async () => {
    const sid = await makeSession({ onRequest: true, instagramRequired: true });
    const u = await member();
    expect(await refusal(u.call("requestBooking", { sessionId: sid, seats: 1, message: "Bonjour" }))).toBe("invalid-argument:");
    expect(await u.call("requestBooking", { sessionId: sid, seats: 1, message: "", instagram: "@nadia.casa" })).toMatchObject({ status: "pending" });
  });

  it("acceptée : place bloquée 24 h, paiement, confirmation, notification et journal", async () => {
    const sid = await makeSession({ onRequest: true });
    const u = await member();
    const { requestId } = await u.call("requestBooking", { sessionId: sid, seats: 1, message: "" });
    expect(await refusal(u.call("adminDecideRequest", { requestId, decision: "accept" }))).toBe("permission-denied:");
    const { reservationId } = await adminClient.call("adminDecideRequest", { requestId, decision: "accept" });
    const req = (await db().doc(`bookingRequests/${requestId}`).get()).data()!;
    expect(req).toMatchObject({ status: "accepted", reservationId, decidedBy: adminClient.uid });
    const r = await reservation(reservationId as string);
    expect(r).toMatchObject({ status: "pending_payment", userId: u.uid, requestId });
    const hours = ((r.holdExpiresAt as Timestamp).toMillis() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
    expect(await session(sid)).toMatchObject({ seatsHeld: 1 });
    expect(await refusal(adminClient.call("adminDecideRequest", { requestId, decision: "decline" }))).toBe("failed-precondition:request_not_pending");

    const { paymentId } = await u.call("startCheckout", { reservationId });
    await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" });
    expect((await reservation(reservationId as string)).status).toBe("confirmed");

    const notes = await db().collection(`users/${u.uid}/notifications`).get();
    expect(notes.docs.map((d) => d.data())).toMatchObject([{ type: "request_accepted", link: `/espace/reservations/${reservationId}` }]);
    const logs = await db().collection("auditLogs").where("targetId", "==", requestId).get();
    expect(logs.docs.map((d) => d.data().action)).toEqual(["request.accept"]);
  });

  it("refusée : aucune place prise, la personne est prévenue et ne peut pas redemander cette date", async () => {
    const sid = await makeSession({ onRequest: true });
    const u = await member();
    const { requestId } = await u.call("requestBooking", { sessionId: sid, seats: 1, message: "" });
    await adminClient.call("adminDecideRequest", { requestId, decision: "decline" });
    expect((await db().doc(`bookingRequests/${requestId}`).get()).data()).toMatchObject({ status: "declined" });
    expect(await session(sid)).toMatchObject({ seatsHeld: 0, seatsConfirmed: 0 });
    const notes = await db().collection(`users/${u.uid}/notifications`).get();
    expect(notes.docs.map((d) => d.data().type)).toEqual(["request_declined"]);
    expect(await refusal(u.call("requestBooking", { sessionId: sid, seats: 1, message: "" }))).toBe("failed-precondition:request_declined");
  });

  it("accepter plus de personnes que de places est impossible", async () => {
    const sid = await makeSession({ onRequest: true, capacity: 1 });
    const a = await member();
    const b = await member();
    const ra = await a.call("requestBooking", { sessionId: sid, seats: 1, message: "" });
    const rb = await b.call("requestBooking", { sessionId: sid, seats: 1, message: "" });
    await adminClient.call("adminDecideRequest", { requestId: ra.requestId, decision: "accept" });
    expect(await refusal(adminClient.call("adminDecideRequest", { requestId: rb.requestId, decision: "accept" }))).toBe("failed-precondition:full");
    expect((await db().doc(`bookingRequests/${rb.requestId}`).get()).data()!.status).toBe("pending");
  });

  it("la personne peut retirer sa demande tant qu'elle n'est pas traitée ; personne d'autre ne le peut", async () => {
    const sid = await makeSession({ onRequest: true });
    const u = await member();
    const other = await member();
    const { requestId } = await u.call("requestBooking", { sessionId: sid, seats: 1, message: "" });
    expect(await refusal(other.call("cancelBookingRequest", { requestId }))).toBe("not-found:not_found");
    expect(await u.call("cancelBookingRequest", { requestId })).toEqual({ ok: true });
    expect(await refusal(adminClient.call("adminDecideRequest", { requestId, decision: "accept" }))).toBe("failed-precondition:request_not_pending");
    // Elle peut redemander ensuite.
    expect(await u.call("requestBooking", { sessionId: sid, seats: 1, message: "" })).toMatchObject({ status: "pending" });
  });
});

/** Réservation payée (adaptateur de test). */
async function paidReservation(u: Client, sessionId: string, seats = 1) {
  const { reservationId } = await u.call("createReservation", { sessionId, seats });
  const { paymentId } = await u.call("startCheckout", { reservationId });
  await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" });
  return { reservationId: reservationId as string, paymentId: paymentId as string };
}

describe("annulation par le membre", () => {
  it("plus de 48 h avant : remboursement intégral, place libérée", async () => {
    const sid = await makeSession({ capacity: 3, startInHours: 72 });
    const u = await member();
    const { reservationId, paymentId } = await paidReservation(u, sid, 2);
    expect(await u.call("cancelReservation", { reservationId })).toEqual({ ok: true, refundAmount: 60000, refundStatus: "succeeded" });
    const r = await reservation(reservationId);
    expect(r).toMatchObject({ status: "refunded", cancellation: { by: "user", refundAmount: 60000, refundStatus: "succeeded" } });
    expect((await payment(paymentId)).status).toBe("refunded");
    const refunds = await db().collection("payments").where("parentPaymentId", "==", paymentId).get();
    expect(refunds.docs.map((d) => d.data())).toMatchObject([{ type: "refund", amount: 60000, reason: "member_cancellation", status: "succeeded" }]);
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 0, seatsHeld: 0, status: "published" });
    expect((await db().doc(`sessions/${sid}/seatLocks/${u.uid}`).get()).exists).toBe(false);
    // Elle peut réserver à nouveau ; on ne peut pas annuler deux fois.
    expect(await refusal(u.call("cancelReservation", { reservationId }))).toBe("failed-precondition:not_cancellable");
    expect(await u.call("createReservation", { sessionId: sid, seats: 1 })).toMatchObject({ status: "pending_payment" });
  });

  it("moins de 48 h avant : annulation possible, sans remboursement", async () => {
    const sid = await makeSession({ startInHours: 30 });
    const u = await member();
    const { reservationId, paymentId } = await paidReservation(u, sid);
    expect(await u.call("cancelReservation", { reservationId })).toEqual({ ok: true, refundAmount: 0, refundStatus: "none" });
    expect(await reservation(reservationId)).toMatchObject({ status: "cancelled", cancellation: { refundAmount: 0 } });
    expect((await payment(paymentId)).status).toBe("succeeded");
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 0 });
  });

  it("abandon d'une réservation pas encore payée : places rendues, rien à rembourser", async () => {
    const sid = await makeSession({ capacity: 1 });
    const u = await member();
    const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
    expect((await session(sid)).status).toBe("full");
    expect(await u.call("cancelReservation", { reservationId })).toMatchObject({ refundAmount: 0 });
    expect(await session(sid)).toMatchObject({ seatsHeld: 0, status: "published" });
  });

  it("personne d'autre ne peut annuler ; impossible une fois l'expérience commencée", async () => {
    const sid = await makeSession();
    const u = await member();
    const other = await member();
    const { reservationId } = await paidReservation(u, sid);
    expect(await refusal(other.call("cancelReservation", { reservationId }))).toBe("not-found:not_found");
    await db().doc(`sessions/${sid}`).update({ startAt: Timestamp.fromMillis(Date.now() - 60_000) });
    expect(await refusal(u.call("cancelReservation", { reservationId }))).toBe("failed-precondition:already_started");
  });
});

describe("liste d'attente", () => {
  const entry = async (sid: string, uid: string) => (await db().doc(`sessions/${sid}/waitlist/${uid}`).get()).data();

  it("on ne s'inscrit que si la date est complète ; une seule fois", async () => {
    const sid = await makeSession({ capacity: 1 });
    const a = await member();
    const b = await member();
    expect(await refusal(b.call("joinWaitlist", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:seats_available");
    await paidReservation(a, sid);
    expect(await refusal(a.call("joinWaitlist", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:already_booked");
    expect(await b.call("joinWaitlist", { sessionId: sid, seats: 1 })).toEqual({ status: "waiting" });
    expect(await refusal(b.call("joinWaitlist", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:already_waiting");
    expect(await session(sid)).toMatchObject({ waitlistCount: 1 });
    expect(await entry(sid, b.uid)).toMatchObject({ userId: b.uid, status: "waiting", seats: 1 });
    expect(await b.call("leaveWaitlist", { sessionId: sid })).toEqual({ ok: true });
    expect(await session(sid)).toMatchObject({ waitlistCount: 0 });
    expect(await refusal(b.call("leaveWaitlist", { sessionId: sid }))).toBe("failed-precondition:not_waiting");
  });

  it("une annulation propose aussitôt la place à la première personne en attente (4 h pour payer)", async () => {
    const sid = await makeSession({ capacity: 1, startInHours: 72 });
    const holder = await member();
    const first = await member();
    const second = await member();
    const walkIn = await member();
    const { reservationId } = await paidReservation(holder, sid);
    await first.call("joinWaitlist", { sessionId: sid, seats: 1 });
    await second.call("joinWaitlist", { sessionId: sid, seats: 1 });

    await holder.call("cancelReservation", { reservationId });
    const offer = await entry(sid, first.uid);
    expect(offer).toMatchObject({ status: "offered" });
    const offered = await reservation(offer!.reservationId);
    expect(offered).toMatchObject({ userId: first.uid, status: "pending_payment", fromWaitlist: true });
    const hours = ((offered.holdExpiresAt as Timestamp).toMillis() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(3.9);
    expect(hours).toBeLessThanOrEqual(4);
    expect(await session(sid)).toMatchObject({ seatsHeld: 1, seatsConfirmed: 0, waitlistCount: 1, status: "full" });
    expect((await entry(sid, second.uid))!.status).toBe("waiting");
    const notes = await db().collection(`users/${first.uid}/notifications`).get();
    expect(notes.docs.map((d) => d.data())).toMatchObject([{ type: "waitlist_offer", link: `/espace/reservations/${offer!.reservationId}` }]);
    // La place est réservée à la personne en attente : impossible de la prendre en passant.
    expect(await refusal(walkIn.call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:full");

    // Offre non payée à temps → la place passe à la suivante.
    await expireHold(offer!.reservationId);
    await expireDueHolds();
    expect((await entry(sid, first.uid))!.status).toBe("expired");
    const next = await entry(sid, second.uid);
    expect(next).toMatchObject({ status: "offered" });
    expect(await session(sid)).toMatchObject({ seatsHeld: 1, waitlistCount: 0, status: "full" });

    // La seconde paie : confirmée.
    const { paymentId } = await second.call("startCheckout", { reservationId: next!.reservationId });
    await second.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" });
    expect((await reservation(next!.reservationId)).status).toBe("confirmed");
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 1, seatsHeld: 0 });
  });

  it("une demande trop grande pour les places libérées est sautée, pas perdue", async () => {
    const sid = await makeSession({ capacity: 2, maxSeats: 2 });
    const holder = await member();
    const holder2 = await member();
    const big = await member();
    const small = await member();
    const r1 = await paidReservation(holder, sid);
    await paidReservation(holder2, sid);
    await big.call("joinWaitlist", { sessionId: sid, seats: 2 });
    await small.call("joinWaitlist", { sessionId: sid, seats: 1 });
    await holder.call("cancelReservation", { reservationId: r1.reservationId });
    expect((await entry(sid, big.uid))!.status).toBe("waiting");
    expect((await entry(sid, small.uid))!.status).toBe("offered");
  });

  it("une place libérée par un blocage expiré va aussi à la liste d'attente", async () => {
    const sid = await makeSession({ capacity: 1 });
    const slow = await member();
    const waiting = await member();
    const { reservationId } = await slow.call("createReservation", { sessionId: sid, seats: 1 });
    await waiting.call("joinWaitlist", { sessionId: sid, seats: 1 });
    await expireHold(reservationId as string);
    await expireDueHolds();
    expect((await entry(sid, waiting.uid))!.status).toBe("offered");
  });
});

describe("back-office : réservations", () => {
  let team: Client;
  beforeAll(async () => {
    team = await member({ role: "admin" });
  });
  const logs = async (targetId: string) => (await db().collection("auditLogs").where("targetId", "==", targetId).get()).docs.map((d) => d.data());

  it("l'équipe annule : remboursement intégral même à moins de 48 h, motif, notification, journal", async () => {
    const sid = await makeSession({ startInHours: 20 });
    const u = await member();
    const { reservationId, paymentId } = await paidReservation(u, sid);
    expect(await refusal(u.call("adminCancelReservation", { reservationId, reason: "test" }))).toBe("permission-denied:");
    expect(await refusal(team.call("adminCancelReservation", { reservationId, reason: "" }))).toBe("invalid-argument:");
    expect(await team.call("adminCancelReservation", { reservationId, reason: "Partenaire fermé" })).toEqual({ ok: true, refundAmount: 30000, refundStatus: "succeeded" });
    expect(await reservation(reservationId)).toMatchObject({ status: "refunded", cancellation: { by: "admin", actorUid: team.uid, reason: "Partenaire fermé", refundAmount: 30000 } });
    expect((await payment(paymentId)).status).toBe("refunded");
    const notes = await db().collection(`users/${u.uid}/notifications`).get();
    expect(notes.docs.map((d) => d.data().type)).toContain("event_cancelled");
    expect((await logs(reservationId)).map((l) => l.action)).toEqual(["reservation.cancel"]);
  });

  it("l'équipe peut aussi annuler selon la politique, ou sans remboursement", async () => {
    const sid = await makeSession({ startInHours: 20 });
    const a = await member();
    const b = await member();
    const ra = await paidReservation(a, sid);
    const rb = await paidReservation(b, sid);
    expect(await team.call("adminCancelReservation", { reservationId: ra.reservationId, refund: "policy", reason: "Demande du membre" })).toMatchObject({ refundAmount: 0 });
    expect(await team.call("adminCancelReservation", { reservationId: rb.reservationId, refund: "none", reason: "Non-respect de la charte" })).toMatchObject({ refundAmount: 0 });
    expect((await reservation(rb.reservationId)).status).toBe("cancelled");
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 0 });
  });

  it("annuler une date : tout le monde remboursé et prévenu, liste d'attente close, plus de réservation possible", async () => {
    const sid = await makeSession({ capacity: 2 });
    const a = await member();
    const b = await member();
    const w = await member();
    const late = await member();
    await paidReservation(a, sid);
    const { reservationId: pendingId } = await b.call("createReservation", { sessionId: sid, seats: 1 });
    await w.call("joinWaitlist", { sessionId: sid, seats: 1 });
    expect(await team.call("adminCancelSession", { sessionId: sid, reason: "Météo" })).toMatchObject({ ok: true, cancelled: 2, refunded: 30000, failures: [] });
    expect(await session(sid)).toMatchObject({ status: "cancelled", seatsConfirmed: 0, seatsHeld: 0, waitlistCount: 0 });
    expect((await reservation(pendingId as string)).status).toBe("cancelled");
    expect((await db().doc(`sessions/${sid}/waitlist/${w.uid}`).get()).data()!.status).toBe("left");
    // Personne ne s'est vu proposer de place sur une date annulée.
    expect((await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", w.uid).get()).size).toBe(0);
    expect(await refusal(late.call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:not_open");
    expect(await refusal(team.call("adminCancelSession", { sessionId: sid, reason: "Météo" }))).toBe("failed-precondition:already_cancelled");
    expect((await logs(sid)).map((l) => l.action)).toEqual(["session.cancel"]);
  });

  it("déplacer vers une autre date de la même expérience : places transférées, ancienne place proposée à la liste d'attente", async () => {
    const from = await makeSession({ capacity: 1 });
    const fromData = await session(from);
    const toRef = db().collection("sessions").doc();
    await toRef.set({ ...fromData, startAt: Timestamp.fromMillis(Date.now() + 96 * 3_600_000), endAt: Timestamp.fromMillis(Date.now() + 98 * 3_600_000), capacity: 2, seatsConfirmed: 0, seatsHeld: 0, waitlistCount: 0, status: "published" });
    const other = await makeSession();
    const u = await member();
    const w = await member();
    const { reservationId } = await paidReservation(u, from);
    await w.call("joinWaitlist", { sessionId: from, seats: 1 });

    expect(await refusal(team.call("adminMoveReservation", { reservationId, targetSessionId: other }))).toBe("failed-precondition:different_experience");
    expect(await team.call("adminMoveReservation", { reservationId, targetSessionId: toRef.id })).toEqual({ ok: true });
    const r = await reservation(reservationId);
    expect(r).toMatchObject({ sessionId: toRef.id, status: "confirmed" });
    expect((r.sessionSnapshot.startAt as Timestamp).toMillis()).toBe(((await session(toRef.id)).startAt as Timestamp).toMillis());
    expect(await session(toRef.id)).toMatchObject({ seatsConfirmed: 1 });
    expect((await db().doc(`sessions/${toRef.id}/seatLocks/${u.uid}`).get()).exists).toBe(true);
    expect((await db().doc(`sessions/${from}/seatLocks/${u.uid}`).get()).exists).toBe(false);
    expect((await db().doc(`sessions/${from}/waitlist/${w.uid}`).get()).data()!.status).toBe("offered");
    expect(await session(from)).toMatchObject({ seatsConfirmed: 0, seatsHeld: 1 });
    const notes = await db().collection(`users/${u.uid}/notifications`).get();
    expect(notes.docs.map((d) => d.data().type)).toContain("event_updated");
    expect((await logs(reservationId)).map((l) => l.action)).toEqual(["reservation.move"]);
    // Le membre peut toujours annuler sa réservation déplacée.
    expect(await u.call("cancelReservation", { reservationId })).toMatchObject({ ok: true });
    expect(await session(toRef.id)).toMatchObject({ seatsConfirmed: 0 });
  });

  it("pointage : ouvert 3 h avant, présent / absent / annuler le pointage", async () => {
    const later = await makeSession({ startInHours: 30 });
    const soon = await makeSession({ startInHours: 2.5 });
    const u = await member();
    const v = await member();
    const r1 = await paidReservation(u, later);
    const r2 = await paidReservation(v, soon);
    expect(await refusal(team.call("adminCheckIn", { reservationId: r1.reservationId, presence: "attended" }))).toBe("failed-precondition:too_early");
    await team.call("adminCheckIn", { reservationId: r2.reservationId, presence: "attended" });
    expect(await reservation(r2.reservationId)).toMatchObject({ status: "attended", checkedInBy: team.uid });
    await team.call("adminCheckIn", { reservationId: r2.reservationId, presence: "no_show" });
    expect((await reservation(r2.reservationId)).status).toBe("no_show");
    await team.call("adminCheckIn", { reservationId: r2.reservationId, presence: "confirmed" });
    expect(await reservation(r2.reservationId)).toMatchObject({ status: "confirmed", checkedInAt: null });
    expect(await refusal(u.call("adminCheckIn", { reservationId: r1.reservationId, presence: "attended" }))).toBe("permission-denied:");
  });

  it("export journalisé", async () => {
    await team.call("adminLogExport", { kind: "participants", targetId: "session-x", rows: 12 });
    expect((await logs("session-x")).map((l) => [l.action, l.after.rows])).toEqual([["export.participants", 12]]);
  });
});

describe("avis", () => {
  let team: Client;
  beforeAll(async () => {
    team = await member({ role: "admin" });
  });

  /** Réservation payée puis expérience « terminée » (dates déplacées dans le passé). */
  async function pastReservation(u: Client, opts: { checkIn?: "attended" | "no_show" } = {}) {
    const sid = await makeSession({ startInHours: 72 });
    const { reservationId } = await paidReservation(u, sid);
    const start = Timestamp.fromMillis(Date.now() - 5 * 3_600_000);
    const end = Timestamp.fromMillis(Date.now() - 3 * 3_600_000);
    await db().doc(`reservations/${reservationId}`).update({ "sessionSnapshot.startAt": start, "sessionSnapshot.endAt": end, ...(opts.checkIn ? { status: opts.checkIn } : {}) });
    await db().doc(`sessions/${sid}`).update({ startAt: start, endAt: end });
    const r = await reservation(reservationId);
    return { reservationId, experienceId: r.experienceId as string, sid };
  }

  it("présent·e : avis publié sur l'expérience, note moyenne exacte, un seul avis par réservation", async () => {
    const a = await member();
    const b = await member();
    await db().doc(`users/${a.uid}`).update({ firstName: "Sara", lastName: "benali" });
    const ra = await pastReservation(a, { checkIn: "attended" });
    expect(await a.call("submitReview", { reservationId: ra.reservationId, rating: 5, comment: "Super soirée !" })).toEqual({ ok: true, reviewId: ra.reservationId, status: "published" });
    const rv = (await db().doc(`reviews/${ra.reservationId}`).get()).data()!;
    expect(rv).toMatchObject({ userId: a.uid, experienceId: ra.experienceId, rating: 5, comment: "Super soirée !", publicName: "Sara B.", status: "published" });
    expect((await reservation(ra.reservationId)).reviewId).toBe(ra.reservationId);
    expect(await refusal(a.call("submitReview", { reservationId: ra.reservationId, rating: 4 }))).toBe("failed-precondition:already_reviewed");
    // Deuxième avis sur la même expérience (autre date) : moyenne 4,5.
    const sid2 = await makeSession({ startInHours: 72 });
    await db().doc(`sessions/${sid2}`).update({ experienceId: ra.experienceId });
    const { reservationId: rb } = await paidReservation(b, sid2);
    await db().doc(`reservations/${rb}`).update({ "sessionSnapshot.endAt": Timestamp.fromMillis(Date.now() - 3_600_000), experienceId: ra.experienceId });
    await b.call("submitReview", { reservationId: rb, rating: 4 });
    expect((await db().doc(`experiences/${ra.experienceId}`).get()).data()).toMatchObject({ ratingCount: 2, ratingSum: 9, ratingAvg: 4.5 });
  });

  it("refusé : absent·e, expérience pas terminée, réservation d'autrui, note invalide", async () => {
    const u = await member();
    const other = await member();
    const absent = await pastReservation(u, { checkIn: "no_show" });
    expect(await refusal(u.call("submitReview", { reservationId: absent.reservationId, rating: 5 }))).toBe("failed-precondition:not_reviewable");
    const sid = await makeSession({ startInHours: 72 });
    const { reservationId } = await paidReservation(u, sid);
    expect(await refusal(u.call("submitReview", { reservationId, rating: 5 }))).toBe("failed-precondition:not_reviewable");
    const done = await pastReservation(u);
    expect(await refusal(other.call("submitReview", { reservationId: done.reservationId, rating: 5 }))).toBe("not-found:not_found");
    expect(await refusal(u.call("submitReview", { reservationId: done.reservationId, rating: 6 }))).toBe("invalid-argument:");
  });

  it("modération : un avis masqué sort de la note moyenne, puis peut être republié", async () => {
    const u = await member();
    const r = await pastReservation(u);
    // 4 étoiles : publié directement (2 étoiles ou moins : en attente de modération, voir audit-fixes.test.ts).
    await u.call("submitReview", { reservationId: r.reservationId, rating: 4, comment: "Correct" });
    expect(await refusal(u.call("adminSetReviewStatus", { reviewId: r.reservationId, status: "hidden" }))).toBe("permission-denied:");
    await team.call("adminSetReviewStatus", { reviewId: r.reservationId, status: "hidden" });
    expect((await db().doc(`reviews/${r.reservationId}`).get()).data()!.status).toBe("hidden");
    expect((await db().doc(`experiences/${r.experienceId}`).get()).data()).toMatchObject({ ratingCount: 0, ratingAvg: 0 });
    await team.call("adminSetReviewStatus", { reviewId: r.reservationId, status: "published" });
    expect((await db().doc(`experiences/${r.experienceId}`).get()).data()).toMatchObject({ ratingCount: 1, ratingAvg: 4 });
  });

  it("le lendemain : une demande d'avis, une seule fois", async () => {
    const { sendReviewRequests } = await import("../../functions/src/reviews/reviews");
    const u = await member();
    const r = await pastReservation(u);
    await sendReviewRequests();
    await sendReviewRequests();
    const notes = await db().collection(`users/${u.uid}/notifications`).where("type", "==", "review_request").get();
    expect(notes.docs.map((d) => d.data().link)).toEqual([`/espace/reservations/${r.reservationId}#avis`]);
  });
});

describe("expériences sans date et alerte « prochaines dates »", () => {
  let team: Client;
  beforeAll(async () => {
    team = await member({ role: "admin" });
    await db().doc("categories/create").set({ isActive: true }, { merge: true });
  });
  const baseInput = {
    titleFr: "Atelier poterie sans date",
    summaryFr: "Un atelier pour modeler l'argile en petit groupe.",
    descriptionFr: "Description suffisamment longue pour passer la validation du formulaire admin.",
    categoryId: "create", cityId: "casablanca", district: "Maarif", venueName: "Atelier Terre", address: "10 rue de la Terre, Casablanca",
    revealPolicy: "immediate", bookingMode: "individual", maxSeatsPerBooking: 1, admission: "direct", requestMessageRequired: false,
    priceDh: 250, durationMinutes: 120, languages: ["fr"], alcoholServed: false, cancellationPolicyId: "standard-48h",
    economicsModel: "own", costPerSeatDh: 100, status: "published",
  };
  const plan = (days: number) => {
    const d = new Date(Date.now() + days * 86_400_000);
    return { firstDate: d.toISOString().slice(0, 10), time: "18:00", weeks: 1, capacity: 8 };
  };

  it("créée sans date, puis des dates ajoutées : les personnes inscrites à l'alerte sont prévenues une fois", async () => {
    const created = await team.call("adminSaveExperience", { data: { ...baseInput, sessions: plan(10) }, addSessions: false, images: [] });
    const expId = created.experienceId as string;
    expect(created).toMatchObject({ ok: true, sessionsCreated: 0 });
    expect((await db().collection("sessions").where("experienceId", "==", expId).get()).size).toBe(0);

    const fan = await member();
    expect(await fan.call("setExperienceAlert", { experienceId: expId, on: true })).toEqual({ ok: true, on: true });
    expect((await db().doc(`experienceAlerts/${expId}_${fan.uid}`).get()).exists).toBe(true);

    expect(await team.call("adminSaveExperience", { experienceId: expId, data: { ...baseInput, sessions: plan(12) }, addSessions: true, images: [] })).toMatchObject({ sessionsCreated: 1 });
    const notes = await db().collection(`users/${fan.uid}/notifications`).where("type", "==", "new_dates").get();
    expect(notes.size).toBe(1);
    expect((await db().doc(`experienceAlerts/${expId}_${fan.uid}`).get()).exists).toBe(false);
    // Reproposer d'autres dates plus tard ne renvoie rien à quelqu'un qui n'a plus d'alerte.
    await team.call("adminSaveExperience", { experienceId: expId, data: { ...baseInput, sessions: plan(20) }, addSessions: true, images: [] });
    expect((await db().collection(`users/${fan.uid}/notifications`).where("type", "==", "new_dates").get()).size).toBe(1);
  });

  it("on peut retirer son alerte ; pas d'alerte sur une expérience inconnue", async () => {
    const created = await team.call("adminSaveExperience", { data: { ...baseInput, titleFr: "Atelier bougies sans date", sessions: plan(10) }, addSessions: false, images: [] });
    const u = await member();
    await u.call("setExperienceAlert", { experienceId: created.experienceId, on: true });
    await u.call("setExperienceAlert", { experienceId: created.experienceId, on: false });
    expect((await db().doc(`experienceAlerts/${created.experienceId}_${u.uid}`).get()).exists).toBe(false);
    expect(await refusal(u.call("setExperienceAlert", { experienceId: "inconnue", on: true }))).toBe("not-found:not_found");
  });
});

describe("Carnet et Pass (Étape I)", () => {
  let team: Client;
  const HOUR = 3_600_000;
  const offers = [
    { id: "carnet3", priceDh: 70, isActive: true },
    { id: "pass7", priceDh: 49, isActive: true },
    { id: "pass30", priceDh: 99, isActive: true },
    { id: "pass90", priceDh: 249, isActive: false },
    { id: "pass180", priceDh: 449, isActive: true },
    { id: "pass365", priceDh: 790, isActive: true },
  ];
  const planInput = { nameFr: "Carnet et Pass", isActive: true, offers, highlightId: "pass180" };
  beforeAll(async () => {
    team = await member({ role: "admin" });
    await team.call("adminSaveMembershipPlan", planInput);
  });
  afterAll(async () => {
    await db().doc("membershipPlans/annual").set({ isActive: false, earlyAccessHours: 0 }, { merge: true });
  });
  const membership = async (uid: string) => (await db().doc(`memberships/${uid}`).get()).data();
  const carnet = async (uid: string) => (await db().doc(`carnets/${uid}`).get()).data();
  const invoice = async (id: string) => (await db().doc(`invoices/${id}`).get()).data();
  async function buy(u: Client, offerId: string) {
    const { paymentId } = await u.call("startMembershipCheckout", { offerId });
    return { paymentId: paymentId as string, ...(await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" })) };
  }

  it("l'équipe règle les offres ; inactives ou désactivées, on ne peut pas acheter", async () => {
    const u = await member();
    expect(await refusal(u.call("adminSaveMembershipPlan", planInput))).toBe("permission-denied:");
    const saved = (await db().doc("membershipPlans/annual").get()).data()!;
    expect(saved.offers.find((o: { id: string }) => o.id === "pass180")).toMatchObject({ kind: "pass", days: 180, price: { amount: 44900 }, highlight: true });
    expect(await refusal(u.call("startMembershipCheckout", { offerId: "pass90" }))).toBe("failed-precondition:membership_unavailable");
    expect(await refusal(u.call("startMembershipCheckout", { offerId: "x" }))).toBe("invalid-argument:");
    await team.call("adminSaveMembershipPlan", { ...planInput, isActive: false });
    expect(await refusal(u.call("startMembershipCheckout", { offerId: "pass30" }))).toBe("failed-precondition:membership_unavailable");
    await team.call("adminSaveMembershipPlan", planInput);
  });

  it("pass 1 mois : 99 DH lus dans l'offre, 30 jours ; un nouveau pass prolonge depuis la fin", async () => {
    const u = await member();
    const { paymentId } = await u.call("startMembershipCheckout", { offerId: "pass30", amount: 1 });
    expect(await payment(paymentId as string)).toMatchObject({ purpose: "membership", amount: 9900, kind: "pass", days: 30, label: "Pass 1 mois" });
    expect(await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" })).toMatchObject({ outcome: "confirmed", purpose: "membership" });
    const end1 = ((await membership(u.uid))!.endAt as Timestamp).toMillis();
    expect(Math.round((end1 - Date.now()) / 86_400_000)).toBe(30);
    await buy(u, "pass7");
    const end2 = ((await membership(u.uid))!.endAt as Timestamp).toMillis();
    expect(Math.round((end2 - end1) / 86_400_000)).toBe(7);
    const inv = await invoice(`inv_${paymentId}`);
    expect(inv!.lines[0]).toMatchObject({ label: "Pass 1 mois" });
    expect(inv!.lines[0].detail).toMatch(/^Du .+ au .+$/);
  });

  it("carnet : 3 crédits valables 3 mois ; un nouveau carnet ajoute ses crédits", async () => {
    const u = await member();
    const { paymentId } = await buy(u, "carnet3");
    expect(await carnet(u.uid)).toMatchObject({ credits: 3 });
    expect(Math.round((((await carnet(u.uid))!.expiresAt as Timestamp).toMillis() - Date.now()) / 86_400_000)).toBe(90);
    await buy(u, "carnet3");
    expect((await carnet(u.uid))!.credits).toBe(6);
    expect((await invoice(`inv_${paymentId}`))!.lines[0]).toMatchObject({ label: "Carnet 3 sorties", detail: "3 crédits, valables 3 mois" });
  });

  it("réserver avec le pass : place incluse (confirmée sans payer), 2 réservations à venir au maximum ; « + 1 » payé", async () => {
    const u = await member();
    await buy(u, "pass30");
    const sids = [await makeSession({ price: 3500 }), await makeSession({ price: 3500 }), await makeSession({ price: 3500 })];
    const r1 = await u.call("createReservation", { sessionId: sids[0], seats: 1 });
    expect(r1).toMatchObject({ status: "confirmed", total: 0 });
    expect((await reservation(r1.reservationId as string)).pricing).toMatchObject({ memberDiscount: 3500, total: 0, coverage: { passSeats: 1, carnetSeats: 0 } });
    expect(await u.call("createReservation", { sessionId: sids[1], seats: 2 })).toMatchObject({ status: "pending_payment", total: 3500 });
    // La 2e réservation n'est pas encore payée : une seule réservation confirmée couverte par le pass.
    const preview = (await u.call("previewPricing", { sessionId: sids[2], seats: 1 })) as { pricing: { total: number }; pass: boolean; passLimitReached: boolean };
    expect(preview).toMatchObject({ pass: true, passLimitReached: false, pricing: { total: 0 } });
    await u.call("createReservation", { sessionId: sids[2], seats: 1 });
    const fourth = await makeSession({ price: 3500 });
    const p4 = (await u.call("previewPricing", { sessionId: fourth, seats: 1 })) as { pricing: { total: number }; passLimitReached: boolean };
    expect(p4).toMatchObject({ passLimitReached: true, pricing: { total: 3500 } });
  });

  it("réserver avec le carnet : 1 crédit par place, invité compris ; crédit rendu si l'annulation est dans les délais", async () => {
    const u = await member();
    await buy(u, "carnet3");
    const sid = await makeSession({ price: 3500, startInHours: 96 });
    const r = await u.call("createReservation", { sessionId: sid, seats: 2, useCarnet: true });
    expect(r).toMatchObject({ status: "confirmed", total: 0 });
    expect((await carnet(u.uid))!.credits).toBe(1);
    await u.call("cancelReservation", { reservationId: r.reservationId });
    expect((await carnet(u.uid))!.credits).toBe(3);
    // Sans le cocher, le carnet n'est pas utilisé.
    expect(await u.call("createReservation", { sessionId: await makeSession({ price: 3500 }), seats: 1 })).toMatchObject({ status: "pending_payment", total: 3500 });
    // Annulation trop tardive (moins de 48 h) : le crédit est consommé.
    const late = await makeSession({ price: 3500, startInHours: 20 });
    const lr = await u.call("createReservation", { sessionId: late, seats: 1, useCarnet: true });
    await u.call("cancelReservation", { reservationId: lr.reservationId });
    expect((await carnet(u.uid))!.credits).toBe(2);
  });

  it("pass : événement abonnés uniquement et accès anticipé ; le carnet ne les ouvre pas", async () => {
    const passU = await member();
    const carnetU = await member();
    await buy(passU, "pass30");
    await buy(carnetU, "carnet3");
    const vip = await makeSession({ membersOnly: true, price: 3500 });
    expect(await refusal(carnetU.call("createReservation", { sessionId: vip, seats: 1 }))).toBe("failed-precondition:members_only");
    expect(await passU.call("createReservation", { sessionId: vip, seats: 1 })).toMatchObject({ status: "confirmed" });
    const fresh = await makeSession({ createdHoursAgo: 1, price: 3500, extra: { earlyAccessDays: 2 } });
    expect(await refusal(carnetU.call("createReservation", { sessionId: fresh, seats: 1, useCarnet: true }))).toBe("failed-precondition:members_early_access");
  });

  it("liste d'attente : priorité au pass, place incluse ; offrir puis retirer un pass (journalisé)", async () => {
    const early = await member();
    const passU = await member();
    expect(await refusal(passU.call("adminGrantMembership", { uid: passU.uid, days: 30, reason: "test" }))).toBe("permission-denied:");
    await team.call("adminGrantMembership", { uid: passU.uid, days: 30, credits: 2, reason: "Partenaire" });
    expect(await membership(passU.uid)).toMatchObject({ status: "active", source: "gift" });
    expect((await carnet(passU.uid))!.credits).toBe(2);
    const sid = await makeSession({ capacity: 1, price: 3500 });
    const holder = await member();
    const { reservationId } = await paidReservation(holder, sid);
    await early.call("joinWaitlist", { sessionId: sid, seats: 1 });
    await passU.call("joinWaitlist", { sessionId: sid, seats: 1 });
    await holder.call("cancelReservation", { reservationId });
    const offer = (await db().doc(`sessions/${sid}/waitlist/${passU.uid}`).get()).data()!;
    expect(offer.status).toBe("converted");
    expect((await reservation(offer.reservationId)).pricing).toMatchObject({ memberDiscount: 3500, total: 0 });
    expect((await db().doc(`sessions/${sid}/waitlist/${early.uid}`).get()).data()!.status).toBe("waiting");
    await team.call("adminRevokeMembership", { uid: passU.uid, reason: "Erreur" });
    expect(await passU.call("createReservation", { sessionId: await makeSession({ price: 3500 }), seats: 1 })).toMatchObject({ total: 3500 });
    const logs = (await db().collection("auditLogs").where("targetId", "==", passU.uid).get()).docs.map((d) => d.data().action).sort();
    expect(logs).toEqual(["membership.grant", "membership.revoke"]);
  });

  it("pas de check-in = absence : 1re avertissement, 2e pass suspendu 14 jours ; l'équipe annule une absence", async () => {
    const u = await member();
    await db().doc(`users/${u.uid}`).set({ email: `absent.${run}@example.com` }, { merge: true });
    await buy(u, "pass30");
    const one = await makeSession({ price: 3500, startInHours: 30 });
    const two = await makeSession({ price: 3500, startInHours: 31 });
    const r1 = await u.call("createReservation", { sessionId: one, seats: 1 });
    const r2 = await u.call("createReservation", { sessionId: two, seats: 1 });
    const s1 = await session(one);
    const s2 = await session(two);
    await markAbsences(one, s1, (await db().doc(`experiences/${s1.experienceId}`).get()).data()!, (s1.startAt as Timestamp).toMillis() + 2 * HOUR);
    expect((await reservation(r1.reservationId as string)).status).toBe("no_show");
    expect((await membership(u.uid))!.suspendedUntil ?? null).toBeNull();
    expect((await db().collection("mail").where("refs.reservationId", "==", r1.reservationId).where("kind", "==", "absence_warning").get()).size).toBe(1);
    const at2 = (s2.startAt as Timestamp).toMillis() + 2 * HOUR;
    await markAbsences(two, s2, (await db().doc(`experiences/${s2.experienceId}`).get()).data()!, at2);
    const until = ((await membership(u.uid))!.suspendedUntil as Timestamp).toMillis();
    expect(Math.round((until - at2) / 86_400_000)).toBe(14);
    // Suspendu : la place n'est plus incluse.
    expect(await u.call("createReservation", { sessionId: await makeSession({ price: 3500 }), seats: 1 })).toMatchObject({ total: 3500 });
    // La personne était là : l'équipe annule l'absence, la suspension est levée.
    await team.call("adminCancelAbsence", { reservationId: r2.reservationId });
    expect((await reservation(r2.reservationId as string)).status).toBe("attended");
    expect((await membership(u.uid))!.suspendedUntil ?? null).toBeNull();
  });

  it("règles : la formule active est publique, l'abonnement n'est lisible que par son titulaire", async () => {
    const u = await member();
    await buy(u, "pass30");
    const { getFirestore, doc, getDoc, setDoc, connectFirestoreEmulator } = await import("firebase/firestore");
    const { initializeApp: initClient } = await import("firebase/app");
    const { getAuth: clientAuth, connectAuthEmulator: connectAuth, signInWithEmailAndPassword: signIn } = await import("firebase/auth");
    const app = initClient({ projectId: PROJECT, apiKey: "demo-key" }, `rules-${run}`);
    clients.push(app);
    connectAuth(clientAuth(app), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    const fsdb = getFirestore(app);
    const [h, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
    connectFirestoreEmulator(fsdb, h!, Number(port));
    expect((await getDoc(doc(fsdb, "membershipPlans/annual"))).exists()).toBe(true);
    const other = await adminAuth(admin).createUser({ email: `curieux.${run}@example.com`, password: PASSWORD });
    await signIn(clientAuth(app), `curieux.${run}@example.com`, PASSWORD);
    await expect(getDoc(doc(fsdb, `memberships/${u.uid}`))).rejects.toThrow();
    await expect(setDoc(doc(fsdb, `memberships/${other.uid}`), { status: "active", startAt: new Date(), endAt: new Date(Date.now() + 1e10) })).rejects.toThrow();
  });
});

describe("factures, avoirs et e-mails (5c)", () => {
  const invoice = async (id: string) => (await db().doc(`invoices/${id}`).get()).data();
  const pdfExists = async (path: string) => (await adminStorage(admin).bucket(`${PROJECT}.appspot.com`).file(path).exists())[0];
  const mailsFor = async (invoiceId: string) => (await db().collection("mail").where("refs.invoiceId", "==", invoiceId).get()).docs.map((d) => d.data());

  it("paiement réussi : reçu de TEST numéroté, PDF privé, e-mail rangé dans la boîte d'envoi", async () => {
    const sid = await makeSession({ price: 25000 });
    const u = await member();
    await db().doc(`users/${u.uid}`).set({ email: `facture.${run}@example.com`, lastName: "Alaoui", locale: "en" }, { merge: true });
    const { reservationId, paymentId } = await paidReservation(u, sid, 2);
    const inv = await invoice(`inv_${paymentId}`);
    expect(inv).toMatchObject({
      kind: "invoice", series: "TEST-FA", test: true, legal: false, userId: u.uid, reservationId, purpose: "reservation",
      buyer: { name: "Membre Alaoui", email: `facture.${run}@example.com` },
      totals: { ttc: 50000, vat: 0, ht: 50000, rate: null }, pdfReady: true,
    });
    expect(inv!.number).toMatch(/^TEST-FA-\d{4}-\d{6}$/);
    expect(inv!.lines).toMatchObject([{ label: "Atelier test", quantity: 2, unitAmount: 25000, amount: 50000 }]);
    expect(await payment(paymentId)).toMatchObject({ invoiceId: `inv_${paymentId}`, invoiceNumber: inv!.number });
    expect(await pdfExists(inv!.pdfPath)).toBe(true);
    const mails = await mailsFor(`inv_${paymentId}`);
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({ status: "outbox", provider: "outbox", kind: "reservation_invoice", locale: "en", to: `facture.${run}@example.com`, attachments: [{ filename: `${inv!.number}.pdf` }, { filename: "wenzy.ics", contentType: "text/calendar" }] });
    expect(mails[0]!.subject).toBe("You're booked: Atelier test");
    expect(mails[0]!.text).toContain("TEST payment");
  });

  it("numérotation continue : 4 paiements simultanés reçoivent 4 numéros différents qui se suivent dans le compteur", async () => {
    const sid = await makeSession({ capacity: 10 });
    const users = await Promise.all([1, 2, 3, 4].map(() => member()));
    const pays = await Promise.all(users.map((u) => paidReservation(u, sid)));
    const invs = await Promise.all(pays.map((p) => invoice(`inv_${p.paymentId}`)));
    const seqs = invs.map((i) => i!.seq as number);
    expect(new Set(seqs).size).toBe(4);
    const counter = (await db().doc(`counters/TEST-FA-${invs[0]!.year}`).get()).data()!;
    expect(counter.last).toBeGreaterThanOrEqual(Math.max(...seqs));
  });

  it("annulation remboursée : avoir rattaché à la facture, e-mail de remboursement", async () => {
    const sid = await makeSession({ startInHours: 96 });
    const u = await member();
    const { reservationId, paymentId } = await paidReservation(u, sid);
    await u.call("cancelReservation", { reservationId });
    const refund = (await db().collection("payments").where("parentPaymentId", "==", paymentId).get()).docs[0]!;
    const cn = await invoice(`cn_${refund.id}`);
    const inv = await invoice(`inv_${paymentId}`);
    expect(cn).toMatchObject({ kind: "credit_note", series: "TEST-AV", relatedInvoiceId: `inv_${paymentId}`, relatedInvoiceNumber: inv!.number, reasonLabel: "Annulation par le membre", totals: { ttc: 30000 }, pdfReady: true });
    expect(await pdfExists(cn!.pdfPath)).toBe(true);
    expect((await mailsFor(`cn_${refund.id}`))[0]).toMatchObject({ kind: "refund", status: "outbox" });
  });

  it("société : réglée par le super-admin seulement, figée sur les nouveaux documents ; renvoi par e-mail depuis le back-office", async () => {
    const company = { legalName: "Wenzy SARL", address: "Bd d'Anfa, Casablanca", ice: "001234567000089", if: "12345678", rc: "Casablanca 123456", email: "factures@example.com", vatRate: 20, mailProvider: "outbox", fromName: "Wenzy", fromEmail: "bonjour@example.com" };
    const adm = await member({ role: "admin" });
    const sup = await member({ role: "superadmin" });
    expect(await refusal(adm.call("adminSaveCompanySettings", company))).toBe("permission-denied:");
    expect(await refusal(sup.call("adminSaveCompanySettings", { ...company, ice: "123" }))).toBe("invalid-argument:");
    expect(await sup.call("adminSaveCompanySettings", company)).toEqual({ ok: true });
    try {
      const sid = await makeSession({ price: 12000 });
      const u = await member();
      const { paymentId } = await paidReservation(u, sid);
      const inv = await invoice(`inv_${paymentId}`);
      // Paiement de test : toujours une série de TEST, mais avec la société et la TVA (20 %) figées.
      expect(inv).toMatchObject({ series: "TEST-FA", seller: { legalName: "Wenzy SARL", ice: "001234567000089", vatRate: 20 }, totals: { ttc: 12000, ht: 10000, vat: 2000, rate: 20 } });
      expect(await refusal(u.call("adminInvoiceAction", { paymentId, action: "resend" }))).toBe("permission-denied:");
      expect(await adm.call("adminInvoiceAction", { paymentId, action: "resend" })).toMatchObject({ invoiceId: `inv_${paymentId}`, created: false, mailStatus: "outbox" });
      expect(await mailsFor(`inv_${paymentId}`)).toHaveLength(2);
      const logs = await db().collection("auditLogs").where("targetId", "==", `inv_${paymentId}`).get();
      expect(logs.docs.map((d) => d.data().action)).toContain("invoice.resend");
    } finally {
      await Promise.all([db().doc("settings/company").delete(), db().doc("settings/email").delete()]);
    }
  });

  it("abonnement payé : facture du pass avec la période", async () => {
    await db().doc("membershipPlans/annual").set({ name: { fr: "Carnet et Pass" }, isActive: true, earlyAccessHours: 0 }, { merge: true });
    const u = await member();
    const { paymentId } = await u.call("startMembershipCheckout", { offerId: "pass365" });
    await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" });
    const inv = await invoice(`inv_${paymentId}`);
    expect(inv).toMatchObject({ purpose: "membership", reservationId: null, totals: { ttc: 79000 } });
    expect(inv!.lines[0].label).toBe("Pass 1 an");
    expect(inv!.lines[0].detail).toMatch(/^Du .+ au .+$/);
    expect((await mailsFor(`inv_${paymentId}`))[0]).toMatchObject({ kind: "membership_invoice" });
  });
});

describe("back-office : partenaires, villes, univers (5d, 5e)", () => {
  const partner = {
    name: "Studio Lumière", type: "studio", status: "prospect", cityId: "casablanca", district: "Maarif", address: "12 rue Test", contactName: "Yasmine",
    contactEmail: "contact@studio.ma", contactPhone: "+212 6 00 00 00 00", link: "instagram.com/studio", model: "commission", defaultCommissionPercent: 20, notes: "",
  };
  const auditActions = async (targetId: string) => (await db().collection("auditLogs").where("targetId", "==", targetId).get()).docs.map((d) => d.data().action);

  it("ajouter, modifier, archiver un partenaire ; réservé à l'équipe ; journalisé", async () => {
    const adm = await member({ role: "admin" });
    const u = await member();
    expect(await refusal(u.call("adminSavePartner", { data: partner }))).toBe("permission-denied:");
    expect(await refusal(adm.call("adminSavePartner", { data: { ...partner, model: "commission", defaultCommissionPercent: 0 } }))).toBe("invalid-argument:");
    expect(await refusal(adm.call("adminSavePartner", { data: { ...partner, cityId: "ville-inconnue" } }))).toBe("invalid-argument:");
    const { id } = (await adm.call("adminSavePartner", { data: partner })) as { id: string };
    expect((await db().doc(`partners/${id}`).get()).data()).toMatchObject({ name: "Studio Lumière", status: "prospect", model: "commission", defaultCommissionPercent: 20, createdBy: adm.uid });
    await adm.call("adminSavePartner", { id, data: { ...partner, name: "Studio Lumière Maarif", status: "active", model: "purchase", defaultCommissionPercent: 20 } });
    expect((await db().doc(`partners/${id}`).get()).data()).toMatchObject({ name: "Studio Lumière Maarif", status: "active", model: "purchase", defaultCommissionPercent: 0 });
    await adm.call("adminPartnerAction", { id, action: "archive" });
    expect((await db().doc(`partners/${id}`).get()).data()!.status).toBe("archived");
    expect(await auditActions(id)).toEqual(expect.arrayContaining(["partner.create", "partner.update", "partner.archive"]));
  });

  it("suppression : super-admin seulement, et jamais pour un partenaire utilisé par une expérience", async () => {
    const adm = await member({ role: "admin" });
    const sup = await member({ role: "superadmin" });
    const { id: linked } = (await adm.call("adminSavePartner", { data: partner })) as { id: string };
    const exp = db().collection("experiences").doc();
    await exp.set({ title: { fr: "Atelier lié" }, status: "draft" });
    await db().doc(`experiences/${exp.id}/private/economics`).set({ partnerId: linked, model: "commission", commissionPercent: 20 });
    expect(await refusal(adm.call("adminPartnerAction", { id: linked, action: "delete" }))).toBe("permission-denied:superadmin_only");
    expect(await refusal(sup.call("adminPartnerAction", { id: linked, action: "delete" }))).toBe("failed-precondition:linked");
    const { id: free } = (await adm.call("adminSavePartner", { data: { ...partner, name: "Lieu sans expérience" } })) as { id: string };
    expect(await sup.call("adminPartnerAction", { id: free, action: "delete" })).toEqual({ ok: true });
    expect((await db().doc(`partners/${free}`).get()).exists).toBe(false);
  });

  it("candidature → partenaire « prospect » avec ses coordonnées (une seule fois) ; écarter / remettre à traiter", async () => {
    const adm = await member({ role: "admin" });
    const app = await db().collection("partnerApplications").add({
      contactName: "Omar", businessName: `Café ${run}`, type: "restaurant", city: "Casablanca", email: "omar@cafe.ma", phone: "", link: "", message: "Un café calme à Gauthier, 20 places.", locale: "fr", createdAt: Timestamp.now(),
    });
    const r1 = (await adm.call("adminPartnerApplicationAction", { applicationId: app.id, action: "convert" })) as { partnerId: string };
    const r2 = (await adm.call("adminPartnerApplicationAction", { applicationId: app.id, action: "convert" })) as { partnerId: string };
    expect(r2.partnerId).toBe(r1.partnerId);
    expect((await db().doc(`partners/${r1.partnerId}`).get()).data()).toMatchObject({ name: `Café ${run}`, type: "restaurant", status: "prospect", cityId: "casablanca", contactEmail: "omar@cafe.ma", applicationId: app.id });
    expect((await app.get()).data()).toMatchObject({ status: "converted", partnerId: r1.partnerId });
    const other = await db().collection("partnerApplications").add({ contactName: "X", businessName: "Y", type: "other", city: "Rabat", email: "x@y.ma", phone: "", link: "", message: "Bonjour, une proposition.", locale: "fr", createdAt: Timestamp.now() });
    await adm.call("adminPartnerApplicationAction", { applicationId: other.id, action: "decline" });
    expect((await other.get()).data()!.status).toBe("declined");
  });

  it("villes et univers : super-admin seulement, journalisé ; création de catégories et sous-catégories (19)", async () => {
    const adm = await member({ role: "admin" });
    const sup = await member({ role: "superadmin" });
    const city = { id: `ville-${run}`, nameFr: "Rabat", nameAr: "الرباط", nameEn: "", isActive: false, isComingSoon: true, order: 5, districts: ["Agdal", "Hassan"], region: "Rabat-Salé-Kénitra", country: "Maroc", imagePath: "cities/rabat.webp" };
    expect(await refusal(adm.call("adminSaveCity", city))).toBe("permission-denied:");
    expect(await sup.call("adminSaveCity", city)).toEqual({ id: city.id, created: true });
    expect((await db().doc(`cities/${city.id}`).get()).data()).toMatchObject({ name: { fr: "Rabat", ar: "الرباط" }, isActive: false, isComingSoon: true, timezone: "Africa/Casablanca", currency: "MAD", districts: ["Agdal", "Hassan"], region: "Rabat-Salé-Kénitra", country: "Maroc", imagePath: "cities/rabat.webp" });
    await sup.call("adminSaveCity", { ...city, nameAr: "", isActive: true, region: "", imagePath: "" });
    const c = (await db().doc(`cities/${city.id}`).get()).data()!;
    expect(c).toMatchObject({ isActive: true, isComingSoon: false, region: null, imagePath: null });
    expect(c.name).toEqual({ fr: "Rabat" });
    expect(await refusal(sup.call("adminSaveCity", { ...city, imagePath: "https://exemple.com/x.jpg" }))).toBe("invalid-argument:");
    const cat = { id: "create", name: { fr: "Ateliers créatifs", ar: "", en: "Creative workshops" }, shortName: { fr: "Ateliers", ar: "", en: "Workshops" }, description: { fr: "Poterie, peinture, cuisine…", ar: "", en: "" }, order: 4, isActive: true, defaultBookingMode: "individual" };
    expect(await refusal(adm.call("adminSaveCategory", cat))).toBe("permission-denied:");
    const before = (await db().doc("categories/create").get()).data();
    const fresh = `rencontres-${run}`.slice(0, 24).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const sub = `sous-${run}`.slice(0, 24).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    try {
      await sup.call("adminSaveCategory", cat);
      expect((await db().doc("categories/create").get()).data()).toMatchObject({ name: { fr: "Ateliers créatifs", en: "Creative workshops" }, order: 4, icon: "sparkles", parentId: null });
      expect(await auditActions("create")).toContain("category.update");
      // Nouvelle catégorie principale : pictogramme, couleur, image.
      expect(await sup.call("adminSaveCategory", { ...cat, id: fresh, icon: "users", color: "#3d6b8c", imagePath: "categories/r.webp" })).toEqual({ id: fresh, created: true });
      expect((await db().doc(`categories/${fresh}`).get()).data()).toMatchObject({ icon: "users", color: "#3d6b8c", imagePath: "categories/r.webp", parentId: null });
      expect(await auditActions(fresh)).toContain("category.create");
      // Sous-catégorie : la parente doit exister et être principale ; un seul niveau.
      expect(await refusal(sup.call("adminSaveCategory", { ...cat, id: sub, parentId: "inexistante" }))).toBe("invalid-argument:invalid_parent");
      expect(await sup.call("adminSaveCategory", { ...cat, id: sub, parentId: fresh })).toEqual({ id: sub, created: true });
      expect(await refusal(sup.call("adminSaveCategory", { ...cat, id: `${sub}-2`.slice(0, 24), parentId: sub }))).toBe("invalid-argument:invalid_parent");
      expect(await refusal(sup.call("adminSaveCategory", { ...cat, id: fresh, parentId: "create" }))).toBe("failed-precondition:has_children");
      expect(await refusal(sup.call("adminSaveCategory", { ...cat, id: sub, parentId: sub }))).toBe("invalid-argument:invalid_parent");
      expect(await refusal(sup.call("adminSaveCategory", { ...cat, id: "Casino!" }))).toBe("invalid-argument:");
    } finally {
      if (before) await db().doc("categories/create").set(before);
      await db().doc(`categories/${sub}`).delete();
      await db().doc(`categories/${fresh}`).delete();
    }
  });
});

describe("codes promo et frais de service (5f)", () => {
  const promoInput = (code: string, extra: Record<string, unknown> = {}) => ({
    code, type: "percent", value: 20, validFrom: "", validTo: "2099-12-31", maxRedemptions: 5, firstBookingOnly: false, isActive: true, description: "", ...extra,
  });
  const promo = async (code: string) => (await db().doc(`promoCodes/${code}`).get()).data()!;

  it("code créé par l'équipe ; appliqué au prix, compté au paiement, une fois par personne", async () => {
    const adm = await member({ role: "admin" });
    const code = `AMIS${run}`.toUpperCase().slice(0, 20);
    expect(await refusal((await member()).call("adminSavePromo", { create: true, data: promoInput(code) }))).toBe("permission-denied:");
    expect(await adm.call("adminSavePromo", { create: true, data: promoInput(code.toLowerCase()) })).toEqual({ code });
    expect(await refusal(adm.call("adminSavePromo", { create: true, data: promoInput(code) }))).toBe("failed-precondition:promo_exists");
    const sid = await makeSession({ price: 16900 });
    const u = await member();
    expect(await u.call("previewPricing", { sessionId: sid, seats: 1, promoCode: code.toLowerCase() })).toMatchObject({ pricing: { subtotal: 16900, discount: 3400, promoCode: code, total: 13500 } });
    const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1, promoCode: code });
    expect((await reservation(reservationId as string)).pricing).toMatchObject({ discount: 3400, promoCode: code, total: 13500 });
    expect((await promo(code)).redemptionsCount).toBe(0); // pas encore payé
    const { paymentId } = await u.call("startCheckout", { reservationId });
    expect((await payment(paymentId as string)).amount).toBe(13500);
    await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" });
    expect((await promo(code)).redemptionsCount).toBe(1);
    expect((await db().doc(`promoCodes/${code}/redemptions/${u.uid}`).get()).exists).toBe(true);
    const inv = (await db().doc(`invoices/inv_${paymentId}`).get()).data()!;
    expect(inv.lines.map((l: { label: string }) => l.label)).toContain(`Code promo ${code}`);
    const sid2 = await makeSession({ price: 16900 });
    expect(await refusal(u.call("createReservation", { sessionId: sid2, seats: 1, promoCode: code }))).toBe("failed-precondition:promo_already_used");
  });

  it("codes inconnus, inactifs, expirés, épuisés, réservés à une première réservation", async () => {
    const adm = await member({ role: "admin" });
    const sid = await makeSession();
    const u = await member();
    const c = (s: string) => `${s}${run}`.toUpperCase().slice(0, 20);
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1, promoCode: c("INCONNU") }))).toBe("failed-precondition:promo_unknown");
    await adm.call("adminSavePromo", { create: true, data: promoInput(c("OFF"), { isActive: false }) });
    expect(await refusal(u.call("previewPricing", { sessionId: sid, seats: 1, promoCode: c("OFF") }))).toBe("failed-precondition:promo_inactive");
    await adm.call("adminSavePromo", { create: true, data: promoInput(c("OLD"), { validTo: "2020-01-01" }) });
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1, promoCode: c("OLD") }))).toBe("failed-precondition:promo_expired");
    await adm.call("adminSavePromo", { create: true, data: promoInput(c("FULL"), { maxRedemptions: 1 }) });
    await db().doc(`promoCodes/${c("FULL")}`).update({ redemptionsCount: 1 });
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1, promoCode: c("FULL") }))).toBe("failed-precondition:promo_exhausted");
    await adm.call("adminSavePromo", { create: true, data: promoInput(c("FIRST"), { firstBookingOnly: true }) });
    await paidReservation(u, await makeSession());
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1, promoCode: c("FIRST") }))).toBe("failed-precondition:promo_first_booking_only");
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1, promoCode: "a b" }))).toBe("invalid-argument:");
  });

  it("code de 100 % : place confirmée tout de suite et comptée ; changer de code reprend une nouvelle réservation", async () => {
    const adm = await member({ role: "admin" });
    const full = `OFFERT${run}`.toUpperCase().slice(0, 20);
    const half = `MOITIE${run}`.toUpperCase().slice(0, 20);
    await adm.call("adminSavePromo", { create: true, data: promoInput(full, { value: 100 }) });
    await adm.call("adminSavePromo", { create: true, data: promoInput(half, { value: 50 }) });
    const sid = await makeSession({ price: 20000, capacity: 5 });
    const u = await member();
    const first = await u.call("createReservation", { sessionId: sid, seats: 1, promoCode: half });
    expect(first).toMatchObject({ status: "pending_payment", total: 10000 });
    const second = await u.call("createReservation", { sessionId: sid, seats: 1, promoCode: full });
    expect(second).toMatchObject({ status: "confirmed", total: 0, resumed: false });
    expect((await reservation(first.reservationId as string)).status).toBe("expired");
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 1, seatsHeld: 0 });
    expect((await promo(full)).redemptionsCount).toBe(1);
  });

  it("frais de service : réglés par le super-admin, ajoutés aux réservations payantes, remboursés avec la place", async () => {
    const adm = await member({ role: "admin" });
    const sup = await member({ role: "superadmin" });
    expect(await refusal(adm.call("adminSaveBookingSettings", { mode: "per_seat", amountDh: 10, percent: 0 }))).toBe("permission-denied:");
    expect(await refusal(sup.call("adminSaveBookingSettings", { mode: "per_seat", amountDh: 0, percent: 0 }))).toBe("invalid-argument:");
    await sup.call("adminSaveBookingSettings", { mode: "per_seat", amountDh: 10, percent: 0 });
    try {
      const sid = await makeSession({ price: 15000, startInHours: 96 });
      const u = await member();
      expect(await u.call("previewPricing", { sessionId: sid, seats: 2 })).toMatchObject({ pricing: { subtotal: 30000, fees: 2000, total: 32000 } });
      const { reservationId, paymentId } = await paidReservation(u, sid, 2);
      expect((await reservation(reservationId)).pricing).toMatchObject({ fees: 2000, total: 32000 });
      expect((await db().doc(`invoices/inv_${paymentId}`).get()).data()!.lines.map((l: { label: string }) => l.label)).toContain("Frais de service");
      expect(await u.call("cancelReservation", { reservationId })).toMatchObject({ refundAmount: 32000 });
      // Gratuit : jamais de frais.
      const free = await makeSession({ price: 0 });
      expect(await u.call("createReservation", { sessionId: free, seats: 1 })).toMatchObject({ status: "confirmed", total: 0 });
    } finally {
      await sup.call("adminSaveBookingSettings", { mode: "none", amountDh: 0, percent: 0 });
    }
  });
});

describe("régime, allergies, langues de table (5g)", () => {
  const prefs = { diet: "vegetarian", allergies: "Arachides", languages: ["fr", "darija"], consent: true };

  it("champs facultatifs vides (null) acceptés comme absents", async () => {
    const sid = await makeSession();
    const u = await member();
    expect(await u.call("createReservation", { sessionId: sid, seats: 1, promoCode: null, preferences: null })).toMatchObject({ status: "pending_payment" });
  });

  it("à la réservation : accord obligatoire, enregistré et daté ; modifiable par la personne seulement, avant le début", async () => {
    const sid = await makeSession();
    const u = await member();
    expect(await refusal(u.call("createReservation", { sessionId: sid, seats: 1, preferences: { ...prefs, consent: false } }))).toBe("invalid-argument:");
    const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1, preferences: prefs });
    const r = await reservation(reservationId as string);
    expect(r.preferences).toMatchObject({ diet: "vegetarian", allergies: "Arachides", languages: ["fr", "darija"], shareWithVenue: true });
    expect(r.preferences.consentAt).toBeDefined();
    await u.call("updateReservationPreferences", { reservationId, preferences: { diet: "none", allergies: "", languages: ["en"], consent: false } });
    expect((await reservation(reservationId as string)).preferences).toMatchObject({ diet: "none", allergies: "", languages: ["en"], shareWithVenue: false });
    const other = await member();
    expect(await refusal(other.call("updateReservationPreferences", { reservationId, preferences: prefs }))).toBe("not-found:not_found");
  });

  it("sur une demande de participation : reprises sur la réservation quand l'équipe accepte", async () => {
    const sid = await makeSession({ onRequest: true });
    const u = await member();
    const adm = await member({ role: "admin" });
    const { requestId } = await u.call("requestBooking", { sessionId: sid, seats: 1, message: "", preferences: prefs });
    const { reservationId } = await adm.call("adminDecideRequest", { requestId, decision: "accept" });
    expect((await reservation(reservationId as string)).preferences).toMatchObject({ diet: "vegetarian", allergies: "Arachides", shareWithVenue: true });
  });
});

describe("composition des tables (6)", () => {
  async function dinnerSession(n: number) {
    const sid = await makeSession({ capacity: 20, mode: "social_dinner" });
    const expId = (await session(sid)).experienceId as string;
    await db().doc(`experiences/${expId}`).update({
      groupConfig: { minSize: 3, targetSize: 4, maxSize: 5 },
      // Lieu secret (docs/22) : rien dans la fiche publique, le lieu réel est dans le document privé.
      venue: { name: "", address: "", revealPolicy: "on_group_reveal", geo: null },
    });
    await db().doc(`experiences/${expId}/private/venue`).set({ name: "Rooftop secret", address: "1 rue du Test", geo: null, district: "Gauthier", partnerName: "" });
    const people: Client[] = [];
    for (let i = 0; i < n; i++) {
      const u = await member();
      await db().doc(`users/${u.uid}`).set({ firstName: `P${i}`, birthDate: `${1985 + i}-05-10`, languages: i % 3 === 0 ? ["en"] : ["fr", "en"], interests: ["food"], email: `p${i}.${run}@example.com` }, { merge: true });
      await paidReservation(u, sid);
      people.push(u);
    }
    return { sid, people };
  }

  it("lieu secret jamais révélé vide (docs/22, décision 15)", async () => {
    const { sid, people } = await dinnerSession(4);
    await db().doc(`experiences/${(await session(sid)).experienceId}/private/venue`).set({ name: "", address: "", geo: null, district: "", partnerName: "" });
    const adm = await member({ role: "admin" });
    await adm.call("adminProposeGroups", { sessionId: sid });
    const groups = (await db().collection("groups").where("sessionId", "==", sid).get()).docs.map((d) => ({ label: d.data().label as string, memberIds: d.data().memberIds as string[] }));
    await adm.call("adminSaveGroups", { sessionId: sid, groups });
    expect(await refusal(adm.call("adminRevealGroups", { sessionId: sid }))).toBe("failed-precondition:venue_missing");
    expect(people.length).toBe(4);
  });

  it("proposer, corriger, enregistrer puis révéler : chacun voit sa table, le lieu, une notification et un e-mail", async () => {
    const { sid, people } = await dinnerSession(8);
    const adm = await member({ role: "admin" });
    expect(await refusal(people[0]!.call("adminProposeGroups", { sessionId: sid }))).toBe("permission-denied:");
    expect(await adm.call("adminProposeGroups", { sessionId: sid })).toEqual({ groups: 2 });
    const proposed = (await db().collection("groups").where("sessionId", "==", sid).get()).docs.map((d) => d.data());
    expect(proposed.map((g) => g.status)).toEqual(["proposed", "proposed"]);
    expect(proposed.flatMap((g) => g.memberIds).sort()).toEqual(people.map((p) => p.uid).sort());
    expect(await refusal(adm.call("adminRevealGroups", { sessionId: sid }))).toBe("failed-precondition:not_validated");
    // Correction à la main : une personne oubliée est refusée, puis la composition complète est enregistrée.
    const all = people.map((p) => p.uid);
    expect(await refusal(adm.call("adminSaveGroups", { sessionId: sid, groups: [{ label: "Table 1", memberIds: all.slice(0, 7) }] }))).toBe("failed-precondition:unassigned");
    expect(await refusal(adm.call("adminSaveGroups", { sessionId: sid, groups: [{ label: "Table 1", memberIds: all }, { label: "Table 2", memberIds: [all[0]!] }] }))).toBe("failed-precondition:duplicate_member");
    expect(await adm.call("adminSaveGroups", { sessionId: sid, groups: [{ label: "Table 1", memberIds: all.slice(0, 4) }, { label: "Table 2", memberIds: all.slice(4) }] })).toEqual({ ok: true, status: "validated" });
    expect(await adm.call("adminRevealGroups", { sessionId: sid })).toEqual({ ok: true, participants: 8 });
    expect((await session(sid)).groupsStatus).toBe("revealed");
    const r0 = (await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", all[0]).get()).docs[0]!.data();
    expect(r0).toMatchObject({ groupId: `${sid}_t1`, venue: { name: "Rooftop secret" } });
    const g1 = (await db().doc(`groups/${sid}_t1`).get()).data()!;
    expect(g1).toMatchObject({ status: "revealed", label: "Table 1", seats: 4 });
    expect(g1.members[0]).toMatchObject({ firstName: "P0", interests: ["food"] });
    expect(g1.members[0].email).toBeUndefined();
    // Tables (docs/22 § 17.H) : « Votre lieu est révélé » ; la table et les prénoms se découvrent au check-in.
    const notes = await db().collection(`users/${all[0]}/notifications`).where("type", "==", "venue_revealed").get();
    expect(notes.size).toBe(1);
    const mails = await db().collection("mail").where("refs.sessionId", "==", sid).get();
    expect(mails.size).toBe(8);
    expect(mails.docs[0]!.data()).toMatchObject({ kind: "venue_revealed", status: "outbox" });
    expect(r0.tableSummary).toMatchObject({ others: 3 });
    // Après la révélation : plus de proposition automatique ; un changement à la main prévient les personnes déplacées.
    expect(await refusal(adm.call("adminProposeGroups", { sessionId: sid }))).toBe("failed-precondition:already_revealed");
    await adm.call("adminSaveGroups", { sessionId: sid, groups: [{ label: "Table 1", memberIds: [...all.slice(1, 4), all[4]!] }, { label: "Table 2", memberIds: [all[0]!, ...all.slice(5)] }] });
    const moved = (await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", all[0]).get()).docs[0]!.data();
    expect(moved.groupId).toBe(`${sid}_t2`);
    expect((await db().collection(`users/${all[0]}/notifications`).where("type", "==", "group_revealed").get()).size).toBe(1);
    expect((await db().collection(`users/${all[2]}/notifications`).where("type", "==", "group_revealed").get()).size).toBe(0);
  });

  it("plafond de 50 places par date", async () => {
    const { sessionPlanSchema } = await import("../../packages/shared/src/experience-input");
    expect(sessionPlanSchema.safeParse({ firstDate: "2027-01-10", time: "19:30", weeks: 1, capacity: 51 }).success).toBe(false);
    expect(sessionPlanSchema.safeParse({ firstDate: "2027-01-10", time: "19:30", weeks: 1, capacity: 50 }).success).toBe(true);
  });

  it("plusieurs restaurants pour une date : chaque table reçoit le sien, et un changement après révélation prévient les personnes (Étape G)", async () => {
    const { sid, people } = await dinnerSession(8);
    const adm = await member({ role: "admin" });
    const venues = [{ name: "Maison A", address: "1 rue Alpha, Casablanca", tables: 1 }, { name: "Maison B", address: "2 rue Beta, Casablanca", tables: 1 }];
    expect(await refusal(people[0]!.call("adminSetSessionVenues", { sessionId: sid, venues }))).toBe("permission-denied:");
    expect(await adm.call("adminSetSessionVenues", { sessionId: sid, venues })).toMatchObject({ ok: true, applied: 0, updated: 0 });
    const all = people.map((p) => p.uid);
    await adm.call("adminSaveGroups", { sessionId: sid, groups: [{ label: "Table 1", memberIds: all.slice(0, 4) }, { label: "Table 2", memberIds: all.slice(4) }] });
    await adm.call("adminRevealGroups", { sessionId: sid });
    const venueOf = async (uid: string) => (await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", uid).get()).docs[0]!.data().venue;
    expect(await venueOf(all[0]!)).toMatchObject({ name: "Maison A", address: "1 rue Alpha, Casablanca" });
    expect(await venueOf(all[5]!)).toMatchObject({ name: "Maison B" });
    // Après révélation : la table 2 change de restaurant, seules ses 4 personnes sont prévenues.
    const res = await adm.call("adminSetSessionVenues", { sessionId: sid, venues: [venues[0], { name: "Maison C", address: "3 rue Gamma, Casablanca", tables: 1 }] });
    expect(res).toMatchObject({ updated: 4 });
    expect(await venueOf(all[5]!)).toMatchObject({ name: "Maison C" });
    expect(await venueOf(all[0]!)).toMatchObject({ name: "Maison A" });
    // Noter un lieu, puis en faire le lieu habituel du rendez-vous.
    await adm.call("adminSessionVenueAction", { sessionId: sid, index: 1, action: "rate", rating: "good" });
    expect((await db().doc(`sessions/${sid}/private/venues`).get()).data()!.venues[1]).toMatchObject({ name: "Maison C", rating: "good" });
    expect(await refusal(adm.call("adminSessionVenueAction", { sessionId: sid, index: 4, action: "default" }))).toBe("failed-precondition:venue_missing");
    await adm.call("adminSessionVenueAction", { sessionId: sid, index: 1, action: "default" });
    const expId = (await session(sid)).experienceId as string;
    expect((await db().doc(`experiences/${expId}/private/venue`).get()).data()).toMatchObject({ name: "Maison C", address: "3 rue Gamma, Casablanca" });
    // Le lieu ne fuit jamais dans la fiche publique.
    expect((await db().doc(`experiences/${expId}`).get()).data()!.venue).toMatchObject({ name: "", address: "" });
  });

  it("appliquer aux prochaines dates sans lieu et en faire le lieu habituel", async () => {
    const { sid } = await dinnerSession(0);
    const s = await session(sid);
    const expId = s.experienceId as string;
    const later = db().collection("sessions").doc();
    const filled = db().collection("sessions").doc();
    for (const [ref, days] of [[later, 7], [filled, 14]] as const) {
      await ref.set({ ...s, startAt: Timestamp.fromMillis((s.startAt as Timestamp).toMillis() + days * 86_400_000), seatsConfirmed: 0 });
    }
    await db().doc(`sessions/${filled.id}/private/venues`).set({ venues: [{ name: "Déjà choisi", address: "9 rue Déjà, Casablanca", geo: null, tables: null, rating: null, partnerId: null }] });
    const adm = await member({ role: "admin" });
    const r = await adm.call("adminSetSessionVenues", { sessionId: sid, venues: [{ name: "Maison D", address: "4 rue Delta, Casablanca" }], applyToFuture: true, makeDefault: true });
    expect(r).toMatchObject({ applied: 1 });
    expect((await db().doc(`sessions/${later.id}/private/venues`).get()).data()!.venues[0]).toMatchObject({ name: "Maison D" });
    expect((await db().doc(`sessions/${filled.id}/private/venues`).get()).data()!.venues[0]).toMatchObject({ name: "Déjà choisi" });
    expect((await db().doc(`experiences/${expId}/private/venue`).get()).data()).toMatchObject({ name: "Maison D" });
    expect(await refusal(adm.call("adminSetSessionVenues", { sessionId: sid, venues: [{ partnerId: "inconnu", name: "Maison E", address: "5 rue Epsilon" }] }))).toBe("invalid-argument:");
  });

  it("ajouter des dates à un rendez-vous existant (Étape G)", async () => {
    const sid = await makeSession();
    const expId = (await session(sid)).experienceId as string;
    await db().doc(`experiences/${expId}`).update({ cityId: "casablanca", categoryId: "eat", price: { amount: 3500, currency: "MAD" }, durationMinutes: 120 });
    const adm = await member({ role: "admin" });
    const u = await member();
    const d = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    expect(await refusal(u.call("adminAddSessions", { experienceId: expId, sessions: { firstDate: d, time: "19:30", weeks: 1, capacity: 12 } }))).toBe("permission-denied:");
    expect(await refusal(adm.call("adminAddSessions", { experienceId: expId, sessions: { firstDate: "2020-01-01", time: "19:30", weeks: 1, capacity: 12 } }))).toBe("invalid-argument:");
    expect(await adm.call("adminAddSessions", { experienceId: expId, sessions: { firstDate: d, time: "19:30", weeks: 3, capacity: 12 } })).toEqual({ created: 3 });
    const added = (await db().collection("sessions").where("experienceId", "==", expId).get()).docs.map((x) => x.data()).filter((x) => x.capacity === 12 && x.groupsStatus === "none");
    expect(added).toHaveLength(3);
    expect(added[0]).toMatchObject({ price: { amount: 3500 }, status: "published", seatsConfirmed: 0 });
  });
});

describe("rappels et changements (7)", () => {
  const mailsFor = async (reservationId: string) => (await db().collection("mail").where("refs.reservationId", "==", reservationId).get()).docs.map((d) => d.data());
  const notes = async (uid: string, type: string) => (await db().collection(`users/${uid}/notifications`).where("type", "==", type).get()).size;

  it("la veille puis 3 h avant, une seule fois chacun ; pas d'e-mail si la personne les a coupés", async () => {
    const sid = await makeSession({ startInHours: 20 });
    const u = await member();
    await db().doc(`users/${u.uid}`).set({ email: `rappel.${run}@example.com`, locale: "fr" }, { merge: true });
    const { reservationId } = await paidReservation(u, sid);
    const quiet = await member();
    await db().doc(`users/${quiet.uid}`).set({ email: `calme.${run}@example.com`, notificationPrefs: { email: false } }, { merge: true });
    const other = await paidReservation(quiet, sid);
    await sendDueReminders();
    expect((await reservation(reservationId)).reminders?.d1At).toBeDefined();
    expect((await mailsFor(reservationId)).map((m) => m.kind)).toContain("reminder_d1");
    expect((await mailsFor(other.reservationId)).filter((m) => m.kind.startsWith("reminder"))).toHaveLength(0);
    expect(await notes(quiet.uid, "reminder")).toBe(1);
    await sendDueReminders();
    expect((await mailsFor(reservationId)).filter((m) => m.kind === "reminder_d1")).toHaveLength(1);
    // 3 h avant (on avance l'horloge de 18 h).
    await sendDueReminders(Date.now() + 18 * 3_600_000);
    expect((await mailsFor(reservationId)).filter((m) => m.kind === "reminder_h3")).toHaveLength(1);
    expect(await notes(u.uid, "reminder")).toBe(2);
    await sendDueReminders(Date.now() + 18 * 3_600_000);
    expect(await notes(u.uid, "reminder")).toBe(2);
  });

  it("réservée moins de 3 h avant : un seul rappel", async () => {
    const sid = await makeSession({ startInHours: 2.5 });
    const u = await member();
    await db().doc(`users/${u.uid}`).set({ email: `tard.${run}@example.com` }, { merge: true });
    const { reservationId } = await paidReservation(u, sid);
    await sendDueReminders();
    await sendDueReminders();
    expect((await mailsFor(reservationId)).filter((m) => m.kind.startsWith("reminder")).map((m) => m.kind)).toEqual(["reminder_h3"]);
  });

  it("déplacement par l'équipe : e-mail « nouvelle date »", async () => {
    const from = await makeSession({ startInHours: 96 });
    const expId = (await session(from)).experienceId as string;
    const toRef = db().collection("sessions").doc();
    await toRef.set({ ...(await session(from)), startAt: Timestamp.fromMillis(Date.now() + 200 * 3_600_000), endAt: Timestamp.fromMillis(Date.now() + 202 * 3_600_000), seatsConfirmed: 0, seatsHeld: 0, experienceId: expId });
    const u = await member();
    await db().doc(`users/${u.uid}`).set({ email: `deplace.${run}@example.com` }, { merge: true });
    const { reservationId } = await paidReservation(u, from);
    const adm = await member({ role: "admin" });
    await adm.call("adminMoveReservation", { reservationId, targetSessionId: toRef.id });
    expect((await mailsFor(reservationId)).map((m) => m.kind)).toContain("change_date");
  });
});

describe("archiver / supprimer une expérience (5i)", () => {
  const auditActions = async (targetId: string) => (await db().collection("auditLogs").where("targetId", "==", targetId).get()).docs.map((d) => d.data().action);
  const expOf = async (sessionId: string) => (await session(sessionId)).experienceId as string;

  it("archiver : refusé s'il reste des participants à venir ; sinon masquée, dates vides en brouillon ; réactiver → brouillon", async () => {
    const adm = await member({ role: "admin" });
    const user = await member();
    const sid = await makeSession();
    const id = await expOf(sid);
    expect(await refusal(user.call("adminExperienceAction", { experienceId: id, action: "archive" }))).toBe("permission-denied:");
    await db().doc(`sessions/${sid}`).update({ seatsConfirmed: 2 });
    expect(await refusal(adm.call("adminExperienceAction", { experienceId: id, action: "archive" }))).toBe("failed-precondition:upcoming_participants");
    await db().doc(`sessions/${sid}`).update({ seatsConfirmed: 0, waitlistCount: 1 });
    expect(await refusal(adm.call("adminExperienceAction", { experienceId: id, action: "archive" }))).toBe("failed-precondition:upcoming_participants");
    await db().doc(`sessions/${sid}`).update({ waitlistCount: 0 });
    expect(await adm.call("adminExperienceAction", { experienceId: id, action: "archive" })).toEqual({ ok: true });
    const archived = (await db().doc(`experiences/${id}`).get()).data()!;
    expect(archived).toMatchObject({ status: "archived", archivedBy: adm.uid, nextSessionAt: null });
    expect((await session(sid)).status).toBe("draft");
    expect(await refusal(adm.call("adminExperienceAction", { experienceId: id, action: "archive" }))).toBe("ok"); // idempotent
    await adm.call("adminExperienceAction", { experienceId: id, action: "activate" });
    const back = (await db().doc(`experiences/${id}`).get()).data()!;
    expect(back.status).toBe("draft");
    expect(back.archivedAt).toBeUndefined();
    expect(await refusal(adm.call("adminExperienceAction", { experienceId: id, action: "activate" }))).toBe("failed-precondition:not_archived");
    expect(await auditActions(id)).toEqual(expect.arrayContaining(["experience.archive", "experience.activate"]));
  });

  it("archiver : refusé tant qu'une demande de participation est en attente", async () => {
    const adm = await member({ role: "admin" });
    const sid = await makeSession({ onRequest: true });
    const id = await expOf(sid);
    await db().doc(`bookingRequests/${sid}_x${run}`).set({ sessionId: sid, experienceId: id, userId: `x${run}`, status: "pending", seats: 1 });
    expect(await refusal(adm.call("adminExperienceAction", { experienceId: id, action: "archive" }))).toBe("failed-precondition:pending_requests");
    await db().doc(`bookingRequests/${sid}_x${run}`).update({ status: "declined" });
    expect(await adm.call("adminExperienceAction", { experienceId: id, action: "archive" })).toEqual({ ok: true });
  });

  it("supprimer : super-admin seulement, jamais une expérience qui a eu des participants ; sinon tout est supprimé", async () => {
    const adm = await member({ role: "admin" });
    const sup = await member({ role: "superadmin" });
    const used = await makeSession();
    const usedId = await expOf(used);
    await db().collection("reservations").add({ experienceId: usedId, sessionId: used, userId: "someone", status: "cancelled_by_member" });
    expect(await refusal(adm.call("adminExperienceAction", { experienceId: usedId, action: "delete" }))).toBe("permission-denied:superadmin_only");
    expect(await refusal(sup.call("adminExperienceAction", { experienceId: usedId, action: "delete" }))).toBe("failed-precondition:has_history");
    expect((await db().doc(`experiences/${usedId}`).get()).exists).toBe(true);

    const fresh = await makeSession();
    const freshId = await expOf(fresh);
    await db().doc(`experiences/${freshId}/private/economics`).set({ model: "own", costPerSeat: 10000 });
    await db().doc(`experienceAlerts/${freshId}_u${run}`).set({ experienceId: freshId, uid: `u${run}` });
    expect(await sup.call("adminExperienceAction", { experienceId: freshId, action: "delete" })).toEqual({ ok: true });
    expect((await db().doc(`experiences/${freshId}`).get()).exists).toBe(false);
    expect((await db().doc(`experiences/${freshId}/private/economics`).get()).exists).toBe(false);
    expect((await db().doc(`sessions/${fresh}`).get()).exists).toBe(false);
    expect((await db().doc(`experienceAlerts/${freshId}_u${run}`).get()).exists).toBe(false);
    expect(await auditActions(freshId)).toContain("experience.delete");
  });
});

describe("tarification en deux parts (11)", () => {
  const fixed = { model: "fixed_partner", currency: "MAD", partner: { name: "Escape Room Maarif", paymentMode: "on_site", pricingType: "fixed", price: { amount: 20000, currency: "MAD" }, description: "La partie" } };
  const variable = { model: "variable_consumption", currency: "MAD", partner: { name: "Café Gauthier", paymentMode: "on_site", pricingType: "consumption", price: null, description: "" } };
  const withPricing = async (sid: string, pricing: unknown) => db().doc(`experiences/${(await session(sid)).experienceId}`).update({ pricing });

  it("prix fixe : seule la part organisation est payée en ligne ; la part partenaire est copiée dans la réservation", async () => {
    const u = await member();
    const sid = await makeSession({ price: 25000, maxSeats: 2 });
    await withPricing(sid, fixed);
    const { reservationId } = await paidReservation(u, sid, 2);
    const r = await reservation(reservationId);
    expect(r.pricing.total).toBe(50000); // 2 × 250 DH en ligne, jamais les 2 × 200 DH du partenaire
    expect(r.onSiteAmount).toBe(40000);
    expect(r.partnerPaymentStatus).toBe("due_on_site");
    expect(r.partnerSnapshot).toMatchObject({ model: "fixed_partner", name: "Escape Room Maarif", price: { amount: 20000 } });
    // Modifier ensuite le prix partenaire ne change pas la réservation (copie figée).
    await withPricing(sid, { ...fixed, partner: { ...fixed.partner, price: { amount: 30000, currency: "MAD" } } });
    expect((await reservation(reservationId)).onSiteAmount).toBe(40000);
  });

  it("consommation libre : aucun montant sur place inventé (null) ; tout en ligne : sans objet", async () => {
    const u = await member();
    const sid = await makeSession({ price: 15000 });
    await withPricing(sid, variable);
    const { reservationId } = await paidReservation(u, sid);
    const r = await reservation(reservationId);
    expect(r.pricing.total).toBe(15000);
    expect(r.onSiteAmount).toBeNull();
    expect(r.partnerSnapshot).toMatchObject({ model: "variable_consumption", price: null });
    const old = await makeSession({ price: 16900 });
    const { reservationId: oldId } = await paidReservation(await member(), old);
    const o = await reservation(oldId);
    expect(o.partnerSnapshot).toBeNull();
    expect(o.onSiteAmount).toBeNull();
    expect(o.partnerPaymentStatus).toBe("not_applicable");
  });

  it("abonnement et code promo ne réduisent que la part organisation, jamais la part sur place", async () => {
    const team = await member({ role: "admin" });
    const code = `DEUX${run}`.toUpperCase().slice(0, 20);
    await team.call("adminSavePromo", { create: true, data: { code, type: "percent", value: 20, validFrom: "", validTo: "2099-12-31", maxRedemptions: 5, firstBookingOnly: false, isActive: true, description: "" } });
    const u = await member();
    await team.call("adminGrantMembership", { uid: u.uid, days: 90, reason: "test 11" });
    const sid = await makeSession({ price: 25000, memberPrice: 20000 });
    await withPricing(sid, fixed);
    const { pricing } = (await u.call("previewPricing", { sessionId: sid, seats: 1, promoCode: code })) as { pricing: { subtotal: number; memberDiscount: number; discount: number; total: number } };
    expect(pricing.subtotal).toBe(25000);
    expect(pricing.memberDiscount).toBe(3500); // docs/22 § 17.I : le pass couvre la place, au plus le prix Wenzy (35 DH)
    expect(pricing.discount).toBe(4300); // 20 % des 215 DH restants en ligne, jamais de la part du partenaire
    const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1, promoCode: code });
    const r = await reservation(reservationId as string);
    expect(r.pricing.total).toBe(17200 + (r.pricing.fees ?? 0));
    expect(r.onSiteAmount).toBe(20000); // la part sur place reste entière
  });

  it("part partenaire marquée réglée par l'équipe (jamais pour « tout en ligne »)", async () => {
    const team = await member({ role: "admin" });
    const sid = await makeSession({ price: 25000 });
    await withPricing(sid, fixed);
    const { reservationId } = await paidReservation(await member(), sid);
    expect(await refusal((await member()).call("adminSetPartnerPayment", { reservationId, paid: true }))).toBe("permission-denied:");
    await team.call("adminSetPartnerPayment", { reservationId, paid: true });
    expect((await reservation(reservationId)).partnerPaymentStatus).toBe("paid_on_site");
    await team.call("adminSetPartnerPayment", { reservationId, paid: false });
    expect((await reservation(reservationId)).partnerPaymentStatus).toBe("due_on_site");
    const plain = await makeSession({ price: 16900 });
    const { reservationId: p2 } = await paidReservation(await member(), plain);
    expect(await refusal(team.call("adminSetPartnerPayment", { reservationId: p2, paid: true }))).toBe("failed-precondition:not_applicable");
  });
});

describe("virement bancaire (5h)", () => {
  const BANK = { holder: "Wenzy (fictif)", bank: "Banque d'essai", rib: "000111000000000000000099", iban: "", swift: "", deadlineHours: 48, cutoffHours: 24 };
  const useTransfer = async () => {
    await db().doc("settings/bankTransfer").set(BANK);
    await db().doc("settings/payment").set({ provider: "bank_transfer", mode: "live" });
  };
  const useSandbox = () => db().doc("settings/payment").set({ provider: "sandbox", mode: "test" });
  const mails = async (field: string, value: string) => (await db().collection("mail").where(field, "==", value).get()).docs.map((d) => d.data());

  it("référence unique, place bloquée 48 h, e-mail d'instructions ; validation par l'équipe → confirmée et facturée", async () => {
    await useTransfer();
    try {
      const sid = await makeSession({ startInHours: 240 });
      const u = await member();
      const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
      const t0 = Date.now();
      const out = (await u.call("startCheckout", { reservationId })) as { paymentId: string; redirectUrl: string };
      expect(out.redirectUrl).toBe(`/paiement/virement/${out.paymentId}`);
      const p = await payment(out.paymentId);
      expect(p).toMatchObject({ provider: "bank_transfer", status: "initiated", type: "payment" });
      expect(p.reference).toMatch(/^THC-[2-9A-Z]{6}$/);
      expect((await db().doc(`transferRefs/${p.reference}`).get()).data()?.paymentId).toBe(out.paymentId);
      const r = await reservation(reservationId as string);
      expect(r).toMatchObject({ status: "pending_payment", paymentMethod: "bank_transfer", transferReference: p.reference });
      expect(Math.abs((r.holdExpiresAt as Timestamp).toMillis() - (t0 + 48 * 3_600_000))).toBeLessThan(60_000);
      expect((await mails("refs.paymentId", out.paymentId)).map((m) => m.kind)).toContain("transfer_instructions");
      // Deuxième essai : même virement, même référence.
      expect(((await u.call("startCheckout", { reservationId })) as { paymentId: string }).paymentId).toBe(out.paymentId);
      // Le membre ne peut ni simuler un paiement ni se valider lui-même.
      expect(await refusal(u.call("sandboxCompletePayment", { paymentId: out.paymentId, outcome: "succeeded" }))).toBe("permission-denied:sandbox_disabled");
      expect(await refusal(u.call("adminConfirmTransfer", { paymentId: out.paymentId }))).toBe("permission-denied:");
      const team = await member({ role: "admin" });
      expect(await team.call("adminConfirmTransfer", { paymentId: out.paymentId })).toMatchObject({ outcome: "confirmed", reservationId });
      expect(await reservation(reservationId as string)).toMatchObject({ status: "confirmed", paymentId: out.paymentId });
      expect(await payment(out.paymentId)).toMatchObject({ status: "succeeded", receivedBy: team.uid });
      expect(await session(sid)).toMatchObject({ seatsConfirmed: 1, seatsHeld: 0 });
      expect((await db().doc(`invoices/inv_${out.paymentId}`).get()).exists).toBe(true);
      expect(await refusal(team.call("adminConfirmTransfer", { paymentId: out.paymentId }))).toBe("failed-precondition:already_processed");
    } finally {
      await useSandbox();
    }
  });

  it("date trop proche : virement refusé ; échéance au plus tard 24 h avant l'expérience", async () => {
    await useTransfer();
    try {
      const u = await member();
      const near = await makeSession({ startInHours: 27 });
      const { reservationId } = await u.call("createReservation", { sessionId: near, seats: 1 });
      expect(await refusal(u.call("startCheckout", { reservationId }))).toBe("failed-precondition:transfer_too_late");
      const mid = await makeSession({ startInHours: 40 });
      const v = await member();
      const { reservationId: rid } = await v.call("createReservation", { sessionId: mid, seats: 1 });
      await v.call("startCheckout", { reservationId: rid });
      const start = ((await session(mid)).startAt as Timestamp).toMillis();
      expect((await reservation(rid as string)).holdExpiresAt.toMillis()).toBe(start - 24 * 3_600_000);
    } finally {
      await useSandbox();
    }
  });

  it("virement non reçu : place libérée et personne prévenue ; virement tardif reçu → place reprise si disponible", async () => {
    await useTransfer();
    try {
      const sid = await makeSession({ startInHours: 240 });
      const u = await member();
      const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
      const { paymentId } = (await u.call("startCheckout", { reservationId })) as { paymentId: string };
      await expireHold(reservationId as string);
      expect(await expireDueHolds()).toBeGreaterThanOrEqual(1);
      expect((await reservation(reservationId as string)).status).toBe("expired");
      expect((await mails("refs.reservationId", reservationId as string)).map((m) => m.kind)).toContain("transfer_expired");
      const team = await member({ role: "admin" });
      expect(await team.call("adminConfirmTransfer", { paymentId })).toMatchObject({ outcome: "confirmed" });
      expect(await reservation(reservationId as string)).toMatchObject({ status: "confirmed", latePayment: true });
    } finally {
      await useSandbox();
    }
  });

  it("remboursement d'un virement : « en cours » jusqu'à ce que l'équipe le marque effectué → avoir", async () => {
    await useTransfer();
    try {
      const sid = await makeSession({ startInHours: 240 });
      const u = await member();
      const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
      const { paymentId } = (await u.call("startCheckout", { reservationId })) as { paymentId: string };
      const team = await member({ role: "admin" });
      await team.call("adminConfirmTransfer", { paymentId });
      expect(await u.call("cancelReservation", { reservationId })).toMatchObject({ ok: true, refundStatus: "pending" });
      const refund = (await db().collection("payments").where("parentPaymentId", "==", paymentId).get()).docs[0]!;
      expect(refund.data()).toMatchObject({ type: "refund", provider: "bank_transfer", status: "initiated" });
      expect((await payment(paymentId)).status).toBe("succeeded");
      expect(await refusal(u.call("adminCompleteManualRefund", { refundId: refund.id }))).toBe("permission-denied:");
      await team.call("adminCompleteManualRefund", { refundId: refund.id });
      expect((await payment(refund.id)).status).toBe("succeeded");
      expect((await payment(paymentId)).status).toBe("refunded");
      expect((await db().collection("invoices").where("kind", "==", "credit_note").where("paymentId", "==", refund.id).get()).size).toBe(1);
      expect(await refusal(team.call("adminCompleteManualRefund", { refundId: refund.id }))).toBe("failed-precondition:already_processed");
    } finally {
      await useSandbox();
    }
  });

  it("rappel 12 h avant l'échéance, une seule fois ; rien si la réservation est déjà payée (B)", async () => {
    await useTransfer();
    try {
      const sid = await makeSession({ startInHours: 240 });
      const u = await member();
      const { reservationId } = await u.call("createReservation", { sessionId: sid, seats: 1 });
      const { paymentId } = (await u.call("startCheckout", { reservationId })) as { paymentId: string };
      const H = 3_600_000;
      await db().doc(`payments/${paymentId}`).update({ transferDeadline: Timestamp.fromMillis(Date.now() + 6 * H), createdAt: Timestamp.fromMillis(Date.now() - 40 * H) });
      expect(await sendTransferReminders()).toBeGreaterThanOrEqual(1);
      expect((await payment(paymentId)).reminderSentAt).toBeDefined();
      expect((await mails("refs.paymentId", paymentId)).map((m) => m.kind)).toContain("transfer_reminder");
      const before = (await mails("refs.paymentId", paymentId)).length;
      await sendTransferReminders();
      expect((await mails("refs.paymentId", paymentId)).length).toBe(before); // jamais deux rappels
      // Virement reçu entre-temps : aucun rappel.
      const v = await member();
      const sid2 = await makeSession({ startInHours: 240 });
      const { reservationId: r2 } = await v.call("createReservation", { sessionId: sid2, seats: 1 });
      const { paymentId: p2 } = (await v.call("startCheckout", { reservationId: r2 })) as { paymentId: string };
      await (await member({ role: "admin" })).call("adminConfirmTransfer", { paymentId: p2 });
      await db().doc(`payments/${p2}`).update({ transferDeadline: Timestamp.fromMillis(Date.now() + 6 * H), createdAt: Timestamp.fromMillis(Date.now() - 40 * H) });
      await sendTransferReminders();
      expect((await mails("refs.paymentId", p2)).map((m) => m.kind)).not.toContain("transfer_reminder");
    } finally {
      await useSandbox();
    }
  });

  it("réglage du paiement : super-admin seulement, RIB de 24 chiffres exigé pour activer le virement", async () => {
    try {
      const adm = await member({ role: "admin" });
      const sup = await member({ role: "superadmin" });
      expect(await refusal(adm.call("adminSavePaymentSettings", { method: "sandbox" }))).toBe("permission-denied:");
      expect((await refusal(sup.call("adminSavePaymentSettings", { method: "bank_transfer" }))).startsWith("invalid-argument")).toBe(true);
      expect((await refusal(sup.call("adminSavePaymentSettings", { method: "bank_transfer", bank: { ...BANK, rib: "1234" } }))).startsWith("invalid-argument")).toBe(true);
      await sup.call("adminSavePaymentSettings", { method: "bank_transfer", bank: { ...BANK, rib: "000 111 0000000000000000 99" } });
      expect((await db().doc("settings/payment").get()).data()).toMatchObject({ provider: "bank_transfer", mode: "live" });
      expect((await db().doc("settings/bankTransfer").get()).data()).toMatchObject({ rib: "000111000000000000000099" });
      await sup.call("adminSavePaymentSettings", { method: "sandbox" });
      expect((await db().doc("settings/payment").get()).data()).toMatchObject({ provider: "sandbox", mode: "test" });
    } finally {
      await useSandbox();
    }
  });
});

describe("effacement du régime et des allergies (A)", () => {
  it("30 jours après l'expérience, régime et allergies sont effacés ; les réservations récentes les gardent", async () => {
    const prefs = { diet: "vegetarian", allergies: "arachides", languages: ["fr"], shareWithVenue: true };
    const day = 86_400_000;
    const old = await db().collection("reservations").add({ userId: "u-purge", status: "attended", preferences: prefs, sessionSnapshot: { startAt: Timestamp.fromMillis(Date.now() - 31 * day) } });
    const recent = await db().collection("reservations").add({ userId: "u-purge", status: "confirmed", preferences: prefs, sessionSnapshot: { startAt: Timestamp.fromMillis(Date.now() - 10 * day) } });
    const req = await db().collection("bookingRequests").add({ userId: "u-purge", status: "declined", preferences: prefs, sessionSnapshot: { startAt: Timestamp.fromMillis(Date.now() - 40 * day) } });
    expect(await purgeExpiredPreferences()).toBeGreaterThanOrEqual(2);
    const o = (await old.get()).data()!;
    expect(o.preferences).toBeUndefined();
    expect(o.preferencesPurgedAt).toBeDefined();
    expect(o.status).toBe("attended");
    expect((await recent.get()).data()!.preferences).toMatchObject({ allergies: "arachides" });
    expect((await req.get()).data()!.preferences).toBeUndefined();
  });
});

describe("formulaires publics passés par le serveur (D)", () => {
  it("contact : format vérifié, piège à robots silencieux, 5 envois par heure au plus", async () => {
    const u = await member();
    const msg = { name: "Rita", email: "rita@example.com", message: "Bonjour, une question sur les dîners." };
    expect(await refusal(u.call("submitContactMessage", { ...msg, email: "pas-un-email" }))).toBe("invalid-argument:");
    const before = (await db().collection("contactMessages").where("email", "==", "robot@example.com").get()).size;
    expect(await u.call("submitContactMessage", { ...msg, email: "robot@example.com", website: "http://spam.example" })).toEqual({ ok: true });
    expect((await db().collection("contactMessages").where("email", "==", "robot@example.com").get()).size).toBe(before); // rien écrit
    for (let i = 0; i < 5; i++) expect(await u.call("submitContactMessage", msg)).toEqual({ ok: true });
    expect(await refusal(u.call("submitContactMessage", msg))).toBe("resource-exhausted:rate_limited");
    const saved = (await db().collection("contactMessages").where("email", "==", "rita@example.com").get()).docs[0]!.data();
    expect(Object.keys(saved).sort()).toEqual(["createdAt", "email", "message", "name"]); // même format qu'avant, aucune adresse IP
  });

  it("candidature partenaire : format vérifié et enregistrée par le serveur", async () => {
    const u = await member();
    const app = { contactName: "Yasmine", businessName: "Studio Lumière", type: "studio", city: "Casablanca", email: "contact@studio.ma", phone: "", link: "", message: "Nous proposons des cours de yoga en petit groupe à Maarif.", locale: "fr" };
    expect(await refusal(u.call("submitPartnerApplication", { ...app, type: "casino" }))).toBe("invalid-argument:");
    expect(await u.call("submitPartnerApplication", app)).toEqual({ ok: true });
    expect((await db().collection("partnerApplications").where("businessName", "==", "Studio Lumière").get()).size).toBeGreaterThanOrEqual(1);
  });
});

describe("sauvegardes et bilan de santé (E)", () => {
  it("sauvegardes : seules celles de plus de 14 jours sont supprimées", () => {
    const now = new Date("2026-11-20T03:00:00Z");
    expect(expiredBackupFolders(["2026-11-19", "2026-11-07", "2026-11-06", "2026-10-01", "autre"], now)).toEqual(["2026-11-06", "2026-10-01"]);
  });

  it("bilan quotidien : sauvegarde échouée et e-mails en échec signalés aux super-admins", async () => {
    const sup = await member({ role: "superadmin" });
    await db().doc(`users/${sup.uid}`).set({ email: `sante.${run}@example.com` }, { merge: true });
    await db().doc("settings/health").set({ backup: { status: "failed", at: Timestamp.now(), error: "permission denied" } }, { merge: true });
    await db().collection("mail").add({ to: "x@example.com", status: "failed", kind: "reminder_d1", createdAt: Timestamp.now() });
    const issues = await runHealthCheck();
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["backup_failed", "mail_failures"]));
    const health = (await db().doc("settings/health").get()).data()!;
    expect(health.issues.length).toBeGreaterThanOrEqual(2);
    const alerts = (await db().collection("mail").where("kind", "==", "health_alert").where("to", "==", `sante.${run}@example.com`).get()).docs;
    expect(alerts.length).toBe(1);
    expect(alerts[0]!.data().text).toContain("La sauvegarde de la nuit a échoué");
    await db().doc("settings/health").set({ backup: { status: "ok", at: Timestamp.now(), error: null } }, { merge: true });
  });
});

describe("toutes les activités (18)", () => {
  const padel = QUESTIONNAIRE_TEMPLATES.find((t) => t.id === "padel")!.questions;
  // Étape 19 : une proposition doit viser une catégorie principale existante.
  beforeAll(async () => {
    await db().doc("categories/move").set({ isActive: true }, { merge: true });
    await db().doc("categories/play").set({ isActive: true }, { merge: true });
  });
  const born = (age: number) => `${new Date().getUTCFullYear() - age - 1}-01-15`;

  it("âge minimum vérifié par le serveur (réservation et demande)", async () => {
    const sessionId = await makeSession({ price: 0, extra: { minAge: 21 } });
    const young = await member();
    await db().doc(`users/${young.uid}`).set({ birthDate: born(19) }, { merge: true });
    expect(await refusal(young.call("createReservation", { sessionId, seats: 1 }))).toBe("failed-precondition:too_young");
    const older = await member();
    await db().doc(`users/${older.uid}`).set({ birthDate: born(25) }, { merge: true });
    expect(await older.call("createReservation", { sessionId, seats: 1 })).toMatchObject({ status: "confirmed" });
    const req = await makeSession({ onRequest: true, extra: { minAge: 21 } });
    expect(await refusal(young.call("requestBooking", { sessionId: req, seats: 1 }))).toBe("failed-precondition:too_young");
  });

  it("activité physique : conditions de participation obligatoires, version et date enregistrées", async () => {
    const sessionId = await makeSession({ price: 0, extra: { physicalActivity: true } });
    const u = await member();
    expect(await refusal(u.call("createReservation", { sessionId, seats: 1 }))).toBe("failed-precondition:physical_terms_required");
    const { reservationId } = await u.call("createReservation", { sessionId, seats: 1, physicalTermsAccepted: true });
    const r = await reservation(String(reservationId));
    expect(r.physicalTerms.version).toBe("2026-11-19");
    expect(r.physicalTerms.acceptedAt).toBeInstanceOf(Timestamp);
    // Sur demande : acceptées avec la demande, recopiées sur la réservation à l'acceptation.
    const req = await makeSession({ onRequest: true, price: 0, extra: { physicalActivity: true } });
    const v = await member();
    expect(await refusal(v.call("requestBooking", { sessionId: req, seats: 1 }))).toBe("failed-precondition:physical_terms_required");
    const { requestId } = await v.call("requestBooking", { sessionId: req, seats: 1, physicalTermsAccepted: true });
    const team = await member({ role: "admin" });
    const { reservationId: rid } = await team.call("adminDecideRequest", { requestId, decision: "accept" });
    expect((await reservation(String(rid))).physicalTerms.version).toBe("2026-11-19");
  });

  it("questionnaire : rempli avant le paiement, réponses vérifiées, groupes padel par niveau", async () => {
    const sessionId = await makeSession({ price: 0, mode: "group", capacity: 8, maxSeats: 1, extra: { questionnaire: padel, groupConfig: { minSize: 4, targetSize: 4, maxSize: 4 } } });
    const players = await Promise.all(Array.from({ length: 8 }, () => member()));
    // docs/22 : sans réponse, ou avec une réponse obligatoire manquante, la réservation est refusée.
    expect(await refusal(players[0]!.call("createReservation", { sessionId, seats: 1 }))).toBe("failed-precondition:questionnaire_required");
    expect(await refusal(players[0]!.call("createReservation", { sessionId, seats: 1, answers: { qlevel: 0 } }))).toBe("failed-precondition:questionnaire_required");
    expect(await refusal(players[0]!.call("createReservation", { sessionId, seats: 1, answers: { qlevel: 5, qgoal: 0 } }))).toBe("failed-precondition:questionnaire_required");
    const levels = [0, 2, 0, 2, 0, 2, 0, 2];
    const ids: string[] = [];
    for (const [i, p] of players.entries()) ids.push(String((await p.call("createReservation", { sessionId, seats: 1, answers: { qlevel: levels[i], qgoal: 0 } })).reservationId));
    expect((await reservation(ids[1]!)).questionnaire.answers).toEqual({ qlevel: 2, qgoal: 0 });
    // Déjà répondu : pas d'invitation à remplir le questionnaire après coup.
    expect((await db().collection(`users/${players[0]!.uid}/notifications`).where("type", "==", "questionnaire").get()).size).toBe(0);
    // Modification ensuite : réponses invalides et réservation d'autrui refusées.
    expect(await refusal(players[0]!.call("submitQuestionnaire", { reservationId: ids[0], answers: { qlevel: 0 } }))).toBe("invalid-argument:");
    expect(await refusal(players[1]!.call("submitQuestionnaire", { reservationId: ids[0], answers: { qlevel: 0, qgoal: 0 } }))).toBe("not-found:not_found");
    const team = await member({ role: "admin" });
    expect(await team.call("adminProposeGroups", { sessionId })).toEqual({ groups: 2 });
    const groups = (await db().collection("groups").where("sessionId", "==", sessionId).get()).docs.map((d) => d.data().memberIds as string[]);
    const levelOf = new Map(players.map((p, i) => [p.uid, levels[i]]));
    for (const g of groups) expect(new Set(g.map((u) => levelOf.get(u))).size).toBe(1);
    // Réponse modifiée après la proposition : groupes à revoir.
    expect(await players[0]!.call("submitQuestionnaire", { reservationId: ids[0], answers: { qlevel: 1, qgoal: 1 } })).toEqual({ ok: true });
    expect((await session(sessionId)).groupsNeedReview).toBe(true);
  });

  it("questionnaire effacé 30 jours après l'expérience", async () => {
    const sessionId = await makeSession({ price: 0, extra: { questionnaire: padel } });
    const u = await member();
    const { reservationId } = await u.call("createReservation", { sessionId, seats: 1, answers: { qlevel: 1, qgoal: 2 } });
    await db().doc(`reservations/${reservationId}`).update({ "sessionSnapshot.startAt": Timestamp.fromMillis(Date.now() - 31 * 86_400_000) });
    await purgeExpiredPreferences();
    const r = await reservation(String(reservationId));
    expect(r.questionnaire).toBeUndefined();
    expect(r.questionnairePurgedAt).toBeInstanceOf(Timestamp);
  });

  it("prix Wenzy : réglé par le super-admin, appliqué aux événements Wenzy payants et à leurs dates à venir (docs/22)", async () => {
    const sid = await makeSession({ price: 14900, extra: { price: { amount: 14900, currency: "MAD" } } });
    const freeSid = await makeSession({ price: 0, extra: { price: { amount: 0, currency: "MAD" } } });
    const orgSid = await makeSession({ price: 20000, extra: { price: { amount: 20000, currency: "MAD" }, organizerId: "org-test-prix" } });
    const adm = await member({ role: "admin" });
    expect(await refusal(adm.call("adminSaveWenzyPrice", { priceDh: 35 }))).toBe("permission-denied:");
    const sup = await member({ role: "superadmin" });
    expect((await sup.call("adminSaveWenzyPrice", { priceDh: 35 })).wenzyPrice).toBe(3500);
    const expOf = async (id: string) => (await db().doc(`experiences/${(await session(id)).experienceId}`).get()).data()!;
    expect((await session(sid)).price.amount).toBe(3500);
    expect((await expOf(sid)).price.amount).toBe(3500);
    expect((await session(freeSid)).price.amount).toBe(0);
    expect((await session(orgSid)).price.amount).toBe(20000);
    expect((await db().doc("settings/booking").get()).data()).toMatchObject({ wenzyPrice: 3500, serviceFee: { mode: "none" } });
    // Une nouvelle réservation paie le nouveau prix, sans frais en plus.
    const u = await member();
    expect((await u.call("createReservation", { sessionId: sid, seats: 2 })).total).toBe(7000);
  });

  it("modèles : enregistrés par l'équipe seulement ; accès anticipé réglé par événement (docs/22, étape F)", async () => {
    const doc = { ...DEFAULT_EVENT_TEMPLATES.find((t) => t.id === "cafe")!, builtIn: undefined };
    const user = await member();
    expect(await refusal(user.call("adminSaveTemplate", JSON.parse(JSON.stringify({ ...doc, name: "Café du samedi" }))))).toBe("permission-denied:");
    const adm = await member({ role: "admin" });
    expect(await adm.call("adminSaveTemplate", JSON.parse(JSON.stringify({ ...doc, name: "Café du samedi" })))).toEqual({ id: "cafe" });
    expect((await db().doc("eventTemplates/cafe").get()).data()).toMatchObject({ name: "Café du samedi", isActive: true, values: { titleFr: "Café" } });
    expect((await refusal(adm.call("adminSaveTemplate", { ...JSON.parse(JSON.stringify(doc)), image: "../secret.png" }))).startsWith("invalid-argument")).toBe(true);
    expect(await adm.call("adminDeleteTemplate", { id: "cafe" })).toEqual({ ok: true });
    expect((await db().doc("eventTemplates/cafe").get()).exists).toBe(false);
    // Abonnés d'abord pendant 2 jours : un non-abonné attend ; après 2 jours, il réserve.
    const fresh = await makeSession({ price: 0, createdHoursAgo: 1, extra: { earlyAccessDays: 2 } });
    const old = await makeSession({ price: 0, createdHoursAgo: 49, extra: { earlyAccessDays: 2 } });
    const open = await makeSession({ price: 0, createdHoursAgo: 1, extra: { earlyAccessDays: 0 } });
    const u = await member();
    expect(await refusal(u.call("createReservation", { sessionId: fresh, seats: 1 }))).toBe("failed-precondition:members_early_access");
    expect((await u.call("createReservation", { sessionId: old, seats: 1 })).status).toBe("confirmed");
    expect((await u.call("createReservation", { sessionId: open, seats: 1 })).status).toBe("confirmed");
  });

  it("membres de confiance : statut donné par l'équipe, proposition, refus avec message, limite par jour", async () => {
    const u = await member();
    await db().doc(`users/${u.uid}`).set({ firstName: "Yasmine", cityId: "casablanca" }, { merge: true });
    const proposal = { title: "Padel du samedi matin", categoryId: "move", description: "Deux terrains de padel, tous niveaux, puis un café ensemble au club.", district: "Anfa", datesIdea: "Samedis matin de décembre", capacity: 8 };
    expect(await refusal(u.call("submitOutingProposal", proposal))).toBe("failed-precondition:not_trusted");
    expect(await refusal(u.call("adminSetTrustedHost", { uid: u.uid, trusted: true }))).toBe("permission-denied:");
    const team = await member({ role: "admin" });
    expect(await team.call("adminSetTrustedHost", { uid: u.uid, trusted: true })).toEqual({ ok: true, trusted: true });
    expect(await refusal(u.call("submitOutingProposal", { ...proposal, capacity: 500 }))).toBe("invalid-argument:");
    const { proposalId } = await u.call("submitOutingProposal", proposal);
    const p = (await db().doc(`outingProposals/${proposalId}`).get()).data()!;
    expect(p).toMatchObject({ userId: u.uid, firstName: "Yasmine", status: "pending", capacity: 8 });
    expect(await refusal(u.call("adminDecideProposal", { proposalId, decision: "declined", message: "Pas cette fois." }))).toBe("permission-denied:");
    expect(await team.call("adminDecideProposal", { proposalId, decision: "declined", message: "Le club n'est pas disponible en décembre." })).toEqual({ ok: true });
    expect((await db().doc(`outingProposals/${proposalId}`).get()).data()!.status).toBe("declined");
    const note = (await db().collection(`users/${u.uid}/notifications`).where("type", "==", "proposal_declined").get()).docs[0]!.data();
    expect(note.body.fr).toContain("Le club n'est pas disponible en décembre.");
    expect(await refusal(team.call("adminDecideProposal", { proposalId, decision: "declined", message: "Encore non." }))).toBe("failed-precondition:proposal_not_pending");
    await u.call("submitOutingProposal", proposal);
    await u.call("submitOutingProposal", proposal);
    expect(await refusal(u.call("submitOutingProposal", proposal))).toBe("failed-precondition:too_many_proposals");
    await team.call("adminSetTrustedHost", { uid: u.uid, trusted: false });
    expect(await refusal(u.call("submitOutingProposal", proposal))).toBe("failed-precondition:not_trusted");
  });

  it("proposition retenue : l'expérience créée par l'équipe la lie, le membre est prévenu", async () => {
    const u = await member();
    await db().doc(`users/${u.uid}`).set({ firstName: "Karim", trustedHost: true }, { merge: true });
    const { proposalId } = await u.call("submitOutingProposal", { title: "Paintball entre inconnus", categoryId: "play", description: "Deux équipes mélangées au hasard, puis un goûter tous ensemble.", district: "Bouskoura", datesIdea: "Un dimanche après-midi", capacity: 16 });
    const team = await member({ role: "admin" });
    await db().doc("categories/play").set({ isActive: true }, { merge: true });
    const data = {
      titleFr: "Paintball entre inconnus", summaryFr: "Deux équipes mélangées, puis un goûter tous ensemble.", descriptionFr: "Une après-midi de paintball en équipes composées par nous, tous niveaux.",
      categoryId: "play", cityId: "casablanca", district: "Bouskoura", venueName: "Terrain partenaire", address: "Route de Bouskoura, Casablanca", revealPolicy: "immediate",
      bookingMode: "group", groupMin: 6, groupTarget: 8, groupMax: 8, maxSeatsPerBooking: 1, priceDh: 250, durationMinutes: 180, languages: ["fr", "darija"], alcoholServed: false,
      cancellationPolicyId: "standard-48h", partnerId: "", economicsModel: "own", costPerSeatDh: 150, status: "draft",
      sessions: { firstDate: "2027-01-10", time: "14:00", weeks: 1, capacity: 16 },
      physicalActivity: true, minAge: 18, outdoor: true, level: "all", whatToBring: "Baskets fermées", questionnaire: QUESTIONNAIRE_TEMPLATES.find((t) => t.id === "paintball")!.questions, proposalId,
    };
    const { experienceId } = await team.call("adminSaveExperience", { data, addSessions: false, images: [] });
    const e = (await db().doc(`experiences/${experienceId}`).get()).data()!;
    expect(e).toMatchObject({ physicalActivity: true, outdoor: true, level: "all", whatToBring: "Baskets fermées", proposedBy: { uid: u.uid, firstName: "Karim" } });
    expect(e.questionnaire).toHaveLength(2);
    expect((await db().doc(`outingProposals/${proposalId}`).get()).data()).toMatchObject({ status: "accepted", experienceId });
    expect((await db().collection(`users/${u.uid}/notifications`).where("type", "==", "proposal_published").get()).size).toBe(1);
    // Une proposition déjà utilisée ne peut pas servir à une autre expérience.
    expect(await refusal(team.call("adminSaveExperience", { data, addSessions: false, images: [] }))).toBe("invalid-argument:");
  });

  it("bilan de santé : activité physique chez un lieu sans assurance vérifiée", async () => {
    const partner = await db().collection("partners").add({ name: "Club sans attestation", status: "active" });
    const insured = await db().collection("partners").add({ name: "Club assuré", status: "active", insurance: { verified: true, expiresOn: "2099-12-31" } });
    const mk = async (title: string, partnerId: string) => {
      const e = await db().collection("experiences").add({ title: { fr: title }, status: "published", physicalActivity: true });
      await db().doc(`experiences/${e.id}/private/economics`).set({ partnerId });
    };
    await mk(`Padel non assuré ${run}`, partner.id);
    await mk(`Padel assuré ${run}`, insured.id);
    const list = await uninsuredPhysicalExperiences();
    expect(list).toContain(`Padel non assuré ${run}`);
    expect(list).not.toContain(`Padel assuré ${run}`);
    const issues = await runHealthCheck();
    expect(issues.map((i) => i.code)).toContain("partner_insurance");
  });
});

describe("organisateurs (20)", () => {
  let team: Client;
  let pro: Client;
  let other: Client;
  let orgId = "";
  let otherOrgId = "";
  const application = (uid: string, name: string) => ({
    businessName: name,
    contactName: "Nadia Test",
    email: "nadia@example.com",
    phone: "+212 600 000 000",
    cityId: "casablanca",
    address: "12 boulevard d'Anfa, Casablanca",
    categoryIds: ["move"],
    description: "Club de padel avec quatre terrains couverts et des coachs diplômés pour tous les niveaux.",
    documents: [{ path: `organizer-uploads/${uid}/documents/rc.pdf`, name: "RC.pdf" }],
    acceptTerms: true,
  });
  const plan = (days: number) => {
    const d = new Date(Date.now() + days * 86_400_000);
    return { firstDate: d.toISOString().slice(0, 10), time: "10:00", weeks: 1, capacity: 8 };
  };
  const activity = {
    titleFr: `Padel du samedi ${run}`,
    summaryFr: "Des matchs en double, tous niveaux, au club.",
    descriptionFr: "Quatre terrains couverts, matériel prêté, équipes équilibrées selon le niveau de chacun.",
    categoryId: "move", cityId: "casablanca", district: "Anfa", venueName: "Club Test", address: "12 boulevard d'Anfa, Casablanca",
    revealPolicy: "immediate", bookingMode: "individual", maxSeatsPerBooking: 2, admission: "direct", requestMessageRequired: false,
    priceDh: 200, durationMinutes: 90, languages: ["fr"], alcoholServed: false, cancellationPolicyId: "standard-48h",
    // Réglages réservés à l'équipe : ignorés pour un organisateur.
    economicsModel: "own", costPerSeatDh: 999, membersOnly: true, memberPriceDh: 1,
    status: "published",
  };

  beforeAll(async () => {
    team = await member({ role: "admin" });
    pro = await member();
    other = await member();
    await db().doc("categories/move").set({ isActive: true }, { merge: true });
  });

  it("inscription : contrat accepté, pièces dans son propre dossier, une seule demande ; refus d'un membre non vérifié", async () => {
    const unverified = await member({ verified: false });
    expect(await refusal(unverified.call("applyAsOrganizer", application(unverified.uid, "Club X")))).toBe("failed-precondition:email_not_verified");
    expect(await refusal(pro.call("applyAsOrganizer", { ...application(pro.uid, "Club Padel Test"), documents: [{ path: `organizer-uploads/${other.uid}/documents/rc.pdf`, name: "x" }] }))).toBe("invalid-argument:");
    expect(await refusal(pro.call("applyAsOrganizer", { ...application(pro.uid, "Club Padel Test"), acceptTerms: false }))).toBe("invalid-argument:");
    const res = await pro.call("applyAsOrganizer", application(pro.uid, "Club Padel Test"));
    orgId = String(res.organizerId);
    expect(res.status).toBe("pending");
    const org = (await db().doc(`organizers/${orgId}`).get()).data()!;
    expect(org).toMatchObject({ name: "Club Padel Test", status: "pending", categoryIds: ["move"] });
    expect(org.slug).toMatch(/^club-padel-test/);
    const det = (await db().doc(`organizers/${orgId}/private/details`).get()).data()!;
    expect(det.memberUids).toEqual([pro.uid]);
    expect(det.terms.version).toBe(ORGANIZER_TERMS_VERSION);
    expect((await db().doc(`users/${pro.uid}`).get()).get("organizerId")).toBe(orgId);
    expect(await refusal(pro.call("applyAsOrganizer", application(pro.uid, "Club Padel Test")))).toBe("failed-precondition:already_organizer");
    // Pas encore validé : aucune activité possible.
    expect(await refusal(pro.call("organizerSaveExperience", { data: { ...activity, sessions: plan(10) }, addSessions: true, images: [] }))).toBe("failed-precondition:organizer_pending");
  });

  it("décisions de l'équipe : complément (message obligatoire), renvoi, validation → droits d'organisateur", async () => {
    expect(await refusal(pro.call("adminDecideOrganizer", { organizerId: orgId, decision: "approve" }))).toBe("permission-denied:");
    expect(await refusal(team.call("adminDecideOrganizer", { organizerId: orgId, decision: "request_info" }))).toBe("invalid-argument:");
    await team.call("adminDecideOrganizer", { organizerId: orgId, decision: "request_info", message: "Merci d'ajouter l'attestation d'assurance." });
    expect((await db().doc(`organizers/${orgId}`).get()).get("status")).toBe("info_requested");
    const notes = await db().collection(`users/${pro.uid}/notifications`).where("type", "==", "organizer_request_info").get();
    expect(notes.size).toBe(1);
    await pro.call("applyAsOrganizer", { ...application(pro.uid, "Club Padel Test"), documents: [{ path: `organizer-uploads/${pro.uid}/documents/rc.pdf`, name: "RC.pdf" }, { path: `organizer-uploads/${pro.uid}/documents/assurance.pdf`, name: "Assurance.pdf" }] });
    expect((await db().doc(`organizers/${orgId}`).get()).get("status")).toBe("pending");
    expect(await team.call("adminDecideOrganizer", { organizerId: orgId, decision: "approve" })).toMatchObject({ status: "approved" });
    const claims = (await adminAuth(admin).getUser(pro.uid)).customClaims;
    expect(claims).toMatchObject({ role: "organizer", orgId });
    expect(await refusal(team.call("adminDecideOrganizer", { organizerId: orgId, decision: "approve" }))).toBe("failed-precondition:invalid_transition");
    const history = (await db().doc(`organizers/${orgId}/private/details`).get()).get("history") as { action: string }[];
    expect(history.map((h) => h.action)).toEqual(["submitted", "request_info", "resubmitted", "approve"]);
  });

  it("activité : envoyée pour validation (jamais publiée directement), réglages de l'équipe ignorés, dates en brouillon", async () => {
    const res = await pro.call("organizerSaveExperience", { data: { ...activity, sessions: plan(10) }, addSessions: true, images: [] });
    expect(res.status).toBe("pending_review");
    const expId = String(res.experienceId);
    const e = (await db().doc(`experiences/${expId}`).get()).data()!;
    expect(e).toMatchObject({ status: "pending_review", organizerId: orgId, organizerSnapshot: { name: "Club Padel Test" }, membersOnly: false, memberPrice: null });
    // docs/22, décision 31 : 35 DH en ligne, le prix de l'activité sur place à l'organisateur.
    expect(e.pricing.model).toBe("fixed_partner");
    expect(e.price.amount).toBe(3500);
    expect((await db().doc(`experiences/${expId}/private/economics`).get()).data()).toMatchObject({ model: "organizer", organizerId: orgId, costPerSeat: null, commissionPercent: null });
    const sessions = await db().collection("sessions").where("experienceId", "==", expId).get();
    expect(sessions.docs.map((d) => [d.get("status"), d.get("organizerId")])).toEqual([["draft", orgId]]);
    // Photos : seulement dans son dossier public.
    expect(await refusal(pro.call("organizerSaveExperience", { experienceId: expId, data: { ...activity, sessions: plan(10) }, addSessions: false, images: [{ path: `experiences/${expId}/x.jpg`, alt: "" }] }))).toBe("invalid-argument:");
    // Un autre organisateur ne touche pas à cette activité.
    const o2 = await other.call("applyAsOrganizer", application(other.uid, "Autre Club"));
    otherOrgId = String(o2.organizerId);
    await team.call("adminDecideOrganizer", { organizerId: otherOrgId, decision: "approve" });
    expect(await refusal(other.call("organizerSaveExperience", { experienceId: expId, data: { ...activity, sessions: plan(10) }, addSessions: false, images: [] }))).toBe("permission-denied:not_owner");
    // L'équipe refuse avec un message, l'organisateur corrige et renvoie, l'équipe publie.
    expect(await refusal(team.call("adminReviewExperience", { experienceId: expId, decision: "reject" }))).toBe("invalid-argument:");
    await team.call("adminReviewExperience", { experienceId: expId, decision: "reject", message: "Précisez le niveau attendu." });
    expect((await db().doc(`experiences/${expId}`).get()).data()).toMatchObject({ status: "rejected", rejectionMessage: "Précisez le niveau attendu." });
    await pro.call("organizerSaveExperience", { experienceId: expId, data: { ...activity, level: "all", sessions: plan(10) }, addSessions: false, images: [] });
    expect((await db().doc(`experiences/${expId}`).get()).get("status")).toBe("pending_review");
    await team.call("adminReviewExperience", { experienceId: expId, decision: "publish" });
    expect((await db().doc(`experiences/${expId}`).get()).get("status")).toBe("published");
    const after = await db().collection("sessions").where("experienceId", "==", expId).get();
    expect(after.docs.map((d) => d.get("status"))).toEqual(["published"]);
    // Lot O (docs/26) : publiée puis modifiée par l'organisateur → la version en ligne NE CHANGE PAS ; les modifications
    // (et les nouvelles dates) attendent la validation de l'équipe.
    const liveSummary = (await db().doc(`experiences/${expId}`).get()).get("summary.fr");
    const newSummary = "Des matchs en double, tous niveaux, au club, puis un café.";
    const rev = await pro.call("organizerSaveExperience", { experienceId: expId, data: { ...activity, level: "all", summaryFr: newSummary, sessions: plan(17) }, addSessions: true, images: [] });
    expect(rev).toMatchObject({ revision: true, sessionsCreated: 0 });
    expect(rev.changes).toEqual(expect.arrayContaining(["Accroche", "1 nouvelle(s) date(s)"]));
    expect((await db().doc(`experiences/${expId}`).get()).data()).toMatchObject({ status: "published", revisionPending: true, summary: { fr: liveSummary } });
    expect((await db().collection("sessions").where("experienceId", "==", expId).get()).size).toBe(1);
    // Refus : rien ne change, l'organisateur est prévenu.
    expect(await refusal(team.call("adminReviewExperience", { experienceId: expId, decision: "reject_revision" }))).toBe("invalid-argument:");
    await team.call("adminReviewExperience", { experienceId: expId, decision: "reject_revision", message: "Gardez le texte précédent." });
    expect((await db().doc(`experiences/${expId}`).get()).data()).toMatchObject({ revisionPending: false, summary: { fr: liveSummary } });
    expect((await db().doc(`experiences/${expId}/private/revision`).get()).exists).toBe(false);
    // Nouvel envoi, puis validation : texte et date appliqués.
    await pro.call("organizerSaveExperience", { experienceId: expId, data: { ...activity, level: "all", summaryFr: newSummary, sessions: plan(17) }, addSessions: true, images: [] });
    await team.call("adminReviewExperience", { experienceId: expId, decision: "apply_revision" });
    expect((await db().doc(`experiences/${expId}`).get()).data()).toMatchObject({ status: "published", revisionPending: false, reviewFlag: false, summary: { fr: newSummary } });
    const dates = await db().collection("sessions").where("experienceId", "==", expId).get();
    expect(dates.docs.map((d) => d.get("status"))).toEqual(["published", "published"]);
    expect(await refusal(team.call("adminReviewExperience", { experienceId: expId, decision: "apply_revision" }))).toBe("failed-precondition:no_revision");
  });

  it("univers : un organisateur publie dans Activités ou Événements, jamais dans Tables (lot O)", async () => {
    await db().doc("categories/eat").set({ isActive: true, parentId: null }, { merge: true });
    expect(await refusal(pro.call("organizerSaveExperience", { data: { ...activity, categoryId: "eat", subcategoryId: "", sessions: plan(10) }, addSessions: false, images: [] }))).toBe("invalid-argument:");
    const x = await member();
    expect(await refusal(x.call("applyAsOrganizer", { ...application(x.uid, "Resto Test"), categoryIds: ["eat"] }))).toBe("invalid-argument:");
  });

  it("réservations et actions : seulement sur SES activités (pointage, demandes, annulation de date)", async () => {
    const res = await pro.call("organizerSaveExperience", { data: { ...activity, titleFr: `Padel du dimanche ${run}`, sessions: plan(12) }, addSessions: true, images: [] });
    const expId = String(res.experienceId);
    await team.call("adminReviewExperience", { experienceId: expId, decision: "publish" });
    const sid = (await db().collection("sessions").where("experienceId", "==", expId).get()).docs[0]!.id;
    const buyer = await member();
    const { reservationId } = await buyer.call("createReservation", { sessionId: sid, seats: 1 });
    expect((await reservation(String(reservationId))).organizerId).toBe(orgId);
    const checkout = await buyer.call("startCheckout", { reservationId });
    await buyer.call("sandboxCompletePayment", { paymentId: checkout.paymentId, outcome: "succeeded" });
    expect((await reservation(String(reservationId))).status).toBe("confirmed");
    // Pointage : trop tôt pour l'organisateur ; refusé à l'autre organisateur et à un membre.
    expect(await refusal(pro.call("adminCheckIn", { reservationId, presence: "attended" }))).toBe("failed-precondition:too_early");
    expect(await refusal(other.call("adminCheckIn", { reservationId, presence: "attended" }))).toBe("permission-denied:not_owner");
    expect(await refusal(buyer.call("adminCheckIn", { reservationId, presence: "attended" }))).toBe("permission-denied:");
    // Lot O (docs/26) : plus d'annulation directe ni d'export pour un organisateur.
    const thc = await makeSession({ startInHours: 1 });
    expect(await refusal(pro.call("adminCancelSession", { sessionId: thc, reason: "Essai interdit" }))).toBe("permission-denied:");
    expect(await refusal(pro.call("adminCancelSession", { sessionId: sid, reason: "Terrain indisponible" }))).toBe("permission-denied:");
    expect(await refusal(pro.call("adminLogExport", { kind: "participants", targetId: sid, rows: 1 }))).toBe("permission-denied:");
    // Il DEMANDE l'annulation (motif obligatoire, une seule demande à la fois, seulement pour SES dates).
    expect(await refusal(other.call("organizerRequestCancellation", { sessionId: sid, reason: "Météo annoncée très mauvaise" }))).toBe("permission-denied:not_owner");
    expect(await refusal(pro.call("organizerRequestCancellation", { sessionId: sid, reason: "court" }))).toBe("invalid-argument:");
    const { requestId: refusedId } = await pro.call("organizerRequestCancellation", { sessionId: sid, reason: "Terrain indisponible ce jour-là" });
    expect(await refusal(pro.call("organizerRequestCancellation", { sessionId: sid, reason: "Terrain indisponible ce jour-là" }))).toBe("failed-precondition:already_requested");
    // L'équipe refuse (message obligatoire) : la date est maintenue.
    expect(await refusal(team.call("adminDecideOrganizerRequest", { requestId: refusedId, decision: "refuse" }))).toBe("invalid-argument:");
    await team.call("adminDecideOrganizerRequest", { requestId: refusedId, decision: "refuse", message: "Le club confirme le terrain." });
    expect((await session(sid)).status).not.toBe("cancelled");
    // Nouvelle demande, acceptée : la date est annulée et remboursée par l'équipe.
    const { requestId } = await pro.call("organizerRequestCancellation", { sessionId: sid, reason: "Terrain finalement fermé pour travaux" });
    expect(await refusal(pro.call("adminDecideOrganizerRequest", { requestId, decision: "accept" }))).toBe("permission-denied:");
    await team.call("adminDecideOrganizerRequest", { requestId, decision: "accept" });
    expect((await session(sid)).status).toBe("cancelled");
    expect(["cancelled", "refunded"]).toContain((await reservation(String(reservationId))).status);
    expect((await db().doc(`organizerRequests/${requestId}`).get()).get("status")).toBe("accepted");
    expect(await refusal(team.call("adminDecideOrganizerRequest", { requestId, decision: "accept" }))).toBe("failed-precondition:not_pending");
  });

  it("proposer une activité validée pour un samedi ; l'équipe la place dans la rotation (lot O)", async () => {
    const res = await pro.call("organizerSaveExperience", { data: { ...activity, titleFr: `Tennis du samedi ${run}`, sessions: plan(30) }, addSessions: false, images: [] });
    const expId = String(res.experienceId);
    // Pas encore validée : refusée.
    expect(await refusal(pro.call("organizerProposeSaturday", { experienceId: expId, dates: [] }))).toBe("failed-precondition:not_published");
    await team.call("adminReviewExperience", { experienceId: expId, decision: "publish" });
    const { rotationDays } = await import("@thecommunity/shared");
    const sats = rotationDays(6, new Date(), 6).slice(2);
    expect(await refusal(pro.call("organizerProposeSaturday", { experienceId: expId, dates: ["2099-01-01"] }))).toBe("invalid-argument:");
    expect(await refusal(other.call("organizerProposeSaturday", { experienceId: expId, dates: [] }))).toMatch(/permission-denied|failed-precondition/);
    const { requestId } = await pro.call("organizerProposeSaturday", { experienceId: expId, dates: [sats[0]!], note: "Deux terrains, 8 places." });
    expect(await refusal(pro.call("organizerProposeSaturday", { experienceId: expId, dates: [] }))).toBe("failed-precondition:already_requested");
    // L'équipe accepte sur le samedi souhaité : la rotation de la ville reçoit ce samedi.
    const rv = db().doc("rendezvous/activite-du-samedi");
    if (!(await rv.get()).exists) {
      await rv.set({ kind: "rotation", title: { fr: "L'activité du samedi" }, cityId: "casablanca", weekday: 6, time: "10:00", anchor: rotationDays(6, new Date(), 1)[0], weeksAhead: 6, cycle: [{ experienceId: expId, time: "10:00", capacity: 8 }], overrides: {}, tiers: [], status: "active" });
    }
    const city = (await db().doc(`experiences/${expId}`).get()).get("cityId");
    await rv.update({ cityId: city });
    await team.call("adminDecideOrganizerRequest", { requestId, decision: "accept", date: sats[0], time: "15:00", capacity: 8 });
    expect((await rv.get()).get(`overrides.${sats[0]}`)).toMatchObject({ experienceId: expId, time: "15:00", capacity: 8 });
    expect((await db().doc(`organizerRequests/${requestId}`).get()).data()).toMatchObject({ status: "accepted", placedOn: sats[0] });
    expect((await db().doc(`experiences/${expId}`).get()).get("rendezvousKind")).toBe("rotation");
  });

  it("demandes « sur demande » : l'organisateur décide pour ses activités seulement", async () => {
    const res = await pro.call("organizerSaveExperience", { data: { ...activity, titleFr: `Padel sur demande ${run}`, admission: "on_request", sessions: plan(14) }, addSessions: true, images: [] });
    const expId = String(res.experienceId);
    await team.call("adminReviewExperience", { experienceId: expId, decision: "publish" });
    const sid = (await db().collection("sessions").where("experienceId", "==", expId).get()).docs[0]!.id;
    const asker = await member();
    const { requestId } = await asker.call("requestBooking", { sessionId: sid, seats: 1, message: "Bonjour, je joue depuis un an." });
    expect((await db().doc(`bookingRequests/${requestId}`).get()).get("organizerId")).toBe(orgId);
    expect(await refusal(other.call("adminDecideRequest", { requestId, decision: "accept" }))).toBe("permission-denied:not_owner");
    expect(await refusal(asker.call("adminDecideRequest", { requestId: "inexistante", decision: "accept" }))).toBe("permission-denied:");
    expect(await pro.call("adminDecideRequest", { requestId, decision: "accept" })).toMatchObject({ ok: true });
    expect((await db().doc(`bookingRequests/${requestId}`).get()).get("status")).toBe("accepted");
  });

  it("profil public ; suspension : droits retirés tout de suite, plus aucune action", async () => {
    await pro.call("organizerUpdateProfile", { description: "Club de padel au cœur d'Anfa, quatre terrains couverts, coachs diplômés.", phone: "+212 600 000 001", address: "14 boulevard d'Anfa, Casablanca", instagram: "@clubtest", logoPath: `organizers/${orgId}/public/logo.webp` });
    expect((await db().doc(`organizers/${orgId}`).get()).data()).toMatchObject({ instagram: "clubtest", logoPath: `organizers/${orgId}/public/logo.webp` });
    expect(await refusal(pro.call("organizerUpdateProfile", { description: "Club de padel au cœur d'Anfa, quatre terrains couverts, coachs diplômés.", phone: "+212 600 000 001", address: "14 boulevard d'Anfa", logoPath: `organizers/${otherOrgId}/public/logo.webp` }))).toBe("invalid-argument:");
    expect(await refusal(team.call("adminDecideOrganizer", { organizerId: otherOrgId, decision: "suspend" }))).toBe("invalid-argument:");
    await team.call("adminDecideOrganizer", { organizerId: otherOrgId, decision: "suspend", message: "Plaintes répétées de participants." });
    const claims = (await adminAuth(admin).getUser(other.uid)).customClaims ?? {};
    expect(claims.role).toBeUndefined();
    expect(claims.orgId).toBeUndefined();
    // Même avec un ancien jeton, l'accès est relu dans la base : refus.
    expect(await refusal(other.call("organizerUpdateProfile", { description: "Tentative après suspension, texte assez long pour passer.", phone: "+212 600 000 002", address: "Adresse quelconque" }))).toMatch(/^(failed-precondition:organizer_suspended|unauthenticated:)$/);
  });
});

describe("commissions et reversements (21)", () => {
  let sup: Client;
  let team: Client;
  let pro: Client;
  let orgId = "";
  const plan = (days: number) => {
    const d = new Date(Date.now() + days * 86_400_000);
    return { firstDate: d.toISOString().slice(0, 10), time: "18:00", weeks: 1, capacity: 10 };
  };
  const activity = (title: string) => ({
    titleFr: title, summaryFr: "Atelier de céramique en petit groupe, cuisson comprise.", descriptionFr: "Deux heures au tour avec une céramiste, tous niveaux, terre et cuisson comprises.",
    categoryId: "move", cityId: "casablanca", district: "Maarif", venueName: "Atelier Test", address: "10 rue de la Terre, Casablanca",
    revealPolicy: "immediate", bookingMode: "individual", maxSeatsPerBooking: 2, admission: "direct", requestMessageRequired: false,
    priceDh: 200, durationMinutes: 120, languages: ["fr"], alcoholServed: false, cancellationPolicyId: "standard-48h",
    economicsModel: "own", costPerSeatDh: 0, status: "published", sessions: plan(10),
  });
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const publishActivity = async (title: string) => {
    const { experienceId } = await pro.call("organizerSaveExperience", { data: activity(title), addSessions: true, images: [] });
    await team.call("adminReviewExperience", { experienceId, decision: "publish" });
    const s = (await db().collection("sessions").where("experienceId", "==", experienceId).get()).docs[0]!;
    await s.ref.update({ createdAt: Timestamp.fromMillis(Date.now() - 96 * 3_600_000) }); // hors accès anticipé
    return { experienceId: String(experienceId), sessionId: s.id };
  };
  const buy = async (sessionId: string, seats = 1) => {
    const u = await member();
    const { reservationId } = await u.call("createReservation", { sessionId, seats });
    const c = await u.call("startCheckout", { reservationId });
    await u.call("sandboxCompletePayment", { paymentId: c.paymentId, outcome: "succeeded" });
    return { u, reservationId: String(reservationId) };
  };

  beforeAll(async () => {
    sup = await member({ role: "superadmin" });
    team = await member({ role: "admin" });
    pro = await member();
    await db().doc("categories/move").set({ isActive: true, parentId: null }, { merge: true });
    const { organizerId } = await pro.call("applyAsOrganizer", {
      businessName: `Atelier Commission ${run}`, contactName: "Yasmine Test", email: "yasmine@example.com", phone: "+212 600 000 000", cityId: "casablanca",
      address: "10 rue de la Terre, Casablanca", categoryIds: ["move"], description: "Atelier de céramique à Maârif, initiations au tour et au modelage.", documents: [], acceptTerms: true,
    });
    orgId = String(organizerId);
    await team.call("adminDecideOrganizer", { organizerId: orgId, decision: "approve" });
  });

  it("règles : super-admin seulement, cible vérifiée, journalisées", async () => {
    expect(await refusal(team.call("adminSaveCommissionRule", { scope: "global", ratePercent: 15, effectiveFrom: yesterday }))).toBe("permission-denied:");
    expect(await refusal(sup.call("adminSaveCommissionRule", { scope: "organizer", targetId: "inexistant", ratePercent: 10, effectiveFrom: yesterday }))).toBe("invalid-argument:");
    const { ruleId } = await sup.call("adminSaveCommissionRule", { scope: "organizer", targetId: orgId, ratePercent: 10, fixedPerSeatDh: 5, effectiveFrom: yesterday, note: "Contrat test" });
    expect((await db().doc(`commissionRules/${ruleId}`).get()).data()).toMatchObject({ scope: "organizer", targetId: orgId, ratePercent: 10, fixedPerSeat: 500, active: true });
    const log = await db().collection("auditLogs").where("targetId", "==", ruleId).get();
    expect(log.docs.map((d) => d.get("action"))).toContain("commission.rule.create");
  });

  it("docs/22, décision 31 : 35 DH en ligne, prix de l'activité sur place ; aucune commission ni écriture au registre", async () => {
    const { experienceId, sessionId } = await publishActivity(`Céramique ${run}`);
    const e = (await db().doc(`experiences/${experienceId}`).get()).data()!;
    expect(e).toMatchObject({ price: { amount: 3500 }, pricing: { model: "fixed_partner", partner: { price: { amount: 20000 } } } });
    expect((await session(sessionId)).price.amount).toBe(3500);
    const { reservationId } = await buy(sessionId, 2);
    const r = await reservation(reservationId);
    expect(r.pricing).toMatchObject({ total: 7000 });
    expect(r.onSiteAmount).toBe(40000);
    expect(r.commission).toBeUndefined();
    expect((await db().doc(`commissionLedger/sale_${reservationId}`).get()).exists).toBe(false);
  }, 120_000);
});

describe("paiements A/B/C, politiques d'annulation, remboursements (22)", () => {
  let sup: Client;
  let team: Client;
  let pro: Client;
  let orgId = "";
  const plan = (days: number) => {
    const d = new Date(Date.now() + days * 86_400_000);
    return { firstDate: d.toISOString().slice(0, 10), time: "18:00", weeks: 1, capacity: 10 };
  };
  const activity = (title: string, extra: Record<string, unknown> = {}) => ({
    titleFr: title, summaryFr: "Balade guidée en petit groupe dans le centre-ville.", descriptionFr: "Deux heures à pied avec une guide passionnée, à la découverte des façades Art déco du centre-ville.",
    categoryId: "discover", cityId: "casablanca", district: "Centre-ville", venueName: "Point de rendez-vous", address: "Boulevard Mohammed V, Casablanca",
    revealPolicy: "immediate", bookingMode: "individual", maxSeatsPerBooking: 2, admission: "direct", requestMessageRequired: false,
    priceDh: 200, durationMinutes: 120, languages: ["fr"], alcoholServed: false, cancellationPolicyId: "standard-48h",
    economicsModel: "own", costPerSeatDh: 0, status: "published", sessions: plan(10), ...extra,
  });
  const publish = async (data: Record<string, unknown>) => {
    const { experienceId } = await pro.call("organizerSaveExperience", { data, addSessions: true, images: [] });
    await team.call("adminReviewExperience", { experienceId, decision: "publish" });
    const s = (await db().collection("sessions").where("experienceId", "==", experienceId).get()).docs[0]!;
    await s.ref.update({ createdAt: Timestamp.fromMillis(Date.now() - 96 * 3_600_000) });
    return { experienceId: String(experienceId), sessionId: s.id };
  };
  const buy = async (sessionId: string, seats = 1) => {
    const u = await member();
    const { reservationId } = await u.call("createReservation", { sessionId, seats });
    const c = await u.call("startCheckout", { reservationId });
    await u.call("sandboxCompletePayment", { paymentId: c.paymentId, outcome: "succeeded" });
    return { u, reservationId: String(reservationId) };
  };

  beforeAll(async () => {
    sup = await member({ role: "superadmin" });
    team = await member({ role: "admin" });
    pro = await member();
    await db().doc("categories/discover").set({ isActive: true }, { merge: true });
    const { organizerId } = await pro.call("applyAsOrganizer", {
      businessName: `Balades Test ${run}`, contactName: "Leila Test", email: "leila@example.com", phone: "+212 600 000 000", cityId: "casablanca",
      address: "Boulevard Mohammed V, Casablanca", categoryIds: ["discover"], description: "Balades guidées dans le centre-ville de Casablanca, en petit groupe.", documents: [], acceptTerms: true,
    });
    orgId = String(organizerId);
    await team.call("adminDecideOrganizer", { organizerId: orgId, decision: "approve" });
    // Règle de commission propre à cet organisateur (15 %) et politique « souple » ; le cache des fonctions dure 1 min.
    await sup.call("adminSaveCommissionRule", { scope: "organizer", targetId: orgId, ratePercent: 15, effectiveFrom: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) });
    await sup.call("adminSaveCancellationPolicy", { id: "souple-24h", labelFr: "Annulation gratuite jusqu'à 24 h avant", rules: [{ hoursBefore: 24, refundPercent: 100 }, { hoursBefore: 0, refundPercent: 0 }] });
    await new Promise((r) => setTimeout(r, 61_000));
  }, 120_000);

  it("activité d'organisateur : le prix saisi se paie sur place, 35 DH en ligne ; sans prix, tout en ligne", async () => {
    const b = await publish(activity(`Balade ${run}`));
    const eb = (await db().doc(`experiences/${b.experienceId}`).get()).data()!;
    expect(eb).toMatchObject({ paymentModel: "booking_fee", price: { amount: 3500 }, pricing: { model: "fixed_partner", partner: { name: `Balades Test ${run}`, price: { amount: 20000 } } } });
    const c = await publish(activity(`Gratuite sur place ${run}`, { priceDh: 0 }));
    expect((await db().doc(`experiences/${c.experienceId}`).get()).data()).toMatchObject({ price: { amount: 3500 }, pricing: { model: "online_only" } });
    const { reservationId } = await buy(b.sessionId, 1);
    expect((await reservation(reservationId)).commission).toBeUndefined();
  }, 120_000);

  it("politique d'annulation : copiée sur la réservation, appliquée à l'annulation ; la standard ne se modifie pas", async () => {
    expect(await refusal(team.call("adminSaveCancellationPolicy", { id: "x-test", labelFr: "Test", rules: [{ hoursBefore: 0, refundPercent: 0 }] }))).toBe("permission-denied:");
    expect(await refusal(sup.call("adminSaveCancellationPolicy", { id: "standard-48h", labelFr: "Changée", rules: [{ hoursBefore: 0, refundPercent: 100 }] }))).toBe("failed-precondition:default_policy");
    expect(await refusal(sup.call("adminSaveCancellationPolicy", { id: "envers", labelFr: "À l'envers", rules: [{ hoursBefore: 48, refundPercent: 0 }, { hoursBefore: 0, refundPercent: 100 }] }))).toBe("invalid-argument:");
    // Date dans 36 h : la politique standard (48 h) ne rembourserait rien, la « souple » (24 h) rembourse tout.
    const sid = await makeSession({ price: 20000, startInHours: 36, createdHoursAgo: 96, extra: { cancellationPolicyId: "souple-24h" } });
    const { u, reservationId } = await buy(sid, 1);
    expect((await reservation(reservationId)).cancellationPolicy).toMatchObject({ id: "souple-24h" });
    // Même si la politique change ensuite, la copie fait foi.
    await sup.call("adminSaveCancellationPolicy", { id: "souple-24h", labelFr: "Souple modifiée", rules: [{ hoursBefore: 72, refundPercent: 100 }, { hoursBefore: 0, refundPercent: 0 }] });
    await u.call("cancelReservation", { reservationId });
    expect((await reservation(reservationId)).cancellation).toMatchObject({ refundAmount: 20000 });
  }, 120_000);

  it("demande de remboursement : une par réservation ; partiel puis total plafonné ; refus motivé ; registre corrigé", async () => {
    const a = await publish(activity(`Remboursement ${run}`));
    const { u, reservationId } = await buy(a.sessionId, 1);
    const other = await member();
    expect(await refusal(other.call("requestRefund", { reservationId, reason: "different", message: "Ce n'était pas du tout ce qui était décrit." }))).toBe("not-found:not_found");
    expect(await refusal(u.call("requestRefund", { reservationId, reason: "different", message: "court" }))).toBe("invalid-argument:");
    await u.call("requestRefund", { reservationId, reason: "different", message: "Le parcours a duré 30 minutes au lieu de deux heures." });
    expect(await refusal(u.call("requestRefund", { reservationId, reason: "other", message: "Je redemande une seconde fois pour voir." }))).toBe("failed-precondition:already_requested");
    expect(await refusal(u.call("adminDecideRefund", { requestId: reservationId, decision: "full" }))).toBe("permission-denied:");
    expect(await refusal(team.call("adminDecideRefund", { requestId: reservationId, decision: "decline" }))).toBe("invalid-argument:");
    const res = await team.call("adminDecideRefund", { requestId: reservationId, decision: "partial", amountDh: 10, message: "Geste commercial pour la durée écourtée." });
    expect(res).toMatchObject({ status: "partially_refunded", amount: 1000 });
    expect(await refusal(team.call("adminDecideRefund", { requestId: reservationId, decision: "full" }))).toBe("failed-precondition:already_decided");
    const r = await reservation(reservationId);
    expect(r.refundedAmount).toBe(1000);
    expect((await payment(String(r.paymentId))).status).toBe("partially_refunded");
    // Annulation ensuite : le remboursement est plafonné à ce qui reste (25 DH sur les 35 DH payés en ligne).
    await u.call("cancelReservation", { reservationId });
    expect((await reservation(reservationId)).cancellation.refundAmount).toBe(2500);
    expect((await payment(String(r.paymentId))).status).toBe("refunded");
    const notes = await db().collection(`users/${u.uid}/notifications`).where("type", "==", "refund_accepted").get();
    expect(notes.size).toBe(1);
    // Refus motivé sur une autre réservation.
    const b = await buy(a.sessionId, 1);
    await b.u.call("requestRefund", { reservationId: b.reservationId, reason: "safety", message: "Le groupe a traversé une route sans passage piéton." });
    expect(await team.call("adminDecideRefund", { requestId: b.reservationId, decision: "decline", message: "Après vérification avec l'organisateur, le parcours était sécurisé." })).toMatchObject({ status: "declined" });
    expect((await reservation(b.reservationId)).refundedAmount ?? 0).toBe(0);
  }, 120_000);
});

describe("accueil modifiable par l'équipe (23)", () => {
  it("bannière, sections et mises en avant : équipe seulement, activités publiées seulement, journalisé", async () => {
    const team = await member({ role: "admin" });
    const someone = await member();
    const sessionId = await makeSession();
    const expId = String((await session(sessionId)).experienceId);
    const draft = db().collection("experiences").doc();
    await draft.set({ slug: `brouillon-${draft.id}`, title: { fr: "Brouillon" }, status: "draft" });
    const input = {
      banner: { enabled: true, textFr: "Nouveau : le padel entre inconnus", textEn: "New: padel with strangers", href: "/experiences?q=padel", linkFr: "Réserver" },
      sections: [...DEFAULT_HOME_SETTINGS.sections].reverse().map((s) => ({ ...s, enabled: true })),
      featuredExperienceIds: [expId],
    };
    expect(await refusal(someone.call("adminSaveHomeSettings", input))).toBe("permission-denied:");
    expect(await refusal(team.call("adminSaveHomeSettings", { ...input, banner: { ...input.banner, href: "javascript:alert(1)" } }))).toBe("invalid-argument:");
    expect(await refusal(team.call("adminSaveHomeSettings", { ...input, featuredExperienceIds: [expId, draft.id] }))).toBe("failed-precondition:not_published");
    await team.call("adminSaveHomeSettings", input);
    const saved = (await db().doc("settings/home").get()).data()!;
    expect(saved.banner).toEqual({ enabled: true, text: { fr: "Nouveau : le padel entre inconnus", en: "New: padel with strangers" }, href: "/experiences?q=padel", linkLabel: { fr: "Réserver" } });
    expect(saved.sections[0]).toEqual({ id: "faq", enabled: true });
    expect(saved.featuredExperienceIds).toEqual([expId]);
    const log = await db().collection("auditLogs").where("action", "==", "settings.home").where("actorUid", "==", team.uid).get();
    expect(log.size).toBe(1);
    // Retour aux réglages par défaut (les autres parcours lisent l'accueil).
    await team.call("adminSaveHomeSettings", { banner: { enabled: false, textFr: "" }, sections: DEFAULT_HOME_SETTINGS.sections, featuredExperienceIds: [] });
    expect((await db().doc("settings/home").get()).get("banner")).toBeNull();
  }, 60_000);
});

describe("avis : réponse, signalement, photo, historique (24)", () => {
  const bucket = () => adminStorage(admin).bucket(`${PROJECT}.appspot.com`);
  it("l'organisateur répond, un membre signale, l'équipe traite ; la photo n'est publiée qu'après vérification", async () => {
    const team = await member({ role: "admin" });
    const pro = await member();
    const u = await member();
    const k = await member();
    await db().doc(`users/${u.uid}`).update({ firstName: "Nadia", lastName: "test" });
    await db().doc("categories/discover").set({ isActive: true }, { merge: true });
    const { organizerId } = await pro.call("applyAsOrganizer", {
      businessName: `Avis Test ${run}`, contactName: "Lina Test", email: "lina@example.com", phone: "+212 600 000 000", cityId: "casablanca",
      address: "Boulevard d'Anfa, Casablanca", categoryIds: ["discover"], description: "Visites guidées en petit groupe dans le centre de Casablanca.", documents: [], acceptTerms: true,
    });
    const orgId = String(organizerId);
    await team.call("adminDecideOrganizer", { organizerId: orgId, decision: "approve" });
    const sid = await makeSession({ startInHours: 72, extra: { organizerId: orgId } });
    const { reservationId } = await paidReservation(u, sid);
    const past = { start: Timestamp.fromMillis(Date.now() - 5 * 3_600_000), end: Timestamp.fromMillis(Date.now() - 3 * 3_600_000) };
    await db().doc(`reservations/${reservationId}`).update({ "sessionSnapshot.startAt": past.start, "sessionSnapshot.endAt": past.end, status: "attended" });
    const expId = String((await reservation(reservationId)).experienceId);

    // Photo : seulement depuis son propre dossier, et réellement envoyée.
    await bucket().file(`review-uploads/${u.uid}/p.jpg`).save(Buffer.from("photo"), { contentType: "image/jpeg" });
    expect(await refusal(u.call("submitReview", { reservationId, rating: 4, comment: "Très bien", photoPath: `review-uploads/${k.uid}/p.jpg` }))).toBe("failed-precondition:invalid_photo");
    expect(await refusal(u.call("submitReview", { reservationId, rating: 4, comment: "Très bien", photoPath: `review-uploads/${u.uid}/absente.jpg` }))).toBe("failed-precondition:invalid_photo");
    await u.call("submitReview", { reservationId, rating: 4, comment: "Très bien", photoPath: `review-uploads/${u.uid}/p.jpg` });
    const rv = () => db().doc(`reviews/${reservationId}`).get().then((d) => d.data()!);
    expect(await rv()).toMatchObject({ organizerId: orgId, photo: { path: `review-uploads/${u.uid}/p.jpg`, status: "pending" } });

    // Réponse : l'organisateur de l'activité ou l'équipe, jamais un membre.
    expect(await refusal(k.call("replyToReview", { reviewId: reservationId, text: "Merci" }))).toBe("permission-denied:");
    expect(await refusal(pro.call("replyToReview", { reviewId: reservationId, text: "x" }))).toBe("invalid-argument:");
    await pro.call("replyToReview", { reviewId: reservationId, text: "Merci Nadia, à bientôt !" });
    expect((await rv()).reply).toMatchObject({ text: "Merci Nadia, à bientôt !", authorName: `Avis Test ${run}`, authorRole: "organizer" });
    expect((await db().collection(`users/${u.uid}/notifications`).where("type", "==", "review_reply").get()).size).toBe(1);
    await team.call("replyToReview", { reviewId: reservationId, text: "Merci de votre retour." });
    expect((await rv()).reply).toMatchObject({ authorRole: "team", authorName: "L'équipe Wenzy" });
    await team.call("replyToReview", { reviewId: reservationId, text: "" });
    expect((await rv()).reply).toBeUndefined();

    // Signalement : une fois par personne, jamais son propre avis ; rien n'est masqué automatiquement.
    expect(await refusal(u.call("reportReview", { reviewId: reservationId, reason: "spam" }))).toBe("failed-precondition:own_review");
    expect(await refusal(k.call("reportReview", { reviewId: reservationId, reason: "other" }))).toBe("invalid-argument:");
    await k.call("reportReview", { reviewId: reservationId, reason: "false_info", message: "Je n'ai jamais vu cette personne." });
    expect(await refusal(k.call("reportReview", { reviewId: reservationId, reason: "spam" }))).toBe("failed-precondition:already_reported");
    await pro.call("reportReview", { reviewId: reservationId, reason: "offensive" });
    expect(await rv()).toMatchObject({ status: "published", reportCount: 2, reportsOpen: 2 });
    expect((await db().doc(`reviews/${reservationId}/reports/${pro.uid}`).get()).data()).toMatchObject({ byOrganizer: true, status: "open" });
    expect(await refusal(k.call("adminResolveReviewReports", { reviewId: reservationId, outcome: "hide" }))).toBe("permission-denied:");
    await team.call("adminResolveReviewReports", { reviewId: reservationId, outcome: "keep", note: "Avis conforme." });
    expect(await rv()).toMatchObject({ status: "published", reportsOpen: 0, reportCount: 2 });
    expect((await db().doc(`reviews/${reservationId}/reports/${k.uid}`).get()).get("status")).toBe("dismissed");

    // Photo : refus motivé obligatoire ; acceptation = copie publique, original supprimé.
    expect(await refusal(team.call("adminDecideReviewPhoto", { reviewId: reservationId, decision: "reject" }))).toBe("invalid-argument:");
    await team.call("adminDecideReviewPhoto", { reviewId: reservationId, decision: "approve" });
    const photo = (await rv()).photo;
    expect(photo.status).toBe("approved");
    expect(photo.path).toMatch(new RegExp(`^reviews/${reservationId}/photo-\\d+\\.jpg$`));
    expect((await bucket().file(photo.path).exists())[0]).toBe(true);
    expect((await bucket().file(`review-uploads/${u.uid}/p.jpg`).exists())[0]).toBe(false);
    expect(await refusal(team.call("adminDecideReviewPhoto", { reviewId: reservationId, decision: "approve" }))).toBe("failed-precondition:no_pending_photo");

    // Masquage après nouveau signalement : note de l'activité recalculée ; historique complet.
    const before = (await db().doc(`experiences/${expId}`).get()).data()!;
    const z = await member();
    await z.call("reportReview", { reviewId: reservationId, reason: "personal_info" });
    await team.call("adminResolveReviewReports", { reviewId: reservationId, outcome: "hide", note: "Nom d'une autre personne." });
    expect((await rv()).status).toBe("hidden");
    expect((await db().doc(`experiences/${expId}`).get()).get("ratingCount")).toBe(before.ratingCount - 1);
    expect(await refusal(z.call("reportReview", { reviewId: reservationId, reason: "spam" }))).toBe("failed-precondition:not_published");
    const events = ((await db().doc(`reviews/${reservationId}/private/history`).get()).get("events") as { action: string }[]).map((e) => e.action);
    expect(events).toEqual(["created", "reply", "reply", "reply_removed", "reported", "reported", "reports_kept", "photo_approved", "reported", "hidden"]);
  }, 120_000);
});

describe("activités réservées aux femmes (29)", () => {
  it("réservation, demande et liste d'attente refusées si le profil n'indique pas « femme »", async () => {
    const sid = await makeSession({ capacity: 1, extra: { audience: "women" } });
    const him = await member();
    await db().doc(`users/${him.uid}`).update({ gender: "male" });
    const unknown = await member();
    await db().doc(`users/${unknown.uid}`).update({ gender: "undisclosed" });
    const her = await member();
    await db().doc(`users/${her.uid}`).update({ gender: "female" });
    expect(await refusal(him.call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:audience_women_only");
    expect(await refusal(unknown.call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:audience_women_only");
    await paidReservation(her, sid);
    // Complet : la liste d'attente est aussi réservée aux femmes.
    expect(await refusal(him.call("joinWaitlist", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:audience_women_only");
    const onRequest = await makeSession({ onRequest: true, extra: { audience: "women" } });
    expect(await refusal(him.call("requestBooking", { sessionId: onRequest, seats: 1 }))).toBe("failed-precondition:audience_women_only");
  }, 60_000);
});

describe("« Mes rencontres » (31)", () => {
  /** Trois personnes présentes à une expérience terminée il y a `daysAgo` jours, réunies dans un groupe révélé. */
  async function pastGroup(daysAgo = 2) {
    const [a, b, c] = [await member(), await member(), await member()];
    const sid = await makeSession({ capacity: 10, startInHours: 72 });
    for (const u of [a, b, c]) {
      const { reservationId } = await paidReservation(u, sid);
      await db().doc(`reservations/${reservationId}`).update({ status: "attended" });
    }
    const start = Timestamp.fromMillis(Date.now() - daysAgo * 86_400_000);
    await db().doc(`sessions/${sid}`).update({ startAt: start, endAt: Timestamp.fromMillis(start.toMillis() + 7_200_000) });
    const gid = `g-${run}-${seq++}`;
    await db().doc(`groups/${gid}`).set({
      sessionId: sid, status: "revealed", label: "Table 1", memberIds: [a.uid, b.uid, c.uid],
      members: [{ uid: a.uid, firstName: "Amal", interests: [] }, { uid: b.uid, firstName: "Badr", interests: [] }, { uid: c.uid, firstName: "Chama", interests: [] }],
    });
    return { a, b, c, sid, gid };
  }
  const conn = (x: string, y: string) => db().doc(`connections/${(x < y ? `${x}_${y}` : `${y}_${x}`)}`).get();
  const notes = async (uid: string, type: string) => (await db().collection(`users/${uid}/notifications`).where("type", "==", type).get()).size;

  it("souhait privé, réciprocité, invitation ; « ne plus être réuni » efface le lien", async () => {
    const { a, b, c, gid } = await pastGroup();
    const outsider = await member();
    expect(await refusal(outsider.call("setMeetAgain", { groupId: gid, otherUid: a.uid, wish: true }))).toBe("not-found:not_found");
    expect(await a.call("setMeetAgain", { groupId: gid, otherUid: b.uid, wish: true })).toEqual({ ok: true, matched: false });
    expect((await conn(a.uid, b.uid)).exists).toBe(false);
    expect(await notes(b.uid, "meet_match")).toBe(0); // b ne sait rien
    expect(await b.call("setMeetAgain", { groupId: gid, otherUid: a.uid, wish: true })).toEqual({ ok: true, matched: true });
    expect((await conn(a.uid, b.uid)).data()).toMatchObject({ uids: [a.uid, b.uid].sort(), names: { [a.uid]: "Amal", [b.uid]: "Badr" }, groupId: gid });
    expect(await notes(a.uid, "meet_match")).toBe(1);
    expect(await notes(b.uid, "meet_match")).toBe(1);

    // Invitation : seulement les contacts réciproques, à une date ouverte.
    const future = await makeSession({ startInHours: 96 });
    expect(await refusal(a.call("inviteToSession", { sessionId: future, toUids: [c.uid] }))).toBe("failed-precondition:not_connected");
    expect(await a.call("inviteToSession", { sessionId: future, toUids: [b.uid] })).toEqual({ ok: true, invited: 1 });
    expect(await notes(b.uid, "meet_invite")).toBe(1);

    // c ne veut plus être réunie avec a : le souhait de a vers c ne crée jamais de lien, et c ne peut plus souhaiter a.
    await c.call("setAvoid", { otherUid: a.uid, avoid: true });
    expect(await a.call("setMeetAgain", { groupId: gid, otherUid: c.uid, wish: true })).toEqual({ ok: true, matched: false });
    expect(await refusal(c.call("setMeetAgain", { groupId: gid, otherUid: a.uid, wish: true }))).toBe("failed-precondition:avoided");
    expect((await db().doc(`avoids/${c.uid}`).get()).get("uids")).toEqual([a.uid]);
    // a ne veut plus être réuni avec b : la connexion disparaît.
    await a.call("setAvoid", { otherUid: b.uid, avoid: true });
    expect((await conn(a.uid, b.uid)).exists).toBe(false);
    expect(await refusal(outsider.call("setAvoid", { otherUid: a.uid, avoid: true }))).toBe("not-found:not_found");
  }, 120_000);

  it("plus de 60 jours après : trop tard ; sortie proposée à l'ancien groupe, qui est prévenu à la publication", async () => {
    const old = await pastGroup(70);
    expect(await refusal(old.a.call("setMeetAgain", { groupId: old.gid, otherUid: old.b.uid, wish: true }))).toBe("failed-precondition:meet_window");

    const { a, b, c, gid } = await pastGroup();
    await db().doc(`users/${a.uid}`).set({ firstName: "Amal", trustedHost: true }, { merge: true });
    await c.call("setAvoid", { otherUid: a.uid, avoid: true });
    const outsider = await member();
    await db().doc(`users/${outsider.uid}`).set({ trustedHost: true }, { merge: true });
    const proposal = { title: "Rando du dimanche", categoryId: "move", description: "Une petite randonnée pour se retrouver entre anciens de la table 1.", district: "Bouskoura", datesIdea: "Un dimanche matin", capacity: 8, forGroupId: gid };
    expect(await refusal(outsider.call("submitOutingProposal", proposal))).toBe("invalid-argument:");
    const { proposalId } = await a.call("submitOutingProposal", proposal);
    expect((await db().doc(`outingProposals/${proposalId}`).get()).data()).toMatchObject({ forGroupId: gid, forGroupSize: 3 });
    const team = await member({ role: "admin" });
    await db().doc("categories/move").set({ isActive: true }, { merge: true });
    const data = {
      titleFr: "Rando du dimanche", summaryFr: "Une petite randonnée pour se retrouver.", descriptionFr: "Une randonnée tranquille dans la forêt, ouverte à tous les niveaux.",
      categoryId: "move", cityId: "casablanca", district: "Bouskoura", venueName: "Entrée de la forêt", address: "Route de Bouskoura, Casablanca", revealPolicy: "immediate",
      bookingMode: "open", maxSeatsPerBooking: 2, priceDh: 80, durationMinutes: 150, languages: ["fr"], alcoholServed: false,
      cancellationPolicyId: "standard-48h", partnerId: "", economicsModel: "own", costPerSeatDh: 20, status: "published",
      sessions: { firstDate: "2027-02-07", time: "09:00", weeks: 1, capacity: 12 }, proposalId,
    };
    const { experienceId } = await team.call("adminSaveExperience", { data, addSessions: false, images: [] });
    expect(await notes(b.uid, "outing_for_group")).toBe(1);
    expect(await notes(c.uid, "outing_for_group")).toBe(0); // a demandé à ne plus être réunie avec la personne qui propose
    expect(await notes(a.uid, "outing_for_group")).toBe(0);
    // Pas de seconde notification à la modification suivante.
    await team.call("adminSaveExperience", { experienceId, data, addSessions: false, images: [] });
    expect(await notes(b.uid, "outing_for_group")).toBe(1);
  }, 120_000);
});

describe("attribution des lieux et parcours des Tables (Étape H)", () => {
  const HOUR = 3_600_000;
  /** Rendez-vous Tables à lieu attribué (Dîner Premium), sans lieu habituel, tables de 3 à 5. */
  async function tablesSession(o: { startInHours?: number; capacity?: number } = {}) {
    const sid = await makeSession({ capacity: o.capacity ?? 20, mode: "social_dinner", startInHours: o.startInHours ?? 72 });
    const s = await session(sid);
    const expId = s.experienceId as string;
    await db().doc(`experiences/${expId}`).update({
      groupConfig: { minSize: 3, targetSize: 4, maxSize: 5 }, templateId: "diner", venueTier: "premium", cityId: "casablanca",
      venue: { name: "", address: "", revealPolicy: "on_group_reveal", geo: null },
    });
    return { sid, expId, start: (s.startAt as Timestamp).toDate() };
  }
  /** Lieu compatible avec un créneau qui couvre `start`. */
  async function partner(name: string, start: Date, units: number, extra: Record<string, unknown> = {}) {
    const z = zonedParts(start, "Africa/Casablanca");
    const t = `${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}`;
    const ref = db().collection("partners").doc();
    await ref.set({ name: `${name} ${run}`, type: "restaurant", status: "active", cityId: "casablanca", address: `1 rue ${name}, Casablanca`, contactEmail: `${name.toLowerCase()}.${run}@example.com`, whatsapp: "06 12 34 56 78",
      tiers: ["premium"], formats: ["diner"], unit: "table", unitMin: 3, unitMax: 5, cuisine: `Cuisine ${name}`, level: "occasional", slots: [{ weekday: z.weekday, from: t, to: t, units }], ...extra });
    return ref.id;
  }
  async function people(sid: string, n: number) {
    const out: Client[] = [];
    for (let i = 0; i < n; i++) {
      const u = await member();
      await db().doc(`users/${u.uid}`).set({ firstName: `T${i}`, birthDate: `${1988 + i}-03-04`, languages: ["fr"], interests: ["food"], sector: "tech", email: `t${i}.${run}.${sid.slice(0, 4)}@example.com` }, { merge: true });
      await paidReservation(u, sid);
      out.push(u);
    }
    return out;
  }
  const requestsOf = async (sid: string) => (await db().collection("venueRequests").where("sessionId", "==", sid).get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown> & { id: string });

  it("plafond de vente : jamais plus de places que les lieux compatibles ne peuvent en accueillir", async () => {
    const { sid, start } = await tablesSession();
    expect(await refusal((await member()).call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:full");
    const pid = await partner("Plafond", start, 1);
    await people(sid, 5);
    expect(await refusal((await member()).call("createReservation", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:full");
    expect((await session(sid)).venueCapacity).toBe(5);
    await db().doc(`partners/${pid}`).update({ status: "archived" }); // n'interfère pas avec les tests suivants (même créneau)
  });

  it("fermeture : lieux choisis, demandes envoyées ; refus → autre lieu ; confirmations → révélation avec résumé sans les noms ; 1 h avant : récapitulatif", async () => {
    const { sid, start } = await tablesSession();
    const a = await partner("Alpha", start, 2, { level: "regular" });
    await partner("Beta", start, 2);
    const group = await people(sid, 10);
    const t = tablesTimeline(start);
    // Fermeture : 3 tables (10 personnes, tables de 3 à 5) → Alpha 2 (régulier d'abord), Beta 1.
    await runSessionAutomation(sid, t.closesAt.getTime() + 60_000);
    let reqs = await requestsOf(sid);
    expect(reqs.map((r) => [String(r.partnerName).split(" ")[0], r.tables, r.status]).sort()).toEqual([["Alpha", 2, "sent"], ["Beta", 1, "sent"]]);
    expect((await session(sid)).allocation).toMatchObject({ status: "requested", needed: 3, people: 10 });
    const mails = await db().collection("mail").where("refs.sessionId", "==", sid).where("kind", "==", "venue_request").get();
    expect(mails.size).toBe(2);
    expect((await db().collection("whatsapp").where("refs.requestId", "==", reqs[0]!.id).get()).docs[0]!.data()).toMatchObject({ status: "outbox", to: "212612345678", kind: "request" });
    const alpha = reqs.find((r) => r.partnerId === a)!;
    const beta = reqs.find((r) => r.partnerId !== a)!;
    // Le lien sécurisé : mauvais jeton refusé ; Alpha accepte.
    const anon = await member();
    expect(await refusal(anon.call("partnerRespondRequest", { requestId: alpha.id, token: "x".repeat(32), accept: true }))).toBe("not-found:not_found");
    expect(await anon.call("partnerRespondRequest", { requestId: alpha.id, token: alpha.token, accept: true })).toEqual({ status: "confirmed" });
    // Un nouveau lieu est ajouté ; Beta refuse au téléphone : le logiciel propose Gamma (nouvelle demande).
    const c = await partner("Gamma", start, 1);
    const adm = await member({ role: "admin" });
    expect(await refusal(group[0]!.call("adminRequestAction", { requestId: beta.id, action: "refuse" }))).toBe("permission-denied:");
    await adm.call("adminRequestAction", { requestId: beta.id, action: "refuse" });
    reqs = await requestsOf(sid);
    const gamma = reqs.find((r) => r.partnerId === c)!;
    expect(gamma).toMatchObject({ status: "sent", tables: 1, round: 2 });
    // Pas encore toutes confirmées : la révélation attend (aucun lieu attribué avant confirmation).
    expect((await session(sid)).allocation).toMatchObject({ status: "requested", confirmed: 2 });
    expect((await db().doc(`sessions/${sid}/private/venues`).get()).exists).toBe(false);
    await adm.call("adminRequestAction", { requestId: gamma.id, action: "confirm_phone" });
    expect((await session(sid)).allocation).toMatchObject({ status: "confirmed", confirmed: 3 });
    const venues = (await db().doc(`sessions/${sid}/private/venues`).get()).data()!.venues as { name: string; tables: number; cuisine: string }[];
    expect(venues.map((v) => [v.tables, v.cuisine.split(" ")[1]]).sort()).toEqual([[1, "Gamma"], [2, "Alpha"]]);
    // Révélation : 3 tables composées dans les lieux confirmés ; lieu, cuisine et résumé sans les noms.
    await runSessionAutomation(sid, t.revealAt.getTime() + 60_000);
    expect((await session(sid)).groupsStatus).toBe("revealed");
    const groups = (await db().collection("groups").where("sessionId", "==", sid).get()).docs.map((d) => d.data());
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.namesAtCheckIn === true)).toBe(true);
    const r0 = (await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", group[0]!.uid).get()).docs[0]!.data();
    expect(r0.venue.name).toMatch(/Alpha|Gamma/);
    expect(r0.venue.cuisine).toMatch(/Cuisine (Alpha|Gamma)/);
    expect(r0.tableSummary).toMatchObject({ languages: ["fr"], sectors: ["tech"] });
    expect(JSON.stringify(r0.tableSummary)).not.toMatch(/T\d/);
    expect((await db().collection(`users/${group[0]!.uid}/notifications`).where("type", "==", "venue_revealed").get()).size).toBe(1);
    expect((await db().collection("mail").where("refs.sessionId", "==", sid).where("kind", "==", "venue_revealed").get()).size).toBe(10);
    // Check-in : on rejoint la liste des arrivés de sa table.
    await checkInSelf(group[0]!.uid, (await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", group[0]!.uid).get()).docs[0]!.id, new Date(start.getTime() - 10 * 60_000));
    expect((await db().doc(`groups/${r0.groupId}`).get()).data()!.arrivedUids).toEqual([group[0]!.uid]);
    // 1 h avant : récapitulatif à chaque lieu (prénoms par table).
    await runSessionAutomation(sid, t.finalAt.getTime() + 60_000);
    const recaps = await db().collection("mail").where("refs.sessionId", "==", sid).where("kind", "==", "venue_recap").get();
    expect(recaps.size).toBe(2);
    const alphaRecap = (await db().doc(`venueRequests/${alpha.id}`).get()).data()!.recap;
    expect(alphaRecap.tables).toHaveLength(2);
    expect(alphaRecap.tables[0].names[0]).toMatch(/^T\d/);
  });

  it("timeline du 24/11 : options la veille à 15h (une table de marge), nombre final à la fermeture (table en trop libérée)", async () => {
    const { sid, start } = await tablesSession();
    await partner("Option", start, 3, { level: "regular" });
    await partner("Marge", start, 3);
    await people(sid, 6);
    const t = tablesTimeline(start);
    // Avant 15h la veille : rien n'est demandé.
    await runSessionAutomation(sid, t.optionsAt.getTime() - 60_000);
    expect(await requestsOf(sid)).toHaveLength(0);
    // 15h : options pour 6 inscrits + une table de marge (11 personnes).
    await runSessionAutomation(sid, t.optionsAt.getTime() + 60_000);
    const opt = (await session(sid)).allocation;
    expect(opt).toMatchObject({ phase: "option", people: 11 });
    const optionTables = (await requestsOf(sid)).reduce((n, r) => n + Number(r.tables), 0);
    expect(optionTables).toBe(opt.needed);
    const adm = await member({ role: "admin" });
    for (const r of await requestsOf(sid)) await adm.call("adminRequestAction", { requestId: r.id, action: "confirm_phone" });
    // 20h30 : 6 inscrits → moins de tables ; la table en trop est libérée et le lieu prévenu.
    await runSessionAutomation(sid, t.closesAt.getTime() + 60_000);
    const fin = (await session(sid)).allocation;
    expect(fin).toMatchObject({ phase: "final", people: 6, status: "confirmed" });
    expect(fin.needed).toBeLessThan(opt.needed);
    const active = (await requestsOf(sid)).filter((r) => r.status === "confirmed");
    expect(active.reduce((n, r) => n + Number(r.tables), 0)).toBe(fin.needed);
    expect(active.reduce((n, r) => n + Number(r.people), 0)).toBe(6);
    expect((await db().collection("mail").where("refs.sessionId", "==", sid).where("kind", "==", "venue_final").get()).size).toBeGreaterThan(0);
    // Une seule fois.
    await runSessionAutomation(sid, t.closesAt.getTime() + 2 * 60_000);
    expect((await session(sid)).allocation.needed).toBe(fin.needed);
    // 21h30 : dévoilement ; récapitulatif au jour J 11h (ou la veille pour un début avant 14h).
    await runSessionAutomation(sid, t.revealAt.getTime() + 60_000);
    expect((await session(sid)).groupsStatus).toBe("revealed");
    await runSessionAutomation(sid, t.recapAt.getTime() + 60_000);
    expect((await db().collection("mail").where("refs.sessionId", "==", sid).where("kind", "==", "venue_recap").get()).size).toBe(active.length);
    // 1 h avant, sans changement : pas de mise à jour.
    await runSessionAutomation(sid, t.finalAt.getTime() + 60_000);
    expect((await db().collection("mail").where("refs.sessionId", "==", sid).where("kind", "==", "venue_recap").get()).size).toBe(active.length);
  });

  it("sans réponse : relance après 1 h, puis autre lieu après 2 h", async () => {
    const { sid, start } = await tablesSession();
    await partner("Lent", start, 1);
    await partner("Relais", start, 1);
    await people(sid, 4);
    const t = tablesTimeline(start);
    await runSessionAutomation(sid, t.closesAt.getTime() + 60_000);
    const [first] = await requestsOf(sid);
    const sentAt = ((await db().doc(`venueRequests/${first!.id}`).get()).data()!.sentAt as Timestamp).toMillis();
    expect(await processPendingRequests(sentAt + 61 * 60_000, sid)).toEqual({ reminded: 1, expired: 0 });
    expect(await processPendingRequests(sentAt + 121 * 60_000, sid)).toEqual({ reminded: 0, expired: 1 });
    const after = await requestsOf(sid);
    expect(after.map((r) => r.status).sort()).toEqual(["expired", "sent"]);
  });

  it("date à risque : alerte la veille ; autre date proposée ; accepter déplace, refuser rembourse", async () => {
    const { sid, expId, start } = await tablesSession();
    const other = db().collection("sessions").doc();
    await other.set({ ...(await session(sid)), startAt: Timestamp.fromMillis(start.getTime() + 24 * HOUR), seatsConfirmed: 0, seatsHeld: 0 });
    await db().doc(`experiences/${expId}/private/venue`).set({ name: "Habituel", address: "2 rue Habituelle, Casablanca", geo: null, partnerName: "" });
    const [u1, u2] = await people(sid, 2);
    await runSessionAutomation(sid, start.getTime() - 23 * HOUR);
    expect((await session(sid)).risk).toMatchObject({ status: "at_risk" });
    const adm = await member({ role: "admin" });
    expect(await adm.call("adminRiskDecision", { sessionId: sid, action: "propose", targetSessionId: other.id })).toMatchObject({ ok: true, notified: 2 });
    const r1 = (await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", u1!.uid).get()).docs[0]!;
    const r2 = (await db().collection("reservations").where("sessionId", "==", sid).where("userId", "==", u2!.uid).get()).docs[0]!;
    expect(r1.data().proposal).toMatchObject({ kind: "date", status: "pending", targetSessionId: other.id });
    await u1!.call("respondProposal", { reservationId: r1.id, accept: true });
    expect(await reservation(r1.id)).toMatchObject({ sessionId: other.id, status: "confirmed", proposal: { status: "accepted" } });
    await u2!.call("respondProposal", { reservationId: r2.id, accept: false });
    expect((await reservation(r2.id)).status).toBe("refunded");
    expect(await session(other.id)).toMatchObject({ seatsConfirmed: 1 });
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 0 });
  });

  it("déplacer sa réservation sur une autre date, jusqu'à la fermeture", async () => {
    const sid = await makeSession({ startInHours: 72 });
    const s = await session(sid);
    const other = db().collection("sessions").doc();
    await other.set({ ...s, startAt: Timestamp.fromMillis((s.startAt as Timestamp).toMillis() + 7 * 24 * HOUR), seatsConfirmed: 0, seatsHeld: 0 });
    const foreign = await makeSession({ startInHours: 96 });
    const u = await member();
    const { reservationId } = await paidReservation(u, sid);
    expect(await refusal(u.call("moveMyReservation", { reservationId, targetSessionId: foreign }))).toBe("failed-precondition:different_experience");
    expect(await refusal((await member()).call("moveMyReservation", { reservationId, targetSessionId: other.id }))).toBe("not-found:not_found");
    await u.call("moveMyReservation", { reservationId, targetSessionId: other.id });
    expect(await reservation(reservationId)).toMatchObject({ sessionId: other.id, status: "confirmed" });
    expect(await session(sid)).toMatchObject({ seatsConfirmed: 0 });
    expect(await session(other.id)).toMatchObject({ seatsConfirmed: 1 });
    // Date déjà fermée : plus de déplacement.
    const soon = await makeSession({ startInHours: 48 });
    const v = await member();
    const later = db().collection("sessions").doc();
    await later.set({ ...(await session(soon)), startAt: Timestamp.fromMillis(Date.now() + 96 * HOUR), seatsConfirmed: 0, seatsHeld: 0 });
    const own = await paidReservation(v, soon);
    await db().doc(`sessions/${soon}`).update({ startAt: Timestamp.fromMillis(Date.now() + HOUR) });
    expect(await refusal(v.call("moveMyReservation", { reservationId: own.reservationId, targetSessionId: later.id }))).toBe("failed-precondition:closed");
  });

  it("messages de la table : après le check-in, 2 h après le début", async () => {
    const sid = await makeSession({ startInHours: -3, mode: "social_dinner" });
    const a = await member();
    const b = await member();
    const gid = `${sid}_t1`;
    await db().doc(`groups/${gid}`).set({ sessionId: sid, label: "Table 1", status: "revealed", namesAtCheckIn: true, memberIds: [a.uid, b.uid], arrivedUids: [a.uid], members: [{ uid: a.uid, firstName: "Ana", interests: [] }, { uid: b.uid, firstName: "Bilal", interests: [] }] });
    expect(await refusal(b.call("sendTableMessage", { groupId: gid, text: "Salut" }))).toBe("not-found:not_found");
    await a.call("sendTableMessage", { groupId: gid, text: "Merci pour la soirée !" });
    const msgs = (await db().collection(`groups/${gid}/messages`).get()).docs.map((d) => d.data());
    expect(msgs).toMatchObject([{ uid: a.uid, firstName: "Ana", text: "Merci pour la soirée !" }]);
  });

  it("liste d'attente : questionnaire exigé à l'inscription, repris sur la place proposée", async () => {
    const q = QUESTIONNAIRE_TEMPLATES.find((x) => x.questions.length > 0)!;
    const sid = await makeSession({ capacity: 1, extra: { questionnaire: q.questions } });
    const first = await member();
    const answers = Object.fromEntries(q.questions.map((x) => [x.id, 0]));
    await first.call("createReservation", { sessionId: sid, seats: 1, answers });
    const w = await member();
    expect(await refusal(w.call("joinWaitlist", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:questionnaire_required");
    expect(await w.call("joinWaitlist", { sessionId: sid, seats: 1, answers })).toEqual({ status: "waiting" });
    expect((await db().doc(`sessions/${sid}/waitlist/${w.uid}`).get()).data()!.answers).toEqual(answers);
  });

  it("lieu fixe (activité) : demande de confirmation au lieu la veille", async () => {
    const sid = await makeSession({ startInHours: 20 });
    const s = await session(sid);
    const pid = await partner("Fixe", (s.startAt as Timestamp).toDate(), 2, { formats: ["padel"], unit: "court" });
    await db().doc(`experiences/${s.experienceId}/private/economics`).set({ partnerId: pid, model: "own" });
    await paidReservation(await member(), sid);
    await runSessionAutomation(sid, Date.now());
    const [req] = await requestsOf(sid);
    expect(req).toMatchObject({ fixed: true, status: "sent", people: 1, partnerId: pid });
  });
});

/* Dernier bloc du fichier : la vitrine efface TOUS les événements de l'émulateur. */
describe("vitrine : remplacer tous les événements (Étape M)", () => {
  it("super-admin seulement, confirmation SUPPRIMER exigée", async () => {
    const adm = await member({ role: "admin" });
    const sup = await member({ role: "superadmin" });
    const data = { tables: [], activities: [], weeks: 1 };
    expect(await refusal(adm.call("adminResetShowcase", { ...data, confirm: "SUPPRIMER" }))).toBe("permission-denied:");
    expect(await refusal(sup.call("adminResetShowcase", data))).toBe("failed-precondition:confirm_required");
    expect(await refusal(sup.call("adminResetShowcase", { ...data, confirm: "supprimer" }))).toBe("failed-precondition:confirm_required");
  });

  it("annule et rembourse, archive ou supprime l'existant, puis crée les événements des modèles", async () => {
    for (const c of ["eat", "move"]) await db().doc(`categories/${c}`).set({ isActive: true, parentId: null }, { merge: true });
    await db().doc("categories/diner").set({ isActive: true, parentId: "eat" }, { merge: true });
    // docs/25 : les modèles d'activités portent leur format (sous-catégorie de « move »).
    await db().doc("categories/yoga").set({ isActive: true, parentId: "move" }, { merge: true });
    // Aucun lieu actif ne doit accueillir le padel ; un seul accueille le yoga.
    const actives = await db().collection("partners").where("status", "==", "active").get();
    for (const p of actives.docs) if ((p.get("formats") ?? []).some((f: string) => f === "padel" || f === "yoga")) await p.ref.update({ status: "archived" });
    const yoga = db().collection("partners").doc();
    await yoga.set({ name: `Studio Yoga ${run}`, type: "studio", status: "active", cityId: "casablanca", district: "Gauthier", address: "5 rue du Yoga, Casablanca", formats: ["yoga"], tiers: [] });

    const booked = await makeSession({ startInHours: 72, price: 10000 });
    const u = await member();
    const { reservationId: resId } = await paidReservation(u, booked);
    const bookedExp = (await session(booked)).experienceId as string;
    const empty = await makeSession({ startInHours: 96 });
    const emptyExp = (await session(empty)).experienceId as string;

    const r = await resetShowcaseCore({ confirm: "SUPPRIMER", tables: [{ templateId: "diner", tier: "premium" }], activities: ["yoga", "padel"], weeks: 2 }, { uid: "sup-test", role: "superadmin" });
    expect((await reservation(resId)).status).toMatch(/cancelled|refunded/);
    expect((await session(booked)).status).toBe("cancelled");
    expect((await db().doc(`experiences/${bookedExp}`).get()).get("status")).toBe("archived");
    expect((await db().doc(`experiences/${emptyExp}`).get()).exists).toBe(false);
    expect((await db().doc(`sessions/${empty}`).get()).exists).toBe(false);
    expect(r.created.map((c) => `${c.templateId}/${c.tier}/${c.sessions}`).sort()).toEqual(["diner/premium/2", "yoga/null/2"]);
    expect(r.skipped).toEqual([{ templateId: "padel", tier: null, reason: "no_partner" }]);

    const live = (await db().collection("experiences").where("status", "==", "published").get()).docs;
    expect(live.map((d) => d.id).sort()).toEqual(r.created.map((c) => c.experienceId).sort());
    const diner = live.find((d) => d.get("templateId") === "diner")!.data();
    expect(diner).toMatchObject({ venueTier: "premium", images: [{ path: "/images/modeles/diner.webp" }] });
    const yogaExp = live.find((d) => d.get("templateId") === "yoga")!;
    expect((await db().doc(`experiences/${yogaExp.id}/private/economics`).get()).get("partnerId")).toBe(yoga.id);
    const sessions = await db().collection("sessions").where("experienceId", "==", yogaExp.id).get();
    expect(sessions.docs.every((s) => s.get("status") === "published" && (s.get("startAt") as Timestamp).toMillis() > Date.now() + 86_400_000)).toBe(true);
  }, 600_000);
});
