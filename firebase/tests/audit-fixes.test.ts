/**
 * Corrections de l'audit du 23/11 (docs/24), contre les émulateurs Auth + Firestore + Functions.
 * Chaque cas reproduit d'abord le défaut constaté, puis vérifie le comportement attendu.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PROJECT = "demo-thecommunity";
const PASSWORD = "MotDePasse!123";
let admin: App;
const clients: FirebaseApp[] = [];
const db = () => adminDb(admin);
const run = `audit${Date.now().toString(36)}`;
let seq = 0;
const H = 3_600_000;

type Client = { uid: string; call: (name: string, data: unknown) => Promise<Record<string, unknown>> };

async function member(opts: { role?: "admin" | "superadmin"; extra?: Record<string, unknown> } = {}): Promise<Client> {
  const n = ++seq;
  const email = `membre.${run}.${n}@example.com`;
  const user = await adminAuth(admin).createUser({ email, password: PASSWORD, emailVerified: true });
  await db().doc(`users/${user.uid}`).set({ status: "active", onboardingCompleted: true, role: opts.role ?? "user", firstName: `Membre${n}`, email, ...(opts.extra ?? {}) }, { merge: true });
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

async function refusal(p: Promise<unknown>) {
  try {
    await p;
    return "ok";
  } catch (e) {
    const err = e as { code?: string; details?: { reason?: string } };
    return `${String(err.code ?? "").replace("functions/", "")}:${err.details?.reason ?? ""}`;
  }
}

/** Expérience + une date ; `more` ajoute des dates à la même expérience (heures après maintenant). */
async function makeExperience(opts: { capacity?: number; price?: number; startInHours?: number; mode?: string; more?: number[]; extra?: Record<string, unknown>; sessionExtra?: Record<string, unknown> } = {}) {
  const expRef = db().collection("experiences").doc();
  const mode = opts.mode ?? "individual";
  await expRef.set({
    slug: `audit-${expRef.id}`, title: { fr: "Atelier audit" }, status: "published", bookingMode: mode, maxSeatsPerBooking: 2, district: "Gauthier",
    venue: { name: "Studio Audit", address: "12 rue Test, Casablanca", revealPolicy: "immediate", geo: { lat: 33.59, lng: -7.62 } },
    images: [], cancellationPolicyId: "standard-48h", admission: "direct", membersOnly: false, ...(opts.extra ?? {}),
  });
  const mk = async (hours: number) => {
    const start = Date.now() + hours * H;
    const ref = db().collection("sessions").doc();
    await ref.set({
      experienceId: expRef.id,
      experienceSnapshot: { title: { fr: "Atelier audit" }, slug: `audit-${expRef.id}`, coverImagePath: "", categoryId: "create", bookingMode: mode, district: "Gauthier" },
      cityId: "casablanca", categoryId: "create", startAt: Timestamp.fromMillis(start), endAt: Timestamp.fromMillis(start + 2 * H),
      price: { amount: opts.price ?? 30000, currency: "MAD" }, capacity: opts.capacity ?? 12, seatsConfirmed: 0, seatsHeld: 0, waitlistCount: 0, status: "published",
      ...(opts.sessionExtra ?? {}),
    });
    return ref.id;
  };
  const first = await mk(opts.startInHours ?? 72);
  const others: string[] = [];
  for (const h of opts.more ?? []) others.push(await mk(h));
  return { experienceId: expRef.id, sid: first, others };
}

const reservation = async (id: string) => (await db().doc(`reservations/${id}`).get()).data()!;
const session = async (id: string) => (await db().doc(`sessions/${id}`).get()).data()!;

async function paid(u: Client, sessionId: string, seats = 1) {
  const { reservationId } = await u.call("createReservation", { sessionId, seats });
  const { paymentId } = await u.call("startCheckout", { reservationId });
  await u.call("sandboxCompletePayment", { paymentId, outcome: "succeeded" });
  return reservationId as string;
}

/** Place une réservation dans une table révélée (comme après la composition des tables). */
async function seat(groupId: string, sessionId: string, people: { u: Client; reservationId: string; arrived?: boolean }[]) {
  await db().doc(`groups/${groupId}`).set({
    sessionId, label: "Table 1", status: "revealed", memberIds: people.map((p) => p.u.uid), arrivedUids: people.filter((p) => p.arrived).map((p) => p.u.uid),
    members: people.map((p, i) => ({ uid: p.u.uid, firstName: `P${i}`, interests: [] })), seats: people.length,
  });
  for (const p of people) await db().doc(`reservations/${p.reservationId}`).update({ groupId });
}

beforeAll(async () => {
  admin = initAdmin({ projectId: PROJECT }, `admin-${run}`);
  await db().doc("cities/casablanca").set({ isActive: true }, { merge: true });
  await db().doc("settings/payment").set({ provider: "sandbox", mode: "test" });
});
afterAll(async () => {
  await Promise.all(clients.map((c) => deleteClient(c)));
  await deleteApp(admin);
});

describe("lot 1 — changement de date", () => {
  it("déplacer à moins de 48 h puis annuler loin de la nouvelle date : pas de remboursement (date d'origine)", async () => {
    const { sid, others } = await makeExperience({ startInHours: 20, more: [200] });
    const u = await member();
    const rid = await paid(u, sid);
    expect(await u.call("moveMyReservation", { reservationId: rid, targetSessionId: others[0] })).toEqual({ ok: true });
    const r = await reservation(rid);
    expect((r.refundBasisAt as Timestamp).toMillis()).toBe(((await session(sid)).startAt as Timestamp).toMillis());
    expect(await u.call("cancelReservation", { reservationId: rid })).toMatchObject({ ok: true, refundAmount: 0 });
  });

  it("déplacer plus de 48 h avant : l'annulation reste remboursée intégralement", async () => {
    const { sid, others } = await makeExperience({ startInHours: 100, more: [200] });
    const u = await member();
    const rid = await paid(u, sid);
    await u.call("moveMyReservation", { reservationId: rid, targetSessionId: others[0] });
    expect(await u.call("cancelReservation", { reservationId: rid })).toMatchObject({ refundAmount: 30000 });
  });

  it("un déplacement fait par l'équipe ne change pas la date de référence", async () => {
    const team = await member({ role: "admin" });
    const { sid, others } = await makeExperience({ startInHours: 20, more: [200] });
    const u = await member();
    const rid = await paid(u, sid);
    await team.call("adminMoveReservation", { reservationId: rid, targetSessionId: others[0] });
    expect((await reservation(rid)).refundBasisAt).toBeUndefined();
    expect(await u.call("cancelReservation", { reservationId: rid })).toMatchObject({ refundAmount: 30000 });
  });

  it("la personne qui change de date quitte sa table", async () => {
    const { sid, others } = await makeExperience({ startInHours: 100, more: [200] });
    const a = await member();
    const b = await member();
    const ra = await paid(a, sid);
    const rb = await paid(b, sid);
    await seat(`${sid}_t1`, sid, [{ u: a, reservationId: ra, arrived: true }, { u: b, reservationId: rb }]);
    await a.call("moveMyReservation", { reservationId: ra, targetSessionId: others[0] });
    const g = (await db().doc(`groups/${sid}_t1`).get()).data()!;
    expect(g.memberIds).toEqual([b.uid]);
    expect(g.arrivedUids).toEqual([]);
    expect(g.members.map((m: { uid: string }) => m.uid)).toEqual([b.uid]);
  });
});

describe("lot 1 — table et chat après une annulation", () => {
  it("annulée par l'équipe pendant la soirée : retirée de la table, plus de message possible", async () => {
    const team = await member({ role: "admin" });
    const { sid } = await makeExperience({ startInHours: -0.25, mode: "social_dinner" });
    const a = await member();
    const b = await member();
    // Réservations confirmées directement (la date a commencé, on ne passe pas par le paiement).
    const mk = async (u: Client) => {
      const ref = db().collection("reservations").doc();
      const s = await session(sid);
      await ref.set({ userId: u.uid, sessionId: sid, experienceId: s.experienceId, seats: 1, status: "confirmed", pricing: { total: 0, currency: "MAD" }, sessionSnapshot: { title: { fr: "Dîner" }, slug: "x", startAt: s.startAt, endAt: s.endAt }, createdAt: Timestamp.now() });
      await db().doc(`sessions/${sid}/seatLocks/${u.uid}`).set({ reservationId: ref.id });
      return ref.id;
    };
    const ra = await mk(a);
    const rb = await mk(b);
    await db().doc(`sessions/${sid}`).update({ seatsConfirmed: 2 });
    await seat(`${sid}_t1`, sid, [{ u: a, reservationId: ra, arrived: true }, { u: b, reservationId: rb, arrived: true }]);
    await a.call("sendTableMessage", { groupId: `${sid}_t1`, text: "Bonsoir" });
    await team.call("adminCancelReservation", { reservationId: ra, refund: "none", reason: "Comportement contraire à la charte" });
    const g = (await db().doc(`groups/${sid}_t1`).get()).data()!;
    expect(g.memberIds).toEqual([b.uid]);
    expect(g.arrivedUids).toEqual([b.uid]);
    expect(g.removedUids).toEqual([a.uid]);
    expect(await refusal(a.call("sendTableMessage", { groupId: `${sid}_t1`, text: "Encore moi" }))).toBe("not-found:not_found");
    expect(await b.call("sendTableMessage", { groupId: `${sid}_t1`, text: "Ouf" })).toEqual({ ok: true });
    // Annulation par l'équipe : notification ET e-mail (rangé dans la boîte d'envoi de test).
    const mails = await db().collection("mail").where("refs.reservationId", "==", ra).get();
    expect(mails.docs.map((d) => d.data().kind)).toContain("reservation_cancelled_by_team");
  });
});

describe("lot 1 — suspension", () => {
  it("un compte suspendu perd ses réservations à venir (remboursées), sa liste d'attente et ses demandes", async () => {
    const team = await member({ role: "admin" });
    const { sid } = await makeExperience({ startInHours: 30 });
    const full = await makeExperience({ capacity: 1, startInHours: 50 });
    const u = await member();
    const other = await member();
    const rid = await paid(u, sid);
    await paid(other, full.sid);
    await u.call("joinWaitlist", { sessionId: full.sid, seats: 1 });
    const out = await team.call("adminSetUserStatus", { uid: u.uid, status: "suspended", reason: "Signalements" });
    expect(out).toMatchObject({ ok: true, cancelled: 1, refunded: 30000 });
    expect((await reservation(rid)).status).toBe("refunded");
    expect((await db().doc(`sessions/${full.sid}/waitlist/${u.uid}`).get()).data()!.status).toBe("left");
    expect((await session(full.sid)).waitlistCount).toBe(0);
    expect((await session(sid)).seatsConfirmed).toBe(0);
  });

  it("faute grave : l'équipe peut suspendre sans rembourser", async () => {
    const team = await member({ role: "admin" });
    const { sid } = await makeExperience({ startInHours: 30 });
    const u = await member();
    const rid = await paid(u, sid);
    expect(await team.call("adminSetUserStatus", { uid: u.uid, status: "suspended", refund: "none" })).toMatchObject({ cancelled: 1, refunded: 0 });
    expect((await reservation(rid)).status).toBe("cancelled");
  });
});

describe("lot 1 — signalements", () => {
  it("pendant l'expérience, depuis la réservation, pour tous les formats ; accusé de réception ; gel au 2e signalant", async () => {
    const team = await member({ role: "admin" });
    const { sid } = await makeExperience({ startInHours: 30 });
    const a = await member();
    const b = await member();
    const x = await member();
    const ra = await paid(a, sid);
    const rb = await paid(b, sid);
    await paid(x, sid);
    // Trop tôt : plus d'une heure avant le début.
    expect(await refusal(a.call("reportFromReservation", { reservationId: ra, otherUid: x.uid, reason: "harassment", details: "Propos déplacés" }))).toBe("failed-precondition:report_window");
    // La date commence : on avance le début de 30 h à maintenant − 10 min.
    const now = Date.now();
    await db().doc(`sessions/${sid}`).update({ startAt: Timestamp.fromMillis(now - 600_000), endAt: Timestamp.fromMillis(now + 2 * H) });
    for (const id of [ra, rb]) await db().doc(`reservations/${id}`).update({ "sessionSnapshot.startAt": Timestamp.fromMillis(now - 600_000), "sessionSnapshot.endAt": Timestamp.fromMillis(now + 2 * H) });

    expect(await a.call("reportFromReservation", { reservationId: ra, otherUid: x.uid, reason: "harassment", details: "Propos déplacés" })).toMatchObject({ ok: true });
    expect(await refusal(a.call("reportFromReservation", { reservationId: ra, otherUid: x.uid, reason: "harassment", details: "Encore" }))).toBe("failed-precondition:already_reported");
    const first = await db().collection("reports").where("reporterUid", "==", a.uid).get();
    expect(first.docs[0]!.data()).toMatchObject({ reportedUid: x.uid, sessionId: sid, duringEvent: true, status: "open" });
    expect((await db().collection(`users/${a.uid}/notifications`).where("type", "==", "report_received").get()).size).toBe(1);
    expect((await db().collection("mail").where("refs.reportId", "==", first.docs[0]!.id).get()).size).toBe(1);
    expect((await db().doc(`users/${x.uid}`).get()).data()!.bookingHold).toBeUndefined();

    // Sans connaître la personne (atelier sans table) : décrite dans le message.
    expect(await b.call("reportFromReservation", { reservationId: rb, otherUid: "", reason: "behaviour", details: "Homme en veste bleue, insistant" })).toMatchObject({ ok: true });
    expect((await db().doc(`users/${x.uid}`).get()).data()!.bookingHold).toBeUndefined();
    // 2e personne qui désigne x : compte gelé, plus de nouvelle réservation.
    expect(await b.call("reportFromReservation", { reservationId: rb, otherUid: x.uid, reason: "harassment", details: "Il a insisté pour mon numéro" })).toMatchObject({ ok: true });
    expect((await db().doc(`users/${x.uid}`).get()).data()!.bookingHold).toMatchObject({ active: true, reason: "reports" });
    const other = await makeExperience({ startInHours: 80 });
    expect(await refusal(x.call("createReservation", { sessionId: other.sid, seats: 1 }))).toBe("failed-precondition:account_under_review");
    // L'équipe lève le gel.
    await team.call("adminSetBookingHold", { uid: x.uid, active: false, note: "Malentendu" });
    expect((await x.call("createReservation", { sessionId: other.sid, seats: 1 })).status).toBe("pending_payment");
  });

  it("on ne signale que quelqu'un inscrit à la même date", async () => {
    const { sid } = await makeExperience({ startInHours: 0.5 });
    const elsewhere = await makeExperience({ startInHours: 0.5 });
    const a = await member();
    const z = await member();
    // Réservations directes (la date commence dans 30 min : réservations fermées).
    const mk = async (u: Client, s: string) => {
      const ref = db().collection("reservations").doc();
      const sd = await session(s);
      await ref.set({ userId: u.uid, sessionId: s, experienceId: sd.experienceId, seats: 1, status: "confirmed", pricing: { total: 0, currency: "MAD" }, sessionSnapshot: { title: { fr: "Atelier" }, slug: "x", startAt: sd.startAt, endAt: sd.endAt }, createdAt: Timestamp.now() });
      return ref.id;
    };
    const ra = await mk(a, sid);
    await mk(z, elsewhere.sid);
    expect(await refusal(a.call("reportFromReservation", { reservationId: ra, otherUid: z.uid, reason: "other", details: "Quelqu'un d'ailleurs" }))).toBe("not-found:not_found");
  });
});

describe("lot 1 — liste d'attente : mêmes contrôles qu'à la réservation", () => {
  it("âge minimum et conditions des activités physiques exigés à l'inscription ; l'accord suit la place proposée", async () => {
    const { sid } = await makeExperience({ capacity: 1, startInHours: 80, extra: { physicalActivity: true, minAge: 25 } });
    const first = await member({ extra: { birthDate: "1990-01-01" } });
    const { reservationId } = await first.call("createReservation", { sessionId: sid, seats: 1, physicalTermsAccepted: true });
    const young = await member({ extra: { birthDate: "2006-01-01" } });
    expect(await refusal(young.call("joinWaitlist", { sessionId: sid, seats: 1, physicalTermsAccepted: true }))).toBe("failed-precondition:too_young");
    const w = await member({ extra: { birthDate: "1992-05-05" } });
    expect(await refusal(w.call("joinWaitlist", { sessionId: sid, seats: 1 }))).toBe("failed-precondition:physical_terms_required");
    expect(await w.call("joinWaitlist", { sessionId: sid, seats: 1, physicalTermsAccepted: true })).toMatchObject({ status: "waiting" });
    await first.call("cancelReservation", { reservationId });
    const entry = (await db().doc(`sessions/${sid}/waitlist/${w.uid}`).get()).data()!;
    expect(entry.status).toBe("offered");
    expect((await reservation(entry.reservationId)).physicalTerms).toMatchObject({ version: expect.any(String) });
  });
});
