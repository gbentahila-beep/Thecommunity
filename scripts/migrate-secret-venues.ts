/**
 * Lieu secret (docs/22, lot 0) — à lancer UNE FOIS sur un projet réel après la mise en ligne du lot 0.
 *
 * Pour chaque expérience dont le lieu est « révélé plus tard » : copie le lieu réel (nom, adresse, coordonnées,
 * quartier, nom du partenaire) dans `experiences/{id}/private/venue` (lisible par l'équipe seulement), puis le
 * retire du document public de l'expérience et du résumé copié sur ses dates (`sessions/{id}.experienceSnapshot`).
 * Les réservations déjà révélées gardent leur lieu. Sans --confirm, le script affiche seulement ce qu'il ferait.
 *
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=/chemin/cle.json npx tsx scripts/migrate-secret-venues.ts --project <id> [--confirm]
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const project = arg("project");
const confirm = process.argv.includes("--confirm");
if (!project) {
  console.error("Usage : npx tsx scripts/migrate-secret-venues.ts --project <id> [--confirm]");
  process.exit(1);
}

initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: project } : { projectId: project, credential: applicationDefault() });
const db = getFirestore();

async function main() {
  const exps = await db.collection("experiences").where("venue.revealPolicy", "==", "on_group_reveal").get();
  let moved = 0;
  for (const doc of exps.docs) {
    const e = doc.data();
    const leaking = Boolean(e.venue?.name || e.venue?.address || e.venue?.geo || e.district || e.partnerSnapshot?.name || e.pricing?.partner?.name);
    if (!leaking) continue;
    moved++;
    console.log(`${confirm ? "→" : "(simulation)"} ${e.title?.fr ?? doc.id} : lieu « ${e.venue?.name ?? ""} » rangé à part`);
    if (!confirm) continue;
    const privateRef = db.doc(`experiences/${doc.id}/private/venue`);
    const existing = (await privateRef.get()).data();
    const batch = db.batch();
    batch.set(privateRef, {
      name: existing?.name || e.venue?.name || "",
      address: existing?.address || e.venue?.address || "",
      geo: existing?.geo ?? e.venue?.geo ?? null,
      district: existing?.district || e.district || "",
      partnerName: existing?.partnerName || e.partnerSnapshot?.name || e.pricing?.partner?.name || "",
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(doc.ref, {
      district: "",
      "venue.name": "",
      "venue.address": "",
      "venue.geo": null,
      partnerSnapshot: null,
      ...(e.pricing?.partner ? { "pricing.partner.name": "" } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const sessions = await db.collection("sessions").where("experienceId", "==", doc.id).get();
    sessions.docs.forEach((s) => batch.update(s.ref, { "experienceSnapshot.district": "" }));
    await batch.commit();
  }
  console.log(moved === 0 ? "✔ Rien à faire : aucun lieu secret dans les documents publics." : `✔ ${moved} expérience(s) ${confirm ? "corrigée(s)" : "à corriger (relancez avec --confirm)"}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
