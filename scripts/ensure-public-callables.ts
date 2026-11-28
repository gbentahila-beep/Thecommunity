/**
 * Rend appelables depuis le navigateur les fonctions « callable » (onCall) déployées.
 *
 * Pourquoi : une fonction callable de 2e génération tourne sur Cloud Run ; le navigateur ne peut
 * l'appeler que si le rôle « Cloud Run Invoker » est accordé à allUsers. Firebase CLI ne le pose
 * qu'à la CRÉATION de la fonction, et seulement si le compte de déploiement en a le droit. Ce script
 * le vérifie et le rétablit à chaque déploiement (idempotent).
 *
 * Sans danger : chaque callable vérifie elle-même l'identité (requireAuth) et le rôle de l'appelant.
 * « Public » signifie seulement « joignable » ; les fonctions déclenchées par événement ne sont pas touchées.
 *
 * Prérequis : le compte de service doit avoir le rôle « Cloud Run Admin » (le rôle Éditeur ne suffit pas).
 * Usage : GOOGLE_APPLICATION_CREDENTIALS=… npx tsx scripts/ensure-public-callables.ts --project <id> [--dry-run]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { applicationDefault } from "firebase-admin/app";

const REGION = "europe-west1";
const ROLE = "roles/run.invoker";
const MEMBER = "allUsers";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const project = arg("project");
const dryRun = process.argv.includes("--dry-run");
if (!project) {
  console.error("Usage : npx tsx scripts/ensure-public-callables.ts --project <id> [--dry-run]");
  process.exit(1);
}

/** Noms des fonctions exportées sous la forme `export const nom = onCall(`. */
export function findCallables(dir: string): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) names.push(...findCallables(path));
    else if (path.endsWith(".ts") && !path.endsWith(".test.ts")) {
      for (const m of readFileSync(path, "utf8").matchAll(/export const (\w+)\s*=\s*onCall\(/g)) names.push(m[1]!);
    }
  }
  return names.sort();
}

type Policy = { bindings?: { role: string; members: string[] }[]; etag?: string };

async function main() {
  const callables = findCallables(join(__dirname, "..", "functions", "src"));
  if (callables.length === 0) throw new Error("Aucune fonction callable trouvée dans functions/src.");
  console.log(`Fonctions callables : ${callables.join(", ")}`);
  if (dryRun) return;

  const { access_token } = await applicationDefault().getAccessToken();
  const headers = { authorization: `Bearer ${access_token}`, "content-type": "application/json" };
  let failures = 0;

  for (const fn of callables) {
    // Cloud Run nomme le service d'une fonction de 2e génération d'après son nom, en minuscules.
    const service = `projects/${project}/locations/${REGION}/services/${fn.toLowerCase()}`;
    const base = `https://run.googleapis.com/v2/${service}`;
    const get = await fetch(`${base}:getIamPolicy`, { headers });
    if (!get.ok) {
      failures++;
      console.error(`✖ ${fn} : lecture des droits impossible (${get.status}) ${await get.text()}`);
      continue;
    }
    const policy = (await get.json()) as Policy;
    const bindings = policy.bindings ?? [];
    const invoker = bindings.find((b) => b.role === ROLE);
    if (invoker?.members.includes(MEMBER)) {
      console.log(`✔ ${fn} : déjà appelable.`);
      continue;
    }
    if (invoker) invoker.members.push(MEMBER);
    else bindings.push({ role: ROLE, members: [MEMBER] });
    const set = await fetch(`${base}:setIamPolicy`, {
      method: "POST",
      headers,
      body: JSON.stringify({ policy: { ...policy, bindings } }),
    });
    if (!set.ok) {
      failures++;
      console.error(`✖ ${fn} : modification refusée (${set.status}) ${await set.text()}`);
      continue;
    }
    console.log(`✅ ${fn} : rendue appelable.`);
  }

  if (failures > 0) {
    console.error(
      "\n::error::Le compte de service n'a pas le droit de rendre les fonctions appelables. " +
        "Dans console.cloud.google.com → IAM, ajouter le rôle « Cloud Run Admin » au compte github-deploy, puis relancer ce déploiement.",
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
