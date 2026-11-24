/**
 * docs/25, lot E — la bascule vers les rendez-vous de la semaine, contre les émulateurs.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { archiveRetiredExperiences, launchRendezvousCore } from "../../functions/src/rendezvous/launch";
import { MOROCCO_TIMEZONE, zonedParts } from "@thecommunity/shared";

const PROJECT = "demo-thecommunity";
const PASSWORD = "MotDePasse!123";
let admin: App;
const clients: FirebaseApp[] = [];
const db = () => adminDb(admin);
const run = `lch${Date.now().toString(36)}`;
const city = `ville-${run}`;
const DAY = 86_400_000;

async function signedIn(role: "admin" | "superadmin") {
  const email = `launch.${run}.${role}@example.com`;
  const user = await adminAuth(admin).createUser({ email, password: PASSWORD, emailVerified: true });
  await db().doc(`users/${user.uid}`).set({ status: "active", onboardingCompleted: true, role, firstName: role, email }, { merge: true });
  await adminAuth(admin).setCustomUserClaims(user.uid, { role });
  const app = initializeApp({ projectId: PROJECT, apiKey: "demo-key", authDomain: `${PROJECT}.firebaseapp.com` }, `client-${run}-${role}`);
  clients.push(app);
  connectAuthEmulator(getAuth(app), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, port] = (process.env.FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001").split(":");
  const fns = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(fns, host!, Number(port));
  await signInWithEmailAndPassword(getAuth(app), email, PASSWORD);
  return async (data: unknown) => {
    try {
      await httpsCallable(fns, "adminLaunchRendezvous")(data);
      return "ok";
    } catch (e) {
      const err = e as { code?: string; details?: { reason?: string } };
      return `${String(err.code ?? "").replace("functions/", "")}:${err.details?.reason ?? ""}`;
    }
  };
}

async function experience(id: string, extra: Record<string, unknown>) {
  await db().doc(`experiences/${id}`).set({
    slug: id, title: { fr: id }, status: "published", bookingMode: "social_dinner", categoryId: "eat", cityId: city, maxSeatsPerBooking: 1, district: "",
    venue: { name: "", address: "", revealPolicy: "on_group_reveal" }, images: [], price: { amount: 3500, currency: "MAD" }, durationMinutes: 150,
    cancellationPolicyId: "standard-48h", admission: "direct", membersOnly: false, ...extra,
  });
}
async function session(experienceId: string, startAt: number, seatsConfirmed = 0) {
  const ref = db().collection("sessions").doc();
  await ref.set({ experienceId, cityId: city, startAt: Timestamp.fromMillis(startAt), endAt: Timestamp.fromMillis(startAt + 2 * 3_600_000), status: "published", capacity: 24, seatsConfirmed, seatsHeld: 0, waitlistCount: 0 });
  return ref;
}
/** Prochain jour de semaine `weekday` à 12h UTC, au moins `minDays` jours plus tard. */
function nextDay(weekday: number, minDays: number) {
  const d = new Date(Date.now() + minDays * DAY);
  d.setUTCHours(12, 0, 0, 0);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime();
}

beforeAll(async () => {
  admin = initAdmin({ projectId: PROJECT }, `admin-${run}`);
  await db().doc(`cities/${city}`).set({ name: { fr: "Ville test" }, isActive: true });
  await db().doc("categories/eat").set({ name: { fr: "Tables" }, parentId: null, isActive: true }, { merge: true });
  for (const sub of ["diner", "cafe", "brunch"]) await db().doc(`categories/${sub}`).set({ name: { fr: sub }, parentId: "eat", isActive: true }, { merge: true });
});
afterAll(async () => {
  await Promise.all(clients.map((c) => deleteClient(c)));
  await deleteApp(admin);
});

describe("bascule vers les rendez-vous (lot E)", () => {
  it("crée les 3 rendez-vous, reprend l'existant, retire le reste en honorant les réservations, sans doublon au 2e passage", async () => {
    const actor = { uid: "test-launch", role: "superadmin" };
    // Avant : un Dîner Casual issu du modèle (un mardi réservé, un mardi vide), un Déjeuner (une date réservée, une vide),
    // un Quiz sans date, un Running et un événement créé à la main.
    const diner = `${run}-diner-casual`;
    await experience(diner, { templateId: "diner", venueTier: "casual", subcategoryId: "diner" });
    const dinerBusy = await session(diner, nextDay(2, 3), 2);
    const dinerEmpty = await session(diner, nextDay(2, 10));
    const dej = `${run}-dejeuner`;
    await experience(dej, { templateId: "dejeuner", venueTier: "premium", subcategoryId: "dejeuner" });
    const dejBusy = await session(dej, nextDay(4, 3), 1);
    const dejEmpty = await session(dej, nextDay(4, 10));
    await experience(`${run}-quiz`, { templateId: "quiz", categoryId: "discover", bookingMode: "group" });
    await experience(`${run}-running`, { templateId: "running", categoryId: "move", bookingMode: "group" });
    await experience(`${run}-maison`, { categoryId: "eat" });

    const r = await launchRendezvousCore(actor, Date.now(), city);
    expect(r.skipped).toEqual([]);
    expect(r.rendezvous.map((x) => [x.id, x.created])).toEqual([[`diner-du-mercredi-${city}`, true], [`cafe-du-samedi-${city}`, true], [`brunch-du-dimanche-${city}`, true]]);

    // Dîner : la Casual existante est reprise, Premium et Exclusive créées depuis le modèle.
    const rv = (await db().doc(`rendezvous/diner-du-mercredi-${city}`).get()).data()!;
    expect(rv).toMatchObject({ weekday: 3, time: "20:30", status: "active", cityId: city });
    expect(rv.tiers.map((t: { tier: string; frequency: string }) => `${t.tier}:${t.frequency}`)).toEqual(["casual:weekly", "premium:weekly", "exclusive:first_of_month"]);
    expect(rv.tiers[0].experienceId).toBe(diner);
    expect(r.rendezvous[0]!.tiers.map((t) => t.reused)).toEqual([true, false, false]);
    for (const t of rv.tiers as { tier: string; experienceId: string }[]) {
      const e = (await db().doc(`experiences/${t.experienceId}`).get()).data()!;
      expect(e).toMatchObject({ rendezvousId: `diner-du-mercredi-${city}`, venueTier: t.tier, closeRule: "eve", status: "published", templateId: "diner" });
      expect(e.pricing).toMatchObject({ model: "variable_consumption" });
      const s = (await db().collection("sessions").where("experienceId", "==", t.experienceId).get()).docs.filter((d) => d.get("status") !== "cancelled");
      const onSlot = s.filter((d) => { const z = zonedParts((d.get("startAt") as Timestamp).toDate(), MOROCCO_TIMEZONE); return z.weekday === 3 && z.hour === 20 && z.minute === 30; });
      if (t.tier === "exclusive") expect(onSlot.every((d) => zonedParts((d.get("startAt") as Timestamp).toDate(), MOROCCO_TIMEZONE).day <= 7)).toBe(true);
      else expect(onSlot.length).toBeGreaterThanOrEqual(5);
    }
    // L'ancien mardi réservé est honoré ; le mardi vide disparaît.
    expect((await dinerBusy.get()).get("status")).toBe("published");
    expect((await dinerEmpty.get()).get("status")).toBe("cancelled");
    // Café et Brunch : Casual et Premium seulement.
    const cafe = (await db().doc(`rendezvous/cafe-du-samedi-${city}`).get()).data()!;
    expect(cafe).toMatchObject({ weekday: 6, time: "16:00" });
    expect(cafe.tiers.map((t: { tier: string }) => t.tier)).toEqual(["casual", "premium"]);

    // Retraits : Déjeuner gardé jusqu'à sa date réservée, Quiz archivé ; Running et l'événement fait main intacts.
    expect(r.retired.map((x) => x.experienceId).sort()).toEqual([dej, `${run}-quiz`].sort());
    expect((await db().doc(`experiences/${dej}`).get()).data()).toMatchObject({ status: "published", retiring: true });
    expect((await dejBusy.get()).get("status")).toBe("published");
    expect((await dejEmpty.get()).exists).toBe(false);
    expect((await db().doc(`experiences/${run}-quiz`).get()).get("status")).toBe("archived");
    expect((await db().doc(`experiences/${run}-running`).get()).get("status")).toBe("published");
    expect((await db().doc(`experiences/${run}-maison`).get()).get("status")).toBe("published");

    // Après la dernière date honorée, la tâche de nuit archive le Déjeuner.
    await archiveRetiredExperiences(Date.now() + 30 * DAY);
    expect((await db().doc(`experiences/${dej}`).get()).get("status")).toBe("archived");

    // 2e passage : rien de nouveau.
    const count = (await db().collection("experiences").where("cityId", "==", city).get()).size;
    const again = await launchRendezvousCore(actor, Date.now(), city);
    expect(again.rendezvous.every((x) => !x.created)).toBe(true);
    expect(again.retired).toEqual([]);
    expect((await db().collection("experiences").where("cityId", "==", city).get()).size).toBe(count);
  });

  it("le bouton du back-office : super-admin seulement, avec « BASCULER »", async () => {
    const asAdmin = await signedIn("admin");
    expect(await asAdmin({ confirm: "BASCULER", cityId: city })).toBe("permission-denied:");
    const asSuper = await signedIn("superadmin");
    expect(await asSuper({ confirm: "oui", cityId: city })).toBe("failed-precondition:confirm_required");
    expect(await asSuper({ confirm: "BASCULER", cityId: city })).toBe("ok");
  });
});
