/**
 * Audit du 23/11 (docs/24, lot 3) — à lancer UNE FOIS sur un projet réel après la mise en ligne du lot 3.
 *
 * Les réservations PAYÉES d'un lieu communiqué dès la réservation n'avaient pas les coordonnées GPS du lieu
 * (seules les réservations gratuites les avaient) : l'itinéraire passait par l'adresse écrite. Ce script recopie
 * `experiences/{id}.venue.geo` sur les réservations à venir (confirmées) dont le lieu est celui de l'expérience.
 * Sans --confirm, le script affiche seulement ce qu'il ferait.
 *
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=/chemin/cle.json npx tsx scripts/backfill-venue-geo.ts --project <id> [--confirm]
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const project = arg("project");
const confirm = process.argv.includes("--confirm");
if (!project) {
  console.error("Usage : npx tsx scripts/backfill-venue-geo.ts --project <id> [--confirm]");
  process.exit(1);
}

initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: project } : { projectId: project, credential: applicationDefault() });
const db = getFirestore();

async function main() {
  const snap = await db.collection("reservations").where("status", "==", "confirmed").where("sessionSnapshot.startAt", ">", Timestamp.now()).get();
  const exps = new Map<string, FirebaseFirestore.DocumentData | undefined>();
  let fixed = 0;
  for (const d of snap.docs) {
    const r = d.data();
    if (!r.venue?.name || r.venue.geo) continue;
    if (!exps.has(r.experienceId)) exps.set(r.experienceId, (await db.doc(`experiences/${r.experienceId}`).get()).data());
    const v = exps.get(r.experienceId)?.venue;
    if (!v?.geo || v.revealPolicy !== "immediate" || v.name !== r.venue.name) continue;
    console.log(`${confirm ? "✔" : "·"} ${d.id} — ${r.venue.name} → ${v.geo.lat}, ${v.geo.lng}`);
    if (confirm) await d.ref.update({ "venue.geo": v.geo, updatedAt: FieldValue.serverTimestamp() });
    fixed++;
  }
  console.log(`${fixed} réservation(s) ${confirm ? "mises à jour" : "à mettre à jour (relancer avec --confirm)"}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
