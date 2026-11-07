/**
 * Réservations et paiement de test (phase 4a), contre les émulateurs Auth + Firestore + Functions.
 * Chaque utilisateur est un vrai client (SDK web) qui appelle les callables comme le navigateur.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reserveSeats } from "../../functions/src/reservations/create-reservation";
import { expireDueHolds } from "../../functions/src/reservations/expire-holds";

const PROJECT = "demo-thecommunity";
const PASSWORD = "MotDePasse!123";
let admin: App;
const clients: FirebaseApp[] = [];
const db = () => adminDb(admin);
const run = Date.now().toString(36);
let seq = 0;

type Client = { uid: string; call: (name: string, data: unknown) => Promise<Record<string, unknown>> };

/** Crée un compte (e-mail vérifié, profil complété par défaut) et un client connecté. */
async function member(opts: { verified?: boolean; onboarded?: boolean; role?: "admin" } = {}): Promise<Client> {
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

async function makeSession(opts: { capacity?: number; price?: number; startInHours?: number; mode?: string; maxSeats?: number; onRequest?: boolean; messageRequired?: boolean; membersOnly?: boolean; memberPrice?: number; createdHoursAgo?: number } = {}) {
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
    membersOnly: opts.membersOnly ?? false,
    memberPrice: opts.memberPrice !== undefined ? { amount: opts.memberPrice, currency: "MAD" } : null,
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
    expect(await a.call("submitReview", { reservationId: ra.reservationId, rating: 5, comment: "Super soirée !" })).toEqual({ ok: true, reviewId: ra.reservationId });
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
    await u.call("submitReview", { reservationId: r.reservationId, rating: 2, comment: "Bof" });
    expect(await refusal(u.call("adminSetReviewStatus", { reviewId: r.reservationId, status: "hidden" }))).toBe("permission-denied:");
    await team.call("adminSetReviewStatus", { reviewId: r.reservationId, status: "hidden" });
    expect((await db().doc(`reviews/${r.reservationId}`).get()).data()!.status).toBe("hidden");
    expect((await db().doc(`experiences/${r.experienceId}`).get()).data()).toMatchObject({ ratingCount: 0, ratingAvg: 0 });
    await team.call("adminSetReviewStatus", { reviewId: r.reservationId, status: "published" });
    expect((await db().doc(`experiences/${r.experienceId}`).get()).data()).toMatchObject({ ratingCount: 1, ratingAvg: 2 });
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

describe("abonnement annuel", () => {
  let team: Client;
  const planInput = { nameFr: "The Host Club Membre", nameAr: "", priceDh: 990, discountPercent: 15, earlyAccessHours: 48, benefitsFr: "-15 % sur toutes les expériences\nAccès anticipé", benefitsAr: "", isActive: true };
  beforeAll(async () => {
    team = await member({ role: "admin" });
  });
  afterAll(async () => {
    await db().doc("membershipPlans/annual").set({ isActive: false, earlyAccessHours: 0 }, { merge: true });
  });
  const membership = async (uid: string) => (await db().doc(`memberships/${uid}`).get()).data();
  async function subscribe(u: Client) {
    const { paymentId } = await u.call("startMembershipCheckout", {});
    return u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" });
  }

  it("l'équipe règle la formule ; inactive, on ne peut pas souscrire", async () => {
    const u = await member();
    expect(await refusal(u.call("adminSaveMembershipPlan", planInput))).toBe("permission-denied:");
    await team.call("adminSaveMembershipPlan", { ...planInput, isActive: false });
    expect(await refusal(u.call("startMembershipCheckout", {}))).toBe("failed-precondition:membership_unavailable");
    await team.call("adminSaveMembershipPlan", planInput);
    expect((await db().doc("membershipPlans/annual").get()).data()).toMatchObject({ price: { amount: 99000 }, discountPercent: 15, earlyAccessHours: 48, isActive: true, benefits: [{ fr: "-15 % sur toutes les expériences" }, { fr: "Accès anticipé" }] });
  });

  it("souscription : paiement de 990 DH lu dans la formule, abonnement actif 12 mois, renouvellement 30 jours avant", async () => {
    const u = await member();
    const { paymentId } = await u.call("startMembershipCheckout", { amount: 1 });
    expect(await payment(paymentId as string)).toMatchObject({ purpose: "membership", amount: 99000, userId: u.uid, status: "initiated" });
    expect(await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" })).toMatchObject({ outcome: "confirmed", purpose: "membership" });
    const m = (await membership(u.uid))!;
    expect(m).toMatchObject({ status: "active", source: "purchase", planId: "annual" });
    const months = ((m.endAt as Timestamp).toMillis() - Date.now()) / (30.4 * 86_400_000);
    expect(months).toBeGreaterThan(11.8);
    expect(months).toBeLessThan(12.2);
    expect(await refusal(u.call("startMembershipCheckout", {}))).toBe("failed-precondition:already_member");
    // Échéance dans 10 jours : renouvellement possible, la nouvelle période part de l'échéance.
    const soon = Date.now() + 10 * 86_400_000;
    await db().doc(`memberships/${u.uid}`).update({ endAt: Timestamp.fromMillis(soon) });
    await subscribe(u);
    const renewed = ((await membership(u.uid))!.endAt as Timestamp).toMillis();
    expect((renewed - soon) / (30.4 * 86_400_000)).toBeGreaterThan(11.8);
    const notes = await db().collection(`users/${u.uid}/notifications`).where("type", "==", "membership_active").get();
    expect(notes.size).toBe(2);
  });

  it("prix membre appliqué par le serveur : -15 %, ou prix membre précis de l'expérience", async () => {
    const memberU = await member();
    const publicU = await member();
    await subscribe(memberU);
    const sid = await makeSession({ price: 30000 });
    const m = await memberU.call("createReservation", { sessionId: sid, seats: 2 });
    expect(m).toMatchObject({ total: 51000 });
    expect((await reservation(m.reservationId as string)).pricing).toMatchObject({ unitAmount: 30000, subtotal: 60000, memberDiscount: 9000, total: 51000 });
    const p = await publicU.call("createReservation", { sessionId: sid, seats: 1 });
    expect(p).toMatchObject({ total: 30000 });
    const special = await makeSession({ price: 30000, memberPrice: 20000 });
    expect(await memberU.call("createReservation", { sessionId: special, seats: 1 })).toMatchObject({ total: 20000 });
  });

  it("expérience réservée aux membres ; accès anticipé de 48 h aux nouvelles dates", async () => {
    const memberU = await member();
    const publicU = await member();
    await subscribe(memberU);
    const vip = await makeSession({ membersOnly: true });
    expect(await refusal(publicU.call("createReservation", { sessionId: vip, seats: 1 }))).toBe("failed-precondition:members_only");
    expect(await refusal(publicU.call("joinWaitlist", { sessionId: vip, seats: 1 }))).toBe("failed-precondition:members_only");
    expect(await memberU.call("createReservation", { sessionId: vip, seats: 1 })).toMatchObject({ status: "pending_payment" });
    const fresh = await makeSession({ createdHoursAgo: 1 });
    expect(await refusal(publicU.call("createReservation", { sessionId: fresh, seats: 1 }))).toBe("failed-precondition:members_early_access");
    expect(await memberU.call("createReservation", { sessionId: fresh, seats: 1 })).toMatchObject({ status: "pending_payment" });
    const older = await makeSession({ createdHoursAgo: 72 });
    expect(await publicU.call("createReservation", { sessionId: older, seats: 1 })).toMatchObject({ status: "pending_payment" });
  });

  it("offrir puis retirer un abonnement (journalisé) ; la place proposée depuis la liste d'attente est au prix membre", async () => {
    const u = await member();
    expect(await refusal(u.call("adminGrantMembership", { uid: u.uid, months: 3, reason: "test" }))).toBe("permission-denied:");
    await team.call("adminGrantMembership", { uid: u.uid, months: 3, reason: "Partenaire" });
    expect(await membership(u.uid)).toMatchObject({ status: "active", source: "gift" });

    // Liste d'attente : la place proposée à un membre est au prix membre.
    const sid = await makeSession({ capacity: 1, price: 30000 });
    const holder = await member();
    const { reservationId } = await paidReservation(holder, sid);
    await u.call("joinWaitlist", { sessionId: sid, seats: 1 });
    await holder.call("cancelReservation", { reservationId });
    const offer = (await db().doc(`sessions/${sid}/waitlist/${u.uid}`).get()).data()!;
    expect((await reservation(offer.reservationId)).pricing).toMatchObject({ memberDiscount: 4500, total: 25500 });

    await team.call("adminRevokeMembership", { uid: u.uid, reason: "Erreur" });
    expect((await membership(u.uid))!.status).toBe("revoked");
    const other = await makeSession({ price: 30000 });
    expect(await u.call("createReservation", { sessionId: other, seats: 1 })).toMatchObject({ total: 30000 });
    const logs = (await db().collection("auditLogs").where("targetId", "==", u.uid).get()).docs.map((d) => d.data().action).sort();
    expect(logs).toEqual(["membership.grant", "membership.revoke"]);
  });

  it("règles : la formule active est publique, l'abonnement n'est lisible que par son titulaire", async () => {
    const u = await member();
    await subscribe(u);
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
