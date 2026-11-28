/**
 * docs/25, lot C — gamme voisine à la fermeture, et mémoire des restaurants, contre les émulateurs.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyTierFallback } from "../../functions/src/rendezvous/tier-fallback";
import { runSessionAutomation } from "../../functions/src/tables/automation";
import { visitedVenueKeys } from "../../functions/src/tables/venue-memory";
import { bookingClosesAt } from "@thecommunity/shared";

const PROJECT = "demo-thecommunity";
const PASSWORD = "MotDePasse!123";
let admin: App;
const clients: FirebaseApp[] = [];
const db = () => adminDb(admin);
const run = `tfb${Date.now().toString(36)}`;
const city = `ville-${run}`;

async function teamMember() {
  const email = `tfb.${run}@example.com`;
  const user = await adminAuth(admin).createUser({ email, password: PASSWORD, emailVerified: true });
  await db().doc(`users/${user.uid}`).set({ status: "active", onboardingCompleted: true, role: "admin", firstName: "Team", email }, { merge: true });
  await adminAuth(admin).setCustomUserClaims(user.uid, { role: "admin" });
  const app = initializeApp({ projectId: PROJECT, apiKey: "demo-key", authDomain: `${PROJECT}.firebaseapp.com` }, `client-${run}`);
  clients.push(app);
  connectAuthEmulator(getAuth(app), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, port] = (process.env.FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001").split(":");
  const fns = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(fns, host!, Number(port));
  await signInWithEmailAndPassword(getAuth(app), email, PASSWORD);
  return async (name: string, data: unknown) => (await httpsCallable(fns, name)(data)).data as Record<string, unknown>;
}

/** Une réservation confirmée posée directement (comptes fictifs). */
async function seat(sessionId: string, experienceId: string, startAt: Timestamp, tierFallback: boolean) {
  const user = await adminAuth(admin).createUser({ email: `p.${Math.random().toString(36).slice(2)}.${run}@example.com`, password: PASSWORD });
  await db().doc(`users/${user.uid}`).set({ firstName: "P", status: "active", role: "user" });
  const ref = db().collection("reservations").doc();
  await ref.set({ userId: user.uid, sessionId, experienceId, cityId: city, status: "confirmed", seats: 1, tierFallback, pricing: { total: 3500 }, sessionSnapshot: { title: { fr: "Dîner" }, startAt }, createdAt: Timestamp.now() });
  return { uid: user.uid, reservationId: ref.id };
}

beforeAll(async () => {
  admin = initAdmin({ projectId: PROJECT }, `admin-${run}`);
  await db().doc(`cities/${city}`).set({ name: { fr: "Ville test" }, isActive: true });
});
afterAll(async () => {
  await Promise.all(clients.map((c) => deleteClient(c)));
  await deleteApp(admin);
});

describe("gamme voisine (lot C)", () => {
  it("à la fermeture, la Casual incomplète rejoint la Premium pour qui l'a accepté ; une seule fois ; le reste suit le minimum", async () => {
    const call = await teamMember();
    const base = db().collection("experiences").doc();
    await base.set({
      slug: `diner-${run}`, title: { fr: "Dîner" }, status: "published", bookingMode: "social_dinner", subcategoryId: "diner", categoryId: "eat", cityId: city, maxSeatsPerBooking: 1, district: "",
      venue: { name: "Maison Test", address: "1 rue Test", revealPolicy: "immediate" }, images: [], price: { amount: 3500, currency: "MAD" }, durationMinutes: 150,
      cancellationPolicyId: "standard-48h", admission: "direct", membersOnly: false, groupConfig: { minSize: 4, targetSize: 6, maxSize: 6 },
    });
    const out = await call("adminSaveRendezvous", { titleFr: "Dîner du mercredi", cityId: city, weekday: 3, time: "20:30", capacity: 24, baseExperienceId: base.id, tiers: [{ tier: "casual", frequency: "weekly" }, { tier: "premium", frequency: "weekly" }] });
    const tiers = out.tiers as { tier: string; experienceId: string }[];
    const casualExp = tiers.find((t) => t.tier === "casual")!.experienceId;
    const premiumExp = tiers.find((t) => t.tier === "premium")!.experienceId;
    const first = async (exp: string) => (await db().collection("sessions").where("experienceId", "==", exp).get()).docs.sort((a, b) => (a.get("startAt") as Timestamp).toMillis() - (b.get("startAt") as Timestamp).toMillis())[0]!;
    const casual = await first(casualExp);
    const premium = await first(premiumExp);
    expect((casual.get("startAt") as Timestamp).toMillis()).toBe((premium.get("startAt") as Timestamp).toMillis());
    const startAt = casual.get("startAt") as Timestamp;

    // Casual : 2 inscrits (un seul accepte la gamme voisine) ; Premium : 5 inscrits.
    const ok = await seat(casual.id, casualExp, startAt, true);
    const stay = await seat(casual.id, casualExp, startAt, false);
    for (let i = 0; i < 5; i++) await seat(premium.id, premiumExp, startAt, true);
    await casual.ref.update({ seatsConfirmed: 2 });
    await premium.ref.update({ seatsConfirmed: 5 });

    expect(await applyTierFallback(String(casual.get("rendezvousId")), startAt)).toBe(1);
    const moved = (await db().doc(`reservations/${ok.reservationId}`).get()).data()!;
    expect(moved).toMatchObject({ sessionId: premium.id, experienceId: premiumExp, tier: "premium", tierMovedFrom: "casual" });
    expect((await db().doc(`reservations/${stay.reservationId}`).get()).get("sessionId")).toBe(casual.id);
    expect((await casual.ref.get()).get("seatsConfirmed")).toBe(1);
    expect((await premium.ref.get()).get("seatsConfirmed")).toBe(6);
    const notes = await db().collection(`users/${ok.uid}/notifications`).where("type", "==", "tier_moved").get();
    expect(notes.size).toBe(1);
    // Une seule fois par date.
    expect(await applyTierFallback(String(casual.get("rendezvousId")), startAt)).toBe(0);

    // Le tour suivant de la tâche : la Casual (1 personne) est « à risque » dès la fermeture (minimum non atteint).
    const closes = bookingClosesAt(startAt.toDate(), { closeRule: "eve" }).getTime();
    await runSessionAutomation(casual.id, closes + 60_000);
    expect((await casual.ref.get()).get("risk.status")).toBe("at_risk");
    // La Premium (6) n'est pas à risque.
    await runSessionAutomation(premium.id, closes + 60_000);
    expect((await premium.ref.get()).get("risk")).toBeUndefined();
  });
});

describe("mémoire des restaurants (lot C)", () => {
  it("les lieux déjà fréquentés par un membre (dates passées) sont retrouvés par partenaire et par nom", async () => {
    const user = await adminAuth(admin).createUser({ email: `mem.${run}@example.com`, password: PASSWORD });
    const past = Timestamp.fromMillis(Date.now() - 7 * 86_400_000);
    const future = Timestamp.fromMillis(Date.now() + 7 * 86_400_000);
    await db().collection("reservations").add({ userId: user.uid, sessionId: "s-past", status: "attended", venue: { name: "La Sqala", address: "x", partnerId: "p-sqala" }, sessionSnapshot: { startAt: past } });
    await db().collection("reservations").add({ userId: user.uid, sessionId: "s-cancel", status: "cancelled", venue: { name: "Rick's Café", address: "x" }, sessionSnapshot: { startAt: past } });
    await db().collection("reservations").add({ userId: user.uid, sessionId: "s-next", status: "confirmed", venue: { name: "Le Cabestan", address: "x" }, sessionSnapshot: { startAt: future } });
    const keys = (await visitedVenueKeys([user.uid])).get(user.uid)!;
    expect([...keys].sort()).toEqual(["n:la sqala", "p:p-sqala"]);
  });
});
