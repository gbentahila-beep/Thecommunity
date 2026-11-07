/**
 * Contenu de départ d'un projet Firebase RÉEL (essai) : référentiels (villes, univers, paramètres)
 * et, en option, les expériences de démonstration (isDemo: true) pour que le site ne soit pas vide.
 * N'écrit JAMAIS de comptes, réservations ou paiements fictifs.
 *
 * Usage : npx tsx scripts/seed-content.ts --project <id> [--with-demo-experiences]
 * Identifiants : GOOGLE_APPLICATION_CREDENTIALS (GitHub Actions) ou émulateurs.
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { DEFAULT_CANCELLATION_POLICY } from "@thecommunity/shared";
import { buildDemoSessions, DEMO_CATEGORIES, DEMO_CITIES, DEMO_EXPERIENCES, DEMO_REVIEWS } from "../apps/web/lib/data/demo";
import { DEMO_ECONOMICS, DEMO_PARTNERS } from "../apps/web/lib/data/demo-admin";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const project = arg("project");
if (!project) {
  console.error("Usage : npx tsx scripts/seed-content.ts --project <id> [--with-demo-experiences]");
  process.exit(1);
}
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
initializeApp(emulator ? { projectId: project } : { projectId: project, credential: applicationDefault() });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const ts = (iso: string) => Timestamp.fromDate(new Date(iso));

async function main() {
  const batch = db.batch();
  batch.set(db.doc("settings/public"), { locales: ["fr", "ar"], activeCities: ["casablanca"] }, { merge: true });
  batch.set(db.doc("settings/cancellationPolicies"), { policies: [DEFAULT_CANCELLATION_POLICY] }, { merge: true });
  batch.set(db.doc("settings/booking"), { holdMinutes: 15, closeHoursBefore: { social_dinner: 12, default: 2 }, minAge: 18, serviceFee: 0 }, { merge: true });
  for (const c of DEMO_CITIES) batch.set(db.doc(`cities/${c.id}`), { ...c, isDemo: false }, { merge: true });
  for (const c of DEMO_CATEGORIES) batch.set(db.doc(`categories/${c.id}`), { ...c }, { merge: true });
  await batch.commit();
  console.log(`✅ Référentiels : ${DEMO_CITIES.length} villes, ${DEMO_CATEGORIES.length} univers, paramètres.`);

  if (!process.argv.includes("--with-demo-experiences")) return;
  const existing = await db.collection("experiences").limit(1).get();
  if (!existing.empty) {
    console.log("ℹ️  Des expériences existent déjà : rien n'est ajouté.");
    return;
  }
  const demo = db.batch();
  for (const p of DEMO_PARTNERS) demo.set(db.doc(`partners/${p.id}`), { ...p, isDemo: true });
  const sessions = buildDemoSessions(new Date());
  for (const e of DEMO_EXPERIENCES) {
    const { id, ...rest } = e;
    const next = sessions.find((s) => s.experienceId === id);
    demo.set(db.doc(`experiences/${id}`), { ...rest, nextSessionAt: next ? ts(next.startAt) : null, isDemo: true });
    if (DEMO_ECONOMICS[id]) demo.set(db.doc(`experiences/${id}/private/economics`), { ...DEMO_ECONOMICS[id] });
  }
  for (const s of sessions) {
    const e = DEMO_EXPERIENCES.find((x) => x.id === s.experienceId)!;
    const { id, ...rest } = s;
    // Places remises à zéro : aucune réservation fictive sur un vrai projet.
    demo.set(db.doc(`sessions/${id}`), {
      ...rest,
      seatsConfirmed: 0,
      seatsHeld: 0,
      waitlistCount: 0,
      status: "published",
      startAt: ts(s.startAt),
      endAt: ts(s.endAt),
      experienceSnapshot: { title: e.title, slug: e.slug, coverImagePath: e.images[0]?.path ?? "", categoryId: e.categoryId, bookingMode: e.bookingMode, district: e.district },
      groupsStatus: "none",
      isDemo: true,
    });
  }
  for (const r of DEMO_REVIEWS) {
    const { id, ...rest } = r;
    demo.set(db.doc(`reviews/${id}`), { ...rest, status: "published", createdAt: ts(r.createdAt), isDemo: true });
  }
  await demo.commit();
  console.log(`✅ Démonstration : ${DEMO_EXPERIENCES.length} expériences, ${sessions.length} dates, ${DEMO_REVIEWS.length} avis (isDemo).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
