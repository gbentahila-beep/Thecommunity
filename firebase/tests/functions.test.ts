/**
 * Tests d'intégration des Cloud Functions, exécutés contre les émulateurs
 * (Auth + Firestore + Functions), comme un vrai navigateur.
 */
import { deleteApp, initializeApp as initAdmin, type App } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminDb } from "firebase-admin/firestore";
import { deleteApp as deleteClient, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PROJECT = "demo-thecommunity";
let admin: App;
let client: FirebaseApp;

const auth = () => getAuth(client);
const call = (name: string) => {
  const fns = getFunctions(client, "europe-west1");
  return httpsCallable(fns, name);
};
const waitFor = async <T>(fn: () => Promise<T | undefined>, ms = 15_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("délai dépassé");
};
const errorCode = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (e) {
    return (e as { code?: string }).code;
  }
};

const profile = {
  firstName: "Rita",
  lastName: "Test",
  birthDate: "1993-04-02",
  cityId: "casablanca",
  languages: ["fr", "darija"],
  interests: ["gastronomy", "art", "music"],
  socialGoals: ["meet_new_people"],
};

beforeAll(async () => {
  admin = initAdmin({ projectId: PROJECT }, "admin-tests");
  await adminDb(admin).doc("cities/casablanca").set({ isActive: true });
  client = initializeApp({ projectId: PROJECT, apiKey: "demo-key", authDomain: `${PROJECT}.firebaseapp.com` }, "client-tests");
  connectAuthEmulator(getAuth(client), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, port] = (process.env.FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001").split(":");
  connectFunctionsEmulator(getFunctions(client, "europe-west1"), host!, Number(port));
});
afterAll(async () => {
  await deleteClient(client);
  await deleteApp(admin);
});

describe("inscription et profil", () => {
  let uid = "";
  it("l'inscription crée le profil privé côté serveur (rôle « user »)", async () => {
    const cred = await createUserWithEmailAndPassword(auth(), `rita.${Date.now()}@example.com`, "MotDePasse!123");
    uid = cred.user.uid;
    const snap = await waitFor(async () => {
      const s = await adminDb(admin).doc(`users/${uid}`).get();
      return s.exists ? s : undefined;
    });
    expect(snap.data()).toMatchObject({ role: "user", status: "active", onboardingCompleted: false });
  });
  it("le questionnaire est revalidé et enregistré par le serveur", async () => {
    const res = await call("completeProfile")(profile);
    expect(res.data).toEqual({ ok: true });
    const data = (await adminDb(admin).doc(`users/${uid}`).get()).data();
    expect(data).toMatchObject({ firstName: "Rita", onboardingCompleted: true, role: "user", interests: ["gastronomy", "art", "music"] });
  });
  it("le genre est facultatif : absent ou null accepté", async () => {
    expect((await call("completeProfile")({ ...profile, gender: null })).data).toEqual({ ok: true });
    expect((await call("completeProfile")({ ...profile, gender: undefined })).data).toEqual({ ok: true });
  });
  it("le serveur refuse les moins de 18 ans et ignore les champs non prévus", async () => {
    expect(await errorCode(call("completeProfile")({ ...profile, birthDate: "2015-01-01" }))).toBe("functions/invalid-argument");
    await call("completeProfile")({ ...profile, role: "superadmin", status: "vip" });
    const data = (await adminDb(admin).doc(`users/${uid}`).get()).data();
    expect(data?.role).toBe("user");
    expect(data?.status).toBe("active");
  });
  it("l'acceptation des conditions est horodatée par le serveur, prospection décochée par défaut", async () => {
    expect(await errorCode(call("acceptTerms")({ terms: true, privacy: false, codeOfConduct: true, marketing: false }))).toBe("functions/invalid-argument");
    const res = await call("acceptTerms")({ terms: true, privacy: true, codeOfConduct: true, marketing: false });
    expect(res.data).toMatchObject({ ok: true });
    const data = (await adminDb(admin).doc(`users/${uid}`).get()).data();
    expect(data?.consents?.version).toBe("2026-11");
    expect(data?.consents?.terms?.toDate()).toBeInstanceOf(Date);
    expect(data?.notificationPrefs?.marketingEmail).toBe(false);
  });
  it("le serveur refuse une ville non ouverte", async () => {
    expect(await errorCode(call("completeProfile")({ ...profile, cityId: "atlantis" }))).toBe("functions/invalid-argument");
  });
  it("sans connexion : refus", async () => {
    await signOut(auth());
    expect(await errorCode(call("completeProfile")(profile))).toBe("functions/unauthenticated");
  });
});

describe("rôles", () => {
  it("un membre ne peut pas attribuer de rôle", async () => {
    await createUserWithEmailAndPassword(auth(), `membre.${Date.now()}@example.com`, "MotDePasse!123");
    expect(await errorCode(call("setUserRole")({ uid: auth().currentUser!.uid, role: "admin" }))).toBe("functions/permission-denied");
  });
  it("un super-admin peut nommer un admin ; l'action est journalisée", async () => {
    const email = `sam.${Date.now()}@example.com`;
    const sam = await adminAuth(admin).createUser({ email, password: "MotDePasse!123" });
    await adminAuth(admin).setCustomUserClaims(sam.uid, { role: "superadmin" });
    const target = await adminAuth(admin).createUser({ email: `cible.${Date.now()}@example.com`, password: "MotDePasse!123" });
    await signInWithEmailAndPassword(auth(), email, "MotDePasse!123");
    const res = await call("setUserRole")({ uid: target.uid, role: "admin" });
    expect(res.data).toEqual({ ok: true, role: "admin" });
    expect((await adminAuth(admin).getUser(target.uid)).customClaims?.role).toBe("admin");
    const logs = await adminDb(admin).collection("auditLogs").where("targetId", "==", target.uid).get();
    expect(logs.docs[0]?.data()).toMatchObject({ action: "user.setRole", actorUid: sam.uid, before: "user", after: "admin" });
  });
  it("un super-admin ne peut pas se retirer ses propres droits", async () => {
    const me = auth().currentUser!.uid;
    expect(await errorCode(call("setUserRole")({ uid: me, role: "user" }))).toBe("functions/failed-precondition");
  });
});

describe("back-office : expériences et comptes", () => {
  const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  const experience = {
    titleFr: "Dîner des créatifs",
    summaryFr: "Un dîner pour rencontrer des créatifs de Casablanca.",
    descriptionFr: "Une grande table réunit graphistes, photographes et architectes autour d'un menu de saison.",
    categoryId: "eat",
    cityId: "casablanca",
    district: "Racine",
    venueName: "Restaurant partenaire",
    address: "Boulevard Racine, Casablanca",
    revealPolicy: "on_group_reveal",
    bookingMode: "social_dinner",
    groupMin: 5, groupTarget: 6, groupMax: 7,
    maxSeatsPerBooking: 1,
    priceDh: 169,
    durationMinutes: 150,
    languages: ["fr"],
    alcoholServed: false,
    included: "Entrée, plat, dessert\nBoissons sans alcool",
    practicalInfo: "",
    cancellationPolicyId: "standard-48h",
    partnerId: "",
    economicsModel: "own",
    costPerSeatDh: 95,
    status: "published",
    sessions: { firstDate: future, time: "19:30", weeks: 3, capacity: 24 },
  };
  let adminEmail = "";

  beforeAll(async () => {
    await adminDb(admin).doc("categories/eat").set({ isActive: true, order: 1 });
    adminEmail = `ada.${Date.now()}@example.com`;
    const ada = await adminAuth(admin).createUser({ email: adminEmail, password: "MotDePasse!123" });
    await adminAuth(admin).setCustomUserClaims(ada.uid, { role: "admin" });
  });

  it("un membre ne peut pas créer d'expérience", async () => {
    await createUserWithEmailAndPassword(auth(), `m.${Date.now()}@example.com`, "MotDePasse!123");
    expect(await errorCode(call("adminSaveExperience")({ data: experience, addSessions: true, images: [] }))).toBe("functions/permission-denied");
  });

  it("un admin crée une expérience, son économie et 3 dates ; c'est journalisé", async () => {
    await signInWithEmailAndPassword(auth(), adminEmail, "MotDePasse!123");
    const res = (await call("adminSaveExperience")({ newId: "exp-test-createur", data: experience, addSessions: true, images: [{ path: "experiences/exp-test-createur/cover.webp", alt: "" }] })).data as { experienceId: string; slug: string; sessionsCreated: number };
    expect(res).toMatchObject({ experienceId: "exp-test-createur", slug: "diner-des-creatifs-casablanca", sessionsCreated: 3 });
    const db = adminDb(admin);
    const exp = (await db.doc("experiences/exp-test-createur").get()).data();
    expect(exp).toMatchObject({ status: "published", price: { amount: 16900, currency: "MAD" }, groupConfig: { minSize: 5, targetSize: 6, maxSize: 7 } });
    expect(exp?.included).toEqual([{ fr: "Entrée, plat, dessert" }, { fr: "Boissons sans alcool" }]);
    expect((await db.doc("experiences/exp-test-createur/private/economics").get()).data()).toMatchObject({ model: "own", costPerSeat: 9500 });
    const sessions = await db.collection("sessions").where("experienceId", "==", "exp-test-createur").get();
    expect(sessions.size).toBe(3);
    expect(sessions.docs.every((s) => s.data().seatsConfirmed === 0 && s.data().capacity === 24 && s.data().status === "published")).toBe(true);
    const logs = await db.collection("auditLogs").where("targetId", "==", "exp-test-createur").get();
    expect(logs.docs[0]?.data().action).toBe("experience.create");
  });

  it("les champs facultatifs vides (null) sont acceptés", async () => {
    const res = (await call("adminSaveExperience")({ data: { ...experience, bookingMode: "individual", revealPolicy: "immediate", groupMin: null, groupTarget: null, groupMax: null, commissionPercent: null, titleAr: null, partnerId: null, sessions: { ...experience.sessions, weeks: 1 } }, addSessions: true, images: [] })).data as { sessionsCreated: number };
    expect(res.sessionsCreated).toBe(1);
  });
  it("le même titre donne une adresse différente", async () => {
    const res = (await call("adminSaveExperience")({ data: experience, addSessions: true, images: [] })).data as { slug: string };
    expect(res.slug).toBe("diner-des-creatifs-casablanca-3");
  });

  it("modification : brouillon → les dates sans inscrits repassent en brouillon, sans toucher aux places", async () => {
    await call("adminSaveExperience")({ experienceId: "exp-test-createur", data: { ...experience, status: "draft", titleFr: "Dîner des créatifs (v2)" }, addSessions: false, images: [] });
    const db = adminDb(admin);
    const exp = (await db.doc("experiences/exp-test-createur").get()).data();
    expect(exp?.title.fr).toBe("Dîner des créatifs (v2)");
    expect(exp?.slug).toBe("diner-des-creatifs-casablanca");
    expect(exp?.images).toEqual([{ path: "experiences/exp-test-createur/cover.webp", alt: { fr: "Dîner des créatifs" } }]);
    const sessions = await db.collection("sessions").where("experienceId", "==", "exp-test-createur").get();
    expect(sessions.docs.every((s) => s.data().status === "draft" && s.data().experienceSnapshot.title.fr === "Dîner des créatifs (v2)")).toBe(true);
  });

  it("refuse une photo hors du dossier de l'expérience, une date passée et des données incohérentes", async () => {
    expect(await errorCode(call("adminSaveExperience")({ data: experience, addSessions: true, images: [{ path: "users/x/avatar/a.webp", alt: "" }] }))).toBe("functions/invalid-argument");
    expect(await errorCode(call("adminSaveExperience")({ data: { ...experience, sessions: { ...experience.sessions, firstDate: "2020-01-01" } }, addSessions: true, images: [] }))).toBe("functions/invalid-argument");
    expect(await errorCode(call("adminSaveExperience")({ data: { ...experience, groupMin: 9 }, addSessions: true, images: [] }))).toBe("functions/invalid-argument");
    expect(await errorCode(call("adminSaveExperience")({ data: { ...experience, cityId: "rabat" }, addSessions: true, images: [] }))).toBe("functions/invalid-argument");
  });

  it("un admin suspend un membre : il ne peut plus se connecter ; un admin ne peut pas suspendre l'équipe", async () => {
    const memberEmail = `suspendu.${Date.now()}@example.com`;
    const member = await adminAuth(admin).createUser({ email: memberEmail, password: "MotDePasse!123" });
    const colleague = await adminAuth(admin).createUser({ email: `collegue.${Date.now()}@example.com`, password: "MotDePasse!123" });
    await adminAuth(admin).setCustomUserClaims(colleague.uid, { role: "admin" });
    expect((await call("adminSetUserStatus")({ uid: member.uid, status: "suspended" })).data).toEqual({ ok: true, status: "suspended" });
    expect((await adminAuth(admin).getUser(member.uid)).disabled).toBe(true);
    expect(await errorCode(call("adminSetUserStatus")({ uid: colleague.uid, status: "suspended" }))).toBe("functions/permission-denied");
    await signOut(auth());
    expect(await errorCode(signInWithEmailAndPassword(auth(), memberEmail, "MotDePasse!123"))).toBe("auth/user-disabled");
  });
});
