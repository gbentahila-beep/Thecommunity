/**
 * Remplit les ÉMULATEURS Firebase avec les données de démonstration (toutes marquées isDemo: true).
 * Sécurité : refuse de s'exécuter ailleurs que sur les émulateurs d'un projet « demo-* ».
 *
 * Usage : npm run emulators   (dans un terminal)
 *         npm run seed        (dans un autre)
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Timestamp, getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { DEFAULT_CANCELLATION_POLICY } from "@thecommunity/shared";
import { DEMO_CATEGORIES, DEMO_CITIES, DEMO_EXPERIENCES, DEMO_REVIEWS } from "../apps/web/lib/data/demo";
import { buildAdminData, DEMO_ECONOMICS } from "../apps/web/lib/data/demo-admin";
import { buildDemoMemberData, DEMO_MEMBER } from "../apps/web/lib/data/demo-member";

const PROJECT = process.env.GCLOUD_PROJECT ?? "demo-thecommunity";
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !PROJECT.startsWith("demo-")) {
  console.error("✋ Refus : ce script ne s'exécute que sur les émulateurs d'un projet « demo-* ».");
  console.error("   Lancez d'abord « npm run emulators », puis « npm run seed ».");
  process.exit(1);
}

initializeApp({ projectId: PROJECT });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth();
const ts = (iso: string) => Timestamp.fromDate(new Date(iso));
const now = new Date();

/** Écrit par lots de 400 documents (limite Firestore : 500 par lot). */
async function writeAll(entries: [string, Record<string, unknown>][]) {
  let batch: WriteBatch = db.batch();
  let n = 0;
  for (const [path, data] of entries) {
    batch.set(db.doc(path), { ...data, isDemo: true });
    if (++n % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  return entries.length;
}

async function main() {
  const admin = buildAdminData(now);
  const entries: [string, Record<string, unknown>][] = [];

  entries.push(["settings/public", { locales: ["fr", "ar"], activeCities: ["casablanca"] }]);
  entries.push(["settings/cancellationPolicies", { policies: [DEFAULT_CANCELLATION_POLICY] }]);
  entries.push(["settings/booking", { holdMinutes: 15, closeHoursBefore: { social_dinner: 12, default: 2 }, minAge: 18, serviceFee: 0 }]);
  for (const c of DEMO_CITIES) entries.push([`cities/${c.id}`, { ...c }]);
  for (const c of DEMO_CATEGORIES) entries.push([`categories/${c.id}`, { ...c }]);
  for (const p of admin.partners) entries.push([`partners/${p.id}`, { ...p }]);
  for (const p of admin.promos) entries.push([`promoCodes/${p.code}`, { ...p, validTo: ts(`${p.validTo}T23:59:59Z`) }]);

  for (const e of DEMO_EXPERIENCES) {
    const next = admin.sessions.find((s) => s.experienceId === e.id);
    const { id, ...rest } = e;
    entries.push([`experiences/${id}`, { ...rest, nextSessionAt: next ? ts(next.startAt) : null }]);
    if (DEMO_ECONOMICS[id]) entries.push([`experiences/${id}/private/economics`, { ...DEMO_ECONOMICS[id] }]);
  }
  for (const s of admin.sessions) {
    const e = DEMO_EXPERIENCES.find((x) => x.id === s.experienceId)!;
    const { id, ...rest } = s;
    entries.push([`sessions/${id}`, {
      ...rest,
      startAt: ts(s.startAt),
      endAt: ts(s.endAt),
      experienceSnapshot: { title: e.title, slug: e.slug, coverImagePath: e.images[0]?.path ?? "", categoryId: e.categoryId, bookingMode: e.bookingMode, district: e.district },
      groupsStatus: "none",
    }]);
  }
  for (const [sessionId, uids] of Object.entries(admin.waitlists)) {
    uids.forEach((uid, i) => entries.push([`sessions/${sessionId}/waitlist/${uid}`, { seats: 1, status: "waiting", createdAt: Timestamp.fromMillis(now.getTime() - (uids.length - i) * 3_600_000) }]));
  }
  for (const r of admin.reservations) {
    const s = admin.sessions.find((x) => x.id === r.sessionId)!;
    const e = DEMO_EXPERIENCES.find((x) => x.id === r.experienceId)!;
    const { finance, id, ...rest } = r;
    entries.push([`reservations/${id}`, {
      ...rest,
      cityId: e.cityId,
      categoryId: e.categoryId,
      createdAt: ts(r.createdAt),
      pricing: { unitAmount: s.price.amount, seats: r.seats, subtotal: s.price.amount * r.seats, discount: s.price.amount * r.seats - r.total, fees: 0, total: r.total, currency: "MAD" },
      sessionSnapshot: { title: e.title, slug: e.slug, startAt: ts(s.startAt), endAt: ts(s.endAt), district: e.district, coverImagePath: e.images[0]?.path ?? "", categoryId: e.categoryId, bookingMode: e.bookingMode },
    }]);
    entries.push([`reservations/${id}/private/finance`, { ...finance }]);
    if (r.status === "confirmed") entries.push([`sessions/${r.sessionId}/seatLocks/${r.userId}`, { reservationId: id }]);
  }
  for (const p of admin.payments) {
    const { id, ...rest } = p;
    entries.push([`payments/${id}`, { ...rest, currency: "MAD", createdAt: ts(p.createdAt) }]);
  }
  for (const g of admin.groups) {
    const { id, ...rest } = g;
    const members = g.memberIds.map((uid) => admin.users.find((u) => u.uid === uid)!).map((u) => ({ uid: u.uid, firstName: u.firstName, interests: u.interests.slice(0, 3) }));
    entries.push([`groups/${id}`, { ...rest, members, status: "proposed", source: "algorithm" }]);
  }
  for (const r of DEMO_REVIEWS) {
    const { id, ...rest } = r;
    entries.push([`reviews/${id}`, { ...rest, status: "published", createdAt: ts(r.createdAt) }]);
  }

  // Comptes : 64 membres fictifs + 2 comptes de connexion pour tester (émulateur uniquement).
  const PASSWORD = "Demo2026!";
  const accounts = [
    ...admin.users.map((u) => ({ uid: u.uid, email: u.email, displayName: `${u.firstName} ${u.lastName}`, role: u.role, profile: u })),
    { uid: "demo-superadmin", email: "admin@thecommunity.test", displayName: "Admin Démo", role: "superadmin" as const, profile: null },
    { uid: DEMO_MEMBER.uid, email: "salma@thecommunity.test", displayName: "Salma Benali", role: "user" as const, profile: null },
  ];
  for (const a of accounts) {
    await auth.createUser({ uid: a.uid, email: a.email, password: PASSWORD, displayName: a.displayName, emailVerified: true }).catch(async (e) => {
      if ((e as { code?: string }).code !== "auth/uid-already-exists") throw e;
    });
    if (a.role !== "user") await auth.setCustomUserClaims(a.uid, { role: a.role });
    const p = a.profile;
    entries.push([`users/${a.uid}`, p
      ? { firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, birthDate: p.birthDate, gender: p.gender, cityId: "casablanca", languages: p.languages, interests: p.interests, socialGoals: ["meet_new_people"], locale: "fr", onboardingCompleted: true, role: p.role, status: p.status, notificationPrefs: { email: true, push: false, marketingEmail: false }, createdAt: ts(p.createdAt) }
      : a.uid === DEMO_MEMBER.uid
        ? { ...DEMO_MEMBER, email: a.email, role: "user", status: "active", createdAt: ts(DEMO_MEMBER.createdAt) }
        : { firstName: "Admin", lastName: "Démo", email: a.email, role: "superadmin", status: "active", onboardingCompleted: true, locale: "fr", createdAt: Timestamp.fromDate(now) }]);
  }

  // Historique du membre de démonstration « Salma » (réservations, groupe révélé, notifications).
  const member = buildDemoMemberData(now);
  for (const r of member.reservations) {
    const { id, ...rest } = r;
    entries.push([`reservations/${id}`, {
      ...rest,
      cityId: "casablanca",
      categoryId: r.sessionSnapshot.categoryId,
      createdAt: ts(r.createdAt),
      paidAt: r.paidAt ? ts(r.paidAt) : null,
      sessionSnapshot: { ...r.sessionSnapshot, startAt: ts(r.sessionSnapshot.startAt), endAt: ts(r.sessionSnapshot.endAt) },
      cancellation: r.cancellation ? { ...r.cancellation, at: ts(r.cancellation.at) } : null,
    }]);
  }
  for (const g of member.groups) {
    const { id, ...rest } = g;
    entries.push([`groups/${id}`, { ...rest }]);
  }
  for (const n of member.notifications) {
    const { id, ...rest } = n;
    entries.push([`users/${DEMO_MEMBER.uid}/notifications/${id}`, { ...rest, createdAt: ts(n.createdAt), readAt: n.readAt ? ts(n.readAt) : null }]);
  }

  const count = await writeAll(entries);
  console.log(`✅ ${count} documents et ${accounts.length} comptes de démonstration créés dans les émulateurs.`);
  console.log(`   Connexion test : admin@thecommunity.test / salma@thecommunity.test — mot de passe « ${PASSWORD} » (émulateur uniquement).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
