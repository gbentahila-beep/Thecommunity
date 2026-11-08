import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, addDoc, type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore;
const as = (uid: string, role?: string) =>
  env.authenticatedContext(uid, role ? { role, email_verified: true } : { email_verified: true }).firestore() as unknown as Firestore;
const salma = () => as("salma");
const karim = () => as("karim");
const admin = () => as("ada", "admin");
const superadmin = () => as("sam", "superadmin");

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-thecommunity",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8") },
  });
});
afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/salma"), { email: "salma@example.com", role: "user", status: "active", firstName: "Salma", notificationPrefs: { email: true, push: false, marketingEmail: false } });
    await setDoc(doc(db, "users/salma/notifications/n1"), { title: { fr: "Bienvenue" }, createdAt: new Date() });
    await setDoc(doc(db, "experiences/pub"), { status: "published", title: { fr: "Dîner" } });
    await setDoc(doc(db, "experiences/draft"), { status: "draft", title: { fr: "Secret" } });
    await setDoc(doc(db, "experiences/pub/private/economics"), { costPerSeat: 9500 });
    await setDoc(doc(db, "sessions/s1"), { status: "published", capacity: 30, seatsConfirmed: 3 });
    await setDoc(doc(db, "sessions/s2"), { status: "draft", capacity: 10, seatsConfirmed: 0 });
    await setDoc(doc(db, "sessions/s1/waitlist/salma"), { status: "waiting" });
    await setDoc(doc(db, "reservations/r1"), { userId: "salma", sessionId: "s1", status: "confirmed" });
    await setDoc(doc(db, "reservations/r2"), { userId: "karim", sessionId: "s1", status: "confirmed" });
    await setDoc(doc(db, "payments/p1"), { userId: "salma", amount: 16900 });
    await setDoc(doc(db, "bookingRequests/s1_salma"), { userId: "salma", sessionId: "s1", status: "pending", message: "Bonjour" });
    await setDoc(doc(db, "groups/g1"), { memberIds: ["salma", "karim"], status: "revealed" });
    await setDoc(doc(db, "groups/g2"), { memberIds: ["salma"], status: "validated" });
    await setDoc(doc(db, "promoCodes/BIENVENUE20"), { value: 20 });
    await setDoc(doc(db, "settings/public"), { locales: ["fr", "ar"] });
    await setDoc(doc(db, "settings/booking"), { holdMinutes: 15 });
    await setDoc(doc(db, "auditLogs/a1"), { action: "x" });
    await setDoc(doc(db, "cities/casablanca"), { isActive: true });
  });
});

describe("profils (users)", () => {
  it("chacun lit son profil ; personne d'autre sauf l'équipe", async () => {
    await assertSucceeds(getDoc(doc(salma(), "users/salma")));
    await assertFails(getDoc(doc(karim(), "users/salma")));
    await assertFails(getDoc(doc(anon(), "users/salma")));
    await assertSucceeds(getDoc(doc(admin(), "users/salma")));
  });
  it("le navigateur ne crée ni ne supprime de profil", async () => {
    await assertFails(setDoc(doc(as("nouveau"), "users/nouveau"), { role: "user" }));
    await assertFails(deleteDoc(doc(salma(), "users/salma")));
  });
  it("on ne peut pas s'attribuer un rôle ni changer son statut", async () => {
    await assertFails(updateDoc(doc(salma(), "users/salma"), { role: "admin" }));
    await assertFails(updateDoc(doc(salma(), "users/salma"), { status: "active", role: "superadmin" }));
    await assertFails(updateDoc(doc(admin(), "users/salma"), { role: "superadmin" }));
  });
  it("le questionnaire passe par le serveur, pas par une écriture directe", async () => {
    await assertFails(updateDoc(doc(salma(), "users/salma"), { firstName: "Hack" }));
  });
  it("préférences et langue modifiables avec les bons types", async () => {
    await assertSucceeds(updateDoc(doc(salma(), "users/salma"), { notificationPrefs: { email: false, push: false, marketingEmail: true }, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(salma(), "users/salma"), { locale: "ar" }));
    await assertFails(updateDoc(doc(salma(), "users/salma"), { locale: "xx" }));
    await assertFails(updateDoc(doc(salma(), "users/salma"), { notificationPrefs: { email: "oui", push: false, marketingEmail: true } }));
    await assertFails(updateDoc(doc(salma(), "users/salma"), { notificationPrefs: { email: true, push: false, marketingEmail: true, admin: true } }));
  });
  it("la photo de profil doit être dans son propre dossier", async () => {
    await assertSucceeds(updateDoc(doc(salma(), "users/salma"), { photoPath: "users/salma/avatar/photo.webp" }));
    await assertFails(updateDoc(doc(salma(), "users/salma"), { photoPath: "users/karim/avatar/photo.webp" }));
  });
  it("notifications : lecture et « lu » uniquement par le propriétaire", async () => {
    await assertSucceeds(getDoc(doc(salma(), "users/salma/notifications/n1")));
    await assertFails(getDoc(doc(karim(), "users/salma/notifications/n1")));
    await assertSucceeds(updateDoc(doc(salma(), "users/salma/notifications/n1"), { readAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(salma(), "users/salma/notifications/n1"), { title: { fr: "Modifié" } }));
    await assertFails(setDoc(doc(salma(), "users/salma/notifications/n2"), { title: { fr: "Faux" } }));
  });
  it("favoris : propriétaire uniquement, format strict", async () => {
    await assertSucceeds(setDoc(doc(salma(), "users/salma/favorites/pub"), { createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(salma(), "users/salma/favorites/pub2"), { createdAt: serverTimestamp(), note: "x" }));
    await assertFails(setDoc(doc(karim(), "users/salma/favorites/pub"), { createdAt: serverTimestamp() }));
  });
  it("données de matching : jamais lisibles par un membre", async () => {
    await assertFails(getDoc(doc(salma(), "userMatching/salma")));
    await assertSucceeds(getDoc(doc(admin(), "userMatching/salma")));
  });
});

describe("catalogue", () => {
  it("expérience publiée visible de tous, brouillon réservé à l'équipe", async () => {
    await assertSucceeds(getDoc(doc(anon(), "experiences/pub")));
    await assertFails(getDoc(doc(salma(), "experiences/draft")));
    await assertSucceeds(getDoc(doc(admin(), "experiences/draft")));
  });
  it("le modèle économique n'est jamais public", async () => {
    await assertFails(getDoc(doc(anon(), "experiences/pub/private/economics")));
    await assertFails(getDoc(doc(salma(), "experiences/pub/private/economics")));
    await assertSucceeds(getDoc(doc(admin(), "experiences/pub/private/economics")));
  });
  it("aucune écriture directe sur expériences et sessions (même admin) : passage par le serveur", async () => {
    await assertFails(updateDoc(doc(admin(), "experiences/pub"), { title: { fr: "x" } }));
    await assertFails(updateDoc(doc(salma(), "sessions/s1"), { seatsConfirmed: 0 }));
    await assertFails(updateDoc(doc(admin(), "sessions/s1"), { capacity: 2 }));
  });
  it("sessions : publiées visibles, brouillons cachés, liste d'attente personnelle", async () => {
    await assertSucceeds(getDoc(doc(anon(), "sessions/s1")));
    await assertFails(getDoc(doc(anon(), "sessions/s2")));
    await assertSucceeds(getDoc(doc(salma(), "sessions/s1/waitlist/salma")));
    await assertFails(getDoc(doc(karim(), "sessions/s1/waitlist/salma")));
  });
  it("villes : lecture publique, modification super-admin", async () => {
    await assertSucceeds(getDoc(doc(anon(), "cities/casablanca")));
    await assertFails(setDoc(doc(admin(), "cities/rabat"), { isActive: true }));
    await assertFails(setDoc(doc(superadmin(), "cities/rabat"), { isActive: false })); // uniquement via le back-office (journalisé)
  });
});

describe("réservations, paiements, groupes", () => {
  it("chacun ne voit que ses réservations", async () => {
    await assertSucceeds(getDoc(doc(salma(), "reservations/r1")));
    await assertFails(getDoc(doc(salma(), "reservations/r2")));
    await assertSucceeds(getDocs(query(collection(salma(), "reservations"), where("userId", "==", "salma"))));
    await assertFails(getDocs(collection(salma(), "reservations")));
    await assertSucceeds(getDocs(collection(admin(), "reservations")));
  });
  it("impossible de créer ou confirmer une réservation, ou de valider un paiement, depuis le navigateur", async () => {
    await assertFails(setDoc(doc(salma(), "reservations/r3"), { userId: "salma", status: "confirmed" }));
    await assertFails(updateDoc(doc(salma(), "reservations/r1"), { status: "refunded" }));
    await assertFails(setDoc(doc(salma(), "payments/p2"), { userId: "salma", status: "succeeded" }));
    await assertSucceeds(getDoc(doc(salma(), "payments/p1")));
    await assertFails(getDoc(doc(karim(), "payments/p1")));
  });
  it("demande de participation : visible par son auteur et l'équipe, jamais écrite par le navigateur", async () => {
    await assertSucceeds(getDoc(doc(salma(), "bookingRequests/s1_salma")));
    await assertFails(getDoc(doc(karim(), "bookingRequests/s1_salma")));
    await assertSucceeds(getDoc(doc(admin(), "bookingRequests/s1_salma")));
    await assertFails(setDoc(doc(salma(), "bookingRequests/s1_salma2"), { userId: "salma", status: "pending" }));
    await assertFails(updateDoc(doc(salma(), "bookingRequests/s1_salma"), { status: "accepted" }));
    await assertFails(updateDoc(doc(admin(), "bookingRequests/s1_salma"), { status: "accepted" }));
  });
  it("groupe visible par ses membres seulement une fois révélé", async () => {
    await assertSucceeds(getDoc(doc(karim(), "groups/g1")));
    await assertFails(getDoc(doc(salma(), "groups/g2")));
    await assertFails(getDoc(doc(as("inconnu"), "groups/g1")));
    await assertSucceeds(getDoc(doc(admin(), "groups/g2")));
  });
});

describe("administration", () => {
  it("codes promo, journaux et paramètres internes réservés à l'équipe", async () => {
    await assertFails(getDoc(doc(salma(), "promoCodes/BIENVENUE20")));
    await assertSucceeds(getDoc(doc(admin(), "promoCodes/BIENVENUE20")));
    await assertFails(setDoc(doc(admin(), "promoCodes/GRATUIT"), { value: 100 }));
    await assertFails(getDoc(doc(salma(), "auditLogs/a1")));
    await assertSucceeds(getDoc(doc(admin(), "auditLogs/a1")));
    await assertFails(addDoc(collection(admin(), "auditLogs"), { action: "faux" }));
    await assertSucceeds(getDoc(doc(anon(), "settings/public")));
    await assertFails(getDoc(doc(salma(), "settings/booking")));
  });
  it("tout ce qui n'est pas prévu est refusé", async () => {
    await assertFails(setDoc(doc(admin(), "nimporte/quoi"), { a: 1 }));
    await assertFails(getDoc(doc(superadmin(), "nimporte/quoi")));
  });
});

describe("factures et e-mails (5c)", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "invoices/inv_p1"), { userId: "salma", number: "TEST-FA-2026-000001", kind: "invoice" });
      await setDoc(doc(db, "counters/TEST-FA-2026"), { last: 1 });
      await setDoc(doc(db, "mail/m1"), { to: "salma@example.com", subject: "C'est réservé" });
    });
  });
  it("chacun lit ses factures, personne ne les écrit", async () => {
    await assertSucceeds(getDoc(doc(salma(), "invoices/inv_p1")));
    await assertFails(getDoc(doc(karim(), "invoices/inv_p1")));
    await assertSucceeds(getDocs(query(collection(salma(), "invoices"), where("userId", "==", "salma"))));
    await assertFails(getDocs(collection(salma(), "invoices")));
    await assertSucceeds(getDoc(doc(admin(), "invoices/inv_p1")));
    await assertFails(setDoc(doc(salma(), "invoices/inv_x"), { userId: "salma", number: "FA-2026-000001" }));
    await assertFails(updateDoc(doc(admin(), "invoices/inv_p1"), { number: "FA-2026-000999" }));
  });
  it("compteurs inaccessibles ; boîte d'envoi lue par l'équipe seulement", async () => {
    await assertFails(getDoc(doc(admin(), "counters/TEST-FA-2026")));
    await assertFails(setDoc(doc(superadmin(), "counters/FA-2026"), { last: 0 }));
    await assertFails(getDoc(doc(salma(), "mail/m1")));
    await assertSucceeds(getDoc(doc(admin(), "mail/m1")));
    await assertFails(setDoc(doc(admin(), "mail/m2"), { to: "x@example.com" }));
  });
});

describe("formulaires publics", () => {
  const msg = { name: "Rita", email: "rita@example.com", message: "Bonjour, une question sur les dîners.", createdAt: serverTimestamp() };
  it("message de contact : jamais écrit directement (serveur seulement), jamais relu par le public", async () => {
    await assertFails(addDoc(collection(anon(), "contactMessages"), msg));
    await assertFails(addDoc(collection(salma(), "contactMessages"), msg));
    await assertFails(getDocs(collection(anon(), "contactMessages")));
  });
  it("centre d'aide : avis sur un article, anonyme et au bon format", async () => {
    const fb = { article: "annuler-une-reservation", helpful: true, locale: "fr", createdAt: serverTimestamp() };
    await assertSucceeds(addDoc(collection(anon(), "helpFeedback"), fb));
    await assertFails(addDoc(collection(anon(), "helpFeedback"), { ...fb, helpful: "oui" }));
    await assertFails(addDoc(collection(anon(), "helpFeedback"), { ...fb, article: "<script>" }));
    await assertFails(addDoc(collection(anon(), "helpFeedback"), { ...fb, email: "x@example.com" }));
    await assertFails(getDocs(collection(salma(), "helpFeedback")));
    await assertSucceeds(getDocs(collection(admin(), "helpFeedback")));
  });
  it("candidature partenaire : écrite par le serveur seulement, lue par l'équipe seulement", async () => {
    const app = {
      contactName: "Yasmine", businessName: "Studio Lumière", type: "studio", city: "Casablanca", email: "contact@studio.ma",
      phone: "", link: "", message: "Nous proposons des cours de yoga en petit groupe à Maarif.", locale: "fr", createdAt: serverTimestamp(),
    };
    await assertFails(addDoc(collection(anon(), "partnerApplications"), app));
    await assertFails(getDocs(collection(anon(), "partnerApplications")));
    await assertSucceeds(getDocs(collection(admin(), "partnerApplications")));
  });
  it("demande d'export / suppression : seulement pour soi", async () => {
    await assertSucceeds(addDoc(collection(salma(), "dataRequests"), { userId: "salma", type: "deletion", createdAt: serverTimestamp() }));
    await assertFails(addDoc(collection(salma(), "dataRequests"), { userId: "karim", type: "deletion", createdAt: serverTimestamp() }));
  });
});
