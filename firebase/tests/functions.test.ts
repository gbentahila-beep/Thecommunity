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
