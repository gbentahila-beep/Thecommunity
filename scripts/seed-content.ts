/**
 * Contenu de départ d'un projet Firebase RÉEL (essai) : référentiels (villes, univers, paramètres)
 * et, en option, les expériences de démonstration (isDemo: true) pour que le site ne soit pas vide.
 * Lancé à chaque déploiement : ne réécrit JAMAIS ce que l'équipe a modifié dans le back-office.
 * N'écrit JAMAIS de comptes, réservations ou paiements fictifs.
 *
 * Usage : npx tsx scripts/seed-content.ts --project <id> [--with-demo-experiences] [--test-payments]
 * --test-payments : active l'adaptateur de paiement de TEST (settings/payment), seulement s'il n'existe
 *   aucun réglage de paiement. À ne JAMAIS utiliser sur le projet de production.
 * Identifiants : GOOGLE_APPLICATION_CREDENTIALS (GitHub Actions) ou émulateurs.
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { DEFAULT_CANCELLATION_POLICY } from "@thecommunity/shared";
import { buildDemoSessions, DEMO_CATEGORIES, DEMO_CITIES, DEMO_EXPERIENCES, DEMO_REVIEWS } from "../apps/web/lib/data/demo";
import { DEMO_ECONOMICS, DEMO_PARTNERS } from "../apps/web/lib/data/demo-admin";
import { DEMO_ORGANIZER } from "../apps/web/lib/data/demo-organizer";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const project = arg("project");
if (!project) {
  console.error("Usage : npx tsx scripts/seed-content.ts --project <id> [--with-demo-experiences] [--test-payments]");
  process.exit(1);
}
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
initializeApp(emulator ? { projectId: project } : { projectId: project, credential: applicationDefault() });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const ts = (iso: string) => Timestamp.fromDate(new Date(iso));

/**
 * Écrit un document seulement s'il n'existe pas, ou s'il n'a jamais été modifié dans le back-office
 * (pas de champ `updatedBy`) : les réglages faits par l'équipe ne sont jamais écrasés par un déploiement.
 */
async function upsertUntouched(path: string, data: Record<string, unknown>): Promise<"created" | "updated" | "kept"> {
  const ref = db.doc(path);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(data);
    return "created";
  }
  if (snap.get("updatedBy")) return "kept";
  await ref.set(data, { merge: true });
  return "updated";
}

async function main() {
  // Réglages : créés s'ils manquent, jamais réécrits (frais de service, annulation… restent ceux de l'équipe).
  const created = (p: Promise<unknown>) => p.then(() => true, () => false);
  await created(db.doc("settings/public").create({ locales: ["fr", "ar"], activeCities: ["casablanca"] }));
  await created(db.doc("settings/cancellationPolicies").create({ policies: [DEFAULT_CANCELLATION_POLICY] }));
  await created(db.doc("settings/booking").create({ holdMinutes: 15, closeHoursBefore: { social_dinner: 12, default: 2 }, minAge: 18, serviceFee: 0 }));
  const counts = { created: 0, updated: 0, kept: 0 };
  for (const c of DEMO_CITIES) counts[await upsertUntouched(`cities/${c.id}`, { ...c, isDemo: false })]++;
  for (const c of DEMO_CATEGORIES) counts[await upsertUntouched(`categories/${c.id}`, { ...c })]++;
  console.log(`✅ Référentiels : ${counts.created} créés, ${counts.updated} mis à jour, ${counts.kept} modifiés par l'équipe (inchangés).`);

  // Formule d'abonnement proposée, NON active : l'équipe règle le prix et l'active dans le back-office.
  const plan = await db.doc("membershipPlans/annual").create({
    name: { fr: "Wenzy Membre", ar: "عضوية Wenzy" },
    price: { amount: 99000, currency: "MAD" },
    discountPercent: 15,
    earlyAccessHours: 0,
    benefits: [{ fr: "-15 % sur toutes les expériences", ar: "خصم 15٪ على جميع التجارب" }],
    isActive: false,
  }).then(() => true, () => false);
  console.log(plan ? "✅ Abonnement : formule créée (inactive, à régler dans le back-office)." : "ℹ️  Formule d'abonnement déjà présente : inchangée.");

  if (process.argv.includes("--test-payments")) {
    const ok = await created(db.doc("settings/payment").create({ provider: "sandbox", mode: "test" }));
    console.log(ok ? "✅ Paiement : adaptateur de TEST activé (aucun argent réel)." : "ℹ️  Réglage de paiement déjà présent : inchangé.");
  }

  if (!process.argv.includes("--with-demo-experiences")) return;
  // Expériences de démonstration : on ajoute seulement celles qui ne sont pas encore là ET n'ont jamais été
  // ajoutées (registre settings/demoContent) ni supprimées par l'équipe (journal) : une expérience supprimée
  // ne revient pas, une expérience modifiée n'est pas touchée.
  const registryRef = db.doc("settings/demoContent");
  const registry = new Set<string>(((await registryRef.get()).get("experienceIds") as string[] | undefined) ?? []);
  const deleted = new Set((await db.collection("auditLogs").where("action", "==", "experience.delete").get()).docs.map((d) => String(d.get("targetId"))));
  const existing = new Set((await db.collection("experiences").get()).docs.map((d) => d.id));
  existing.forEach((id) => DEMO_EXPERIENCES.some((e) => e.id === id) && registry.add(id));
  const toAdd = DEMO_EXPERIENCES.filter((e) => !existing.has(e.id) && !registry.has(e.id) && !deleted.has(e.id));
  // Étape 23 : sur les expériences de démonstration déjà présentes, seuls les champs nouveaux MANQUANTS sont ajoutés
  // (date de création, « non inclus », position du lieu si l'adresse n'a pas changé) ; rien de ce que l'équipe a saisi n'est remplacé.
  let completed = 0;
  for (const e of DEMO_EXPERIENCES) {
    if (!existing.has(e.id)) continue;
    const snap = await db.doc(`experiences/${e.id}`).get();
    if (snap.get("isDemo") !== true) continue;
    const patch: Record<string, unknown> = {};
    if (e.createdAt && snap.get("createdAt") === undefined) patch.createdAt = ts(e.createdAt);
    if (e.notIncluded?.length && snap.get("notIncluded") === undefined) patch.notIncluded = e.notIncluded;
    if (e.venue.geo && snap.get("venue.geo") === undefined && snap.get("venue.address") === e.venue.address) patch["venue.geo"] = e.venue.geo;
    // Étape 29 : public et tranche d'âge visée (seulement s'ils manquent).
    if (e.audience && snap.get("audience") === undefined) patch.audience = e.audience;
    if (e.targetAgeMin && snap.get("targetAgeMin") === undefined) patch.targetAgeMin = e.targetAgeMin;
    if (e.targetAgeMax && snap.get("targetAgeMax") === undefined) patch.targetAgeMax = e.targetAgeMax;
    // docs/16 : questionnaire de niveau, accueil sur place, plats servis (seulement s'ils manquent).
    if (e.questionnaire?.length && snap.get("questionnaire") === undefined) patch.questionnaire = e.questionnaire;
    if (e.onSiteHost && snap.get("onSiteHost") === undefined) patch.onSiteHost = true;
    if (e.foodServed && snap.get("foodServed") === undefined) patch.foodServed = true;
    // Restaurant : gamme, budget estimé, cuisine, ambiance (seulement s'ils manquent).
    if (e.venueTier && snap.get("venueTier") === undefined) patch.venueTier = e.venueTier;
    if (e.budgetRange && snap.get("budgetRange") === undefined) patch.budgetRange = e.budgetRange;
    if (e.cuisine && snap.get("cuisine") === undefined) patch.cuisine = e.cuisine;
    if (e.ambiance && snap.get("ambiance") === undefined) patch.ambiance = e.ambiance;
    // Plus d'hôte (docs/16) : anciens textes de démonstration qui en parlaient, remplacés par les nouveaux.
    if (JSON.stringify(snap.get("included") ?? []).includes("hôte")) patch.included = e.included;
    if (String(snap.get("description.fr") ?? "").includes("nos hôtes")) patch["description.fr"] = e.description.fr;
    if (Object.keys(patch).length) {
      await snap.ref.update(patch);
      completed++;
    }
  }
  if (completed) console.log(`✅ Démonstration : ${completed} expérience(s) complétée(s) (champs des étapes 23 et 29 manquants).`);
  const demo = db.batch();
  // Lieux partenaires et organisateur de démonstration utilisés par ces expériences (créés s'ils manquent).
  for (const p of DEMO_PARTNERS) if (!(await db.doc(`partners/${p.id}`).get()).exists) demo.set(db.doc(`partners/${p.id}`), { ...p, isDemo: true });
  if (toAdd.some((e) => e.organizerId === DEMO_ORGANIZER.id) && !(await db.doc(`organizers/${DEMO_ORGANIZER.id}`).get()).exists) {
    const { id, ...pub } = DEMO_ORGANIZER;
    demo.set(db.doc(`organizers/${id}`), { ...pub, createdAt: ts(DEMO_ORGANIZER.createdAt), isDemo: true });
    demo.set(db.doc(`organizers/${id}/private/details`), { ownerUid: null, memberUids: [], contactName: "Démonstration", email: "", phone: "", address: "", documents: [], history: [], isDemo: true });
  }
  const sessions = buildDemoSessions(new Date());
  let dates = 0;
  for (const e of toAdd) {
    const { id, ...rest } = e;
    const next = sessions.find((s) => s.experienceId === id);
    demo.set(db.doc(`experiences/${id}`), { ...rest, ...(rest.createdAt ? { createdAt: ts(rest.createdAt) } : {}), nextSessionAt: next ? ts(next.startAt) : null, isDemo: true });
    if (DEMO_ECONOMICS[id]) demo.set(db.doc(`experiences/${id}/private/economics`), { ...DEMO_ECONOMICS[id] });
    for (const s of sessions.filter((x) => x.experienceId === id)) {
      const { id: sid, ...srest } = s;
      // Places remises à zéro : aucune réservation fictive sur un vrai projet.
      demo.set(db.doc(`sessions/${sid}`), {
        ...srest,
        seatsConfirmed: 0,
        seatsHeld: 0,
        waitlistCount: 0,
        status: "published",
        startAt: ts(s.startAt),
        endAt: ts(s.endAt),
        organizerId: e.organizerId ?? null,
        experienceSnapshot: { title: e.title, slug: e.slug, coverImagePath: e.images[0]?.path ?? "", categoryId: e.categoryId, bookingMode: e.bookingMode, district: e.district },
        groupsStatus: "none",
        isDemo: true,
      });
      dates++;
    }
    for (const r of DEMO_REVIEWS.filter((x) => x.experienceId === id)) {
      const { id: rid, ...rrest } = r;
      demo.set(db.doc(`reviews/${rid}`), { ...rrest, ...(rrest.reply ? { reply: { ...rrest.reply, at: ts(rrest.reply.at) } } : {}), status: "published", createdAt: ts(r.createdAt), isDemo: true });
    }
    registry.add(id);
  }
  demo.set(registryRef, { experienceIds: [...registry], updatedAt: Timestamp.now() }, { merge: true });
  await demo.commit();
  console.log(toAdd.length ? `✅ Démonstration : ${toAdd.length} expériences ajoutées (${toAdd.map((e) => e.id).join(", ")}), ${dates} dates (isDemo).` : "ℹ️  Démonstration : rien à ajouter.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
