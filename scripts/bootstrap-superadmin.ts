/**
 * Nomme le PREMIER super-administrateur d'un projet Firebase réel (essai ou production).
 * Les suivants sont nommés depuis le back-office (callable setUserRole), avec journalisation.
 *
 * Prérequis : la personne a déjà créé son compte sur le site ; identifiants de service fournis par
 * GOOGLE_APPLICATION_CREDENTIALS (jamais commités, jamais collés dans une conversation).
 *
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=/chemin/cle.json npx tsx scripts/bootstrap-superadmin.ts \
 *           --project <id-du-projet> --email <adresse>[,<adresse>…] --confirm [--skip-missing]
 * --skip-missing : ignore une adresse dont le compte n'existe pas encore (utilisé par GitHub Actions).
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const project = arg("project");
const email = arg("email");
if (!project || !email || !process.argv.includes("--confirm")) {
  console.error("Usage : npx tsx scripts/bootstrap-superadmin.ts --project <id> --email <adresse> --confirm");
  process.exit(1);
}

initializeApp(process.env.FIREBASE_AUTH_EMULATOR_HOST ? { projectId: project } : { projectId: project, credential: applicationDefault() });

async function promote(address: string) {
  const user = await getAuth().getUserByEmail(address).catch((e) => {
    if (process.argv.includes("--skip-missing") && (e as { code?: string }).code === "auth/user-not-found") return null;
    throw e;
  });
  if (!user) {
    console.log(`ℹ️  ${address} : aucun compte pour l'instant (à créer sur le site), ignoré.`);
    return;
  }
  if (user.customClaims?.role === "superadmin") {
    console.log(`✔ ${address} est déjà super-administrateur.`);
    return;
  }
  await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: "superadmin" });
  await getAuth().revokeRefreshTokens(user.uid);
  const db = getFirestore();
  await db.doc(`users/${user.uid}`).set({ role: "superadmin", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("auditLogs").add({
    actorUid: "bootstrap-script", actorRole: "system", action: "user.setRole", targetType: "user", targetId: user.uid,
    before: user.customClaims?.role ?? "user", after: "superadmin", at: FieldValue.serverTimestamp(),
  });
  console.log(`✅ ${address} est super-administrateur du projet ${project}. Reconnexion nécessaire.`);
}

async function main() {
  for (const address of email!.split(",").map((e) => e.trim()).filter(Boolean)) await promote(address);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
