/**
 * Nomme le PREMIER super-administrateur d'un projet Firebase réel (essai ou production).
 * Les suivants sont nommés depuis le back-office (callable setUserRole), avec journalisation.
 *
 * Prérequis : la personne a déjà créé son compte sur le site ; identifiants de service fournis par
 * GOOGLE_APPLICATION_CREDENTIALS (jamais commités, jamais collés dans une conversation).
 *
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=/chemin/cle.json npx tsx scripts/bootstrap-superadmin.ts \
 *           --project <id-du-projet> --email <adresse> --confirm
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

initializeApp({ projectId: project, credential: process.env.FIREBASE_AUTH_EMULATOR_HOST ? undefined : applicationDefault() });

async function main() {
  const user = await getAuth().getUserByEmail(email!);
  await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: "superadmin" });
  await getAuth().revokeRefreshTokens(user.uid);
  const db = getFirestore();
  await db.doc(`users/${user.uid}`).set({ role: "superadmin", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("auditLogs").add({
    actorUid: "bootstrap-script", actorRole: "system", action: "user.setRole", targetType: "user", targetId: user.uid,
    before: user.customClaims?.role ?? "user", after: "superadmin", at: FieldValue.serverTimestamp(),
  });
  console.log(`✅ ${email} est super-administrateur du projet ${project}. Il doit se reconnecter.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
