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
async function member(opts: { verified?: boolean; onboarded?: boolean } = {}): Promise<Client> {
  const n = ++seq; // capturé AVANT les await : chaque client a son propre nom d'application
  const email = `membre.${run}.${n}@example.com`;
  const user = await adminAuth(admin).createUser({ email, password: PASSWORD, emailVerified: opts.verified ?? true });
  await db().doc(`users/${user.uid}`).set({ status: "active", onboardingCompleted: opts.onboarded ?? true, role: "user" }, { merge: true });
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

async function makeSession(opts: { capacity?: number; price?: number; startInHours?: number; mode?: string; maxSeats?: number } = {}) {
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
