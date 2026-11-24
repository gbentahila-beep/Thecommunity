/**
 * docs/25 — rendez-vous de la semaine (lot A), contre les émulateurs Auth + Firestore + Functions.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureAllRendezvousSessions } from "../../functions/src/rendezvous/rendezvous";
import { bookingClosesAt, MOROCCO_TIMEZONE, zonedParts } from "@thecommunity/shared";

const PROJECT = "demo-thecommunity";
const PASSWORD = "MotDePasse!123";
let admin: App;
const clients: FirebaseApp[] = [];
const db = () => adminDb(admin);
const run = `rdv${Date.now().toString(36)}`;
let seq = 0;
type Client = { uid: string; call: (name: string, data: unknown) => Promise<Record<string, unknown>> };

async function member(role?: "admin"): Promise<Client> {
  const n = ++seq;
  const email = `rdv.${run}.${n}@example.com`;
  const user = await adminAuth(admin).createUser({ email, password: PASSWORD, emailVerified: true });
  await db().doc(`users/${user.uid}`).set({ status: "active", onboardingCompleted: true, role: role ?? "user", firstName: `M${n}`, email }, { merge: true });
  if (role) await adminAuth(admin).setCustomUserClaims(user.uid, { role });
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
  try { await p; return "ok"; } catch (e) { const err = e as { code?: string; details?: { reason?: string } }; return `${String(err.code ?? "").replace("functions/", "")}:${err.details?.reason ?? ""}`; }
}

beforeAll(async () => {
  admin = initAdmin({ projectId: PROJECT }, `admin-${run}`);
  await db().doc("settings/payment").set({ provider: "sandbox", mode: "test" });
});
afterAll(async () => {
  await Promise.all(clients.map((c) => deleteClient(c)));
  await deleteApp(admin);
});

describe("rendez-vous de la semaine (lot A)", () => {
  it("créer « Dîner du mercredi » : une expérience par gamme, dates chaque mercredi, Exclusive le 1er du mois seulement", async () => {
    const team = await member("admin");
    const base = db().collection("experiences").doc();
    await base.set({ slug: `diner-${run}`, title: { fr: "Dîner" }, status: "published", bookingMode: "social_dinner", subcategoryId: "diner", categoryId: "eat", cityId: "casablanca", maxSeatsPerBooking: 2, district: "", venue: { name: "", address: "", revealPolicy: "on_group_reveal" }, images: [], price: { amount: 3500, currency: "MAD" }, durationMinutes: 150, cancellationPolicyId: "standard-48h", admission: "direct", membersOnly: false });
    const out = await team.call("adminSaveRendezvous", { titleFr: "Dîner du mercredi", cityId: "casablanca", weekday: 3, time: "20:30", capacity: 36, baseExperienceId: base.id, tiers: [{ tier: "casual", frequency: "weekly" }, { tier: "premium", frequency: "weekly" }, { tier: "exclusive", frequency: "first_of_month" }] });
    const tiers = out.tiers as { tier: string; experienceId: string }[];
    expect(tiers.map((t) => t.tier)).toEqual(["casual", "premium", "exclusive"]);
    expect(tiers[0]!.experienceId).toBe(base.id); // l'expérience de base devient la gamme Casual
    for (const t of tiers) {
      const e = (await db().doc(`experiences/${t.experienceId}`).get()).data()!;
      expect(e).toMatchObject({ rendezvousId: out.id, closeRule: "eve", venueTier: t.tier, status: "published" });
      const s = await db().collection("sessions").where("experienceId", "==", t.experienceId).get();
      const days = s.docs.map((d) => zonedParts((d.get("startAt") as Timestamp).toDate(), MOROCCO_TIMEZONE));
      expect(days.every((z) => z.weekday === 3 && z.hour === 20 && z.minute === 30)).toBe(true);
      if (t.tier === "exclusive") expect(days.every((z) => z.day <= 7)).toBe(true);
      else expect(s.size).toBeGreaterThanOrEqual(5);
      expect(s.docs[0]!.get("capacity")).toBe(36);
    }
    // La tâche de nuit ne recrée rien.
    const before = (await db().collection("sessions").where("rendezvousId", "==", out.id).get()).size;
    await ensureAllRendezvousSessions();
    expect((await db().collection("sessions").where("rendezvousId", "==", out.id).get()).size).toBe(before);

    // Réservation : gamme et accord « gamme voisine » enregistrés.
    const u = await member();
    const premium = tiers.find((t) => t.tier === "premium")!.experienceId;
    // Sans lieux partenaires dans les émulateurs, le plafond « lieux compatibles » serait 0 : lieu fixe pour ce test.
    await db().doc(`experiences/${premium}`).update({ venue: { name: "Maison Test", address: "1 rue Test", revealPolicy: "immediate" } });
    const next = (await db().collection("sessions").where("experienceId", "==", premium).get()).docs
      .sort((a, b) => (a.get("startAt") as Timestamp).toMillis() - (b.get("startAt") as Timestamp).toMillis())
      .find((d) => bookingClosesAt((d.get("startAt") as Timestamp).toDate(), { bookingMode: "social_dinner", closeRule: "eve" }).getTime() > Date.now())!; // la date ouverte
    const { reservationId } = await u.call("createReservation", { sessionId: next.id, seats: 1, tierFallback: false });
    expect((await db().doc(`reservations/${reservationId}`).get()).data()).toMatchObject({ rendezvousId: out.id, tier: "premium", tierFallback: false });

    // Fermeture la veille à 20h30 : une date dont la veille 20h30 est passée n'est plus réservable.
    const tomorrow = db().collection("sessions").doc();
    const start = new Date(Date.now() + 20 * 3_600_000);
    await tomorrow.set({ ...next.data(), startAt: Timestamp.fromDate(start), endAt: Timestamp.fromDate(new Date(start.getTime() + 2 * 3_600_000)), seatsConfirmed: 0, seatsHeld: 0 });
    const eve = zonedParts(new Date(start.getTime() - 86_400_000), MOROCCO_TIMEZONE);
    const closed = zonedParts(new Date(), MOROCCO_TIMEZONE).hour * 60 + zonedParts(new Date(), MOROCCO_TIMEZONE).minute >= 20 * 60 + 30 || eve.day !== zonedParts(new Date(), MOROCCO_TIMEZONE).day;
    const v = await member();
    expect(await refusal(v.call("createReservation", { sessionId: tomorrow.id, seats: 1 }))).toBe(closed ? "failed-precondition:closed" : "ok");
  });

  it("fenêtre : une seule date ouverte, la suivante avec le Pass, jamais la troisième ; liste d'attente idem", async () => {
    const team = await member("admin");
    const base = db().collection("experiences").doc();
    await base.set({ slug: `brunch-${run}`, title: { fr: "Brunch" }, status: "published", bookingMode: "individual", subcategoryId: "brunch", categoryId: "eat", cityId: "casablanca", maxSeatsPerBooking: 2, district: "", venue: { name: "Maison Brunch", address: "2 rue Test", revealPolicy: "immediate" }, images: [], price: { amount: 3500, currency: "MAD" }, durationMinutes: 120, cancellationPolicyId: "standard-48h", admission: "direct", membersOnly: false });
    const out = await team.call("adminSaveRendezvous", { titleFr: "Brunch du dimanche", cityId: "casablanca", weekday: 0, time: "12:30", capacity: 20, baseExperienceId: base.id, tiers: [{ tier: "casual", frequency: "weekly" }] });
    const expId = (out.tiers as { experienceId: string }[])[0]!.experienceId;
    const dates = (await db().collection("sessions").where("experienceId", "==", expId).get()).docs
      .sort((a, b) => (a.get("startAt") as Timestamp).toMillis() - (b.get("startAt") as Timestamp).toMillis());
    // La première date peut déjà être fermée (si on est samedi soir) : on part des dates encore ouvertes.
    const open = dates.filter((d) => bookingClosesAt((d.get("startAt") as Timestamp).toDate(), { bookingMode: "individual", closeRule: "eve" }).getTime() > Date.now());
    const [d1, d2, d3] = open;
    const u = await member();
    expect(await refusal(u.call("createReservation", { sessionId: d2!.id, seats: 1 }))).toBe("failed-precondition:not_yet_open");
    expect((await u.call("createReservation", { sessionId: d1!.id, seats: 1 })).status).toBe("pending_payment");
    // Abonné Pass : une date d'avance, pas deux.
    const p = await member();
    await db().doc(`memberships/${p.uid}`).set({ uid: p.uid, status: "active", startAt: Timestamp.fromMillis(Date.now() - 86_400_000), endAt: Timestamp.fromMillis(Date.now() + 60 * 86_400_000) });
    expect((await p.call("createReservation", { sessionId: d2!.id, seats: 1 })).status).toBe("confirmed"); // place incluse dans le pass (35 DH)
    expect(await refusal(p.call("createReservation", { sessionId: d3!.id, seats: 1 }))).toBe("failed-precondition:not_yet_open");
    // Liste d'attente : seulement pour une date ouverte.
    await db().doc(`sessions/${d2!.id}`).update({ capacity: 1 });
    const w = await member();
    expect(await refusal(w.call("joinWaitlist", { sessionId: d2!.id, seats: 1 }))).toBe("failed-precondition:not_yet_open");
  });

  it("réservé à l'équipe", async () => {
    const u = await member();
    expect(await refusal(u.call("adminSaveRendezvous", { titleFr: "X", cityId: "casablanca", weekday: 3, time: "20:30", capacity: 10, baseExperienceId: "x", tiers: [{ tier: "casual", frequency: "weekly" }] }))).toBe("permission-denied:");
  });
});
