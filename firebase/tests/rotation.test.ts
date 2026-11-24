/**
 * docs/25, lot D — l'activité du samedi (rotation), contre les émulateurs Auth + Firestore + Functions.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bookingClosesAt, localDayKey, rotationDays, rotationPlan } from "@thecommunity/shared";

const PROJECT = "demo-thecommunity";
const PASSWORD = "MotDePasse!123";
let admin: App;
const clients: FirebaseApp[] = [];
const db = () => adminDb(admin);
const run = `rot${Date.now().toString(36)}`;
const city = `ville-${run}`;
let seq = 0;
type Client = { uid: string; call: (name: string, data: unknown) => Promise<Record<string, unknown>> };

async function member(role?: "admin"): Promise<Client> {
  const n = ++seq;
  const email = `rot.${run}.${n}@example.com`;
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
async function activity(name: string) {
  const ref = db().collection("experiences").doc();
  await ref.set({
    slug: `${name}-${run}`, title: { fr: name }, status: "published", bookingMode: "individual", categoryId: "move", cityId: city, maxSeatsPerBooking: 1, district: "Maarif",
    venue: { name: `Lieu ${name}`, address: "1 rue Test", revealPolicy: "immediate" }, images: [], price: { amount: 3500, currency: "MAD" }, durationMinutes: 90,
    cancellationPolicyId: "standard-48h", admission: "direct", membersOnly: false,
  });
  return ref.id;
}
const rvSessions = async (id: string) =>
  (await db().collection("sessions").where("rendezvousId", "==", id).get()).docs
    .filter((d) => d.get("status") !== "cancelled" && (d.get("startAt") as Timestamp).toMillis() > Date.now())
    .sort((a, b) => (a.get("startAt") as Timestamp).toMillis() - (b.get("startAt") as Timestamp).toMillis());
const onDay = (list: FirebaseFirestore.QueryDocumentSnapshot[], day: string) => list.filter((d) => localDayKey((d.get("startAt") as Timestamp).toDate()) === day);

beforeAll(async () => {
  admin = initAdmin({ projectId: PROJECT }, `admin-${run}`);
  await db().doc("settings/payment").set({ provider: "sandbox", mode: "test" });
  await db().doc(`cities/${city}`).set({ name: { fr: "Ville test" }, isActive: true });
});
afterAll(async () => {
  await Promise.all(clients.map((c) => deleteClient(c)));
  await deleteApp(admin);
});

describe("activité du samedi (lot D)", () => {
  it("rotation, une seule date ouverte, samedi remplacé par la proposition d'un partenaire, inscrits honorés", async () => {
    const team = await member("admin");
    const [running, ceramique, padel] = [await activity("Running"), await activity("Céramique"), await activity("Padel")];
    // Une ancienne date de la céramique (un mardi) sans inscrit : retirée quand elle entre dans la rotation.
    const old = db().collection("sessions").doc();
    const tue = new Date(Date.now() + 3 * 86_400_000);
    await old.set({ experienceId: ceramique, cityId: city, startAt: Timestamp.fromDate(tue), endAt: Timestamp.fromDate(new Date(tue.getTime() + 3_600_000)), status: "published", capacity: 8, seatsConfirmed: 0, seatsHeld: 0, waitlistCount: 0 });

    const anchor = rotationDays(6, new Date(), 1)[0]!;
    const cycle = [{ experienceId: running, time: "09:00", capacity: 20 }, { experienceId: ceramique, time: "11:00", capacity: 8 }, { experienceId: padel, time: "10:00", capacity: 8 }];
    const out = await team.call("adminSaveRotation", { titleFr: "L'activité du samedi", cityId: city, weekday: 6, anchor, cycle });
    const id = String(out.id);
    expect((await old.get()).exists).toBe(false);
    for (const x of [running, ceramique, padel]) expect((await db().doc(`experiences/${x}`).get()).data()).toMatchObject({ rendezvousId: id, rendezvousKind: "rotation", closeRule: "eve" });

    // Une date par samedi, l'activité dont c'est le tour, à son heure.
    let list = await rvSessions(id);
    const days = rotationDays(6, new Date(), 6);
    const plan = rotationPlan({ weekday: 6, anchor, cycle }, days);
    for (const w of plan) {
      const s = onDay(list, w.date);
      if (!s.length) continue; // samedi du jour déjà commencé
      expect(s.map((d) => d.get("experienceId"))).toEqual([w.entry!.experienceId]);
    }
    expect(list.length).toBeGreaterThanOrEqual(5);

    // Une seule date ouverte pour toute la rotation (pas une par activité).
    const open = list.filter((d) => bookingClosesAt((d.get("startAt") as Timestamp).toDate(), { closeRule: "eve" }).getTime() > Date.now());
    const u = await member();
    expect(await refusal(u.call("createReservation", { sessionId: open[1]!.id, seats: 1 }))).toBe("failed-precondition:not_yet_open");
    expect(await refusal(u.call("createReservation", { sessionId: open[0]!.id, seats: 1 }))).toBe("ok");

    // Un partenaire propose du tennis : il remplace l'activité prévue du 2e samedi ouvert (personne inscrit).
    const tennis = await activity("Tennis");
    const day2 = localDayKey((open[1]!.get("startAt") as Timestamp).toDate());
    const planned2 = String(open[1]!.get("experienceId"));
    await team.call("adminSetRotationWeek", { id, date: day2, override: { experienceId: tennis, time: "15:00", capacity: 8, shift: false, note: "Club de tennis" } });
    list = await rvSessions(id);
    expect(onDay(list, day2).map((d) => d.get("experienceId"))).toEqual([tennis]);
    expect((await db().doc(`experiences/${tennis}`).get()).get("rendezvousKind")).toBe("rotation");

    // 3e samedi ouvert : des personnes sont inscrites ; « pas d'activité » ce jour-là → la date est GARDÉE.
    const day3 = localDayKey((open[2]!.get("startAt") as Timestamp).toDate());
    await open[2]!.ref.update({ seatsConfirmed: 2 });
    const r3 = await team.call("adminSetRotationWeek", { id, date: day3, override: { experienceId: null, shift: false } });
    expect(r3.kept).toBe(1);
    expect((await open[2]!.ref.get()).get("status")).toBe("published");

    // Retour à la rotation pour le 2e samedi : l'activité prévue revient, le tennis est retiré et détaché.
    await team.call("adminSetRotationWeek", { id, date: day2, override: null });
    list = await rvSessions(id);
    expect(onDay(list, day2).map((d) => d.get("experienceId"))).toEqual([planned2]);
    expect((await db().doc(`experiences/${tennis}`).get()).get("rendezvousId")).toBeUndefined();

    // Contrôles : un samedi qui n'est pas un samedi, une activité non publiée, un membre.
    expect(await refusal(team.call("adminSetRotationWeek", { id, date: "2099-01-01", override: null }))).toBe("invalid-argument:");
    const draft = await activity("Brouillon");
    await db().doc(`experiences/${draft}`).update({ status: "draft" });
    expect(await refusal(team.call("adminSetRotationWeek", { id, date: day2, override: { experienceId: draft, shift: false } }))).toBe("invalid-argument:");
    expect(await refusal(u.call("adminSetRotationWeek", { id, date: day2, override: null }))).toBe("permission-denied:");
  });
});
