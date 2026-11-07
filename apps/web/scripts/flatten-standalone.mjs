// Firebase App Hosting attend le serveur autonome de Next.js (mode « standalone ») à la racine
// de .next/standalone. Dans notre projet en plusieurs dossiers, Next.js le range dans
// .next/standalone/apps/web/ : on le remonte d'un niveau, sans toucher aux dépendances partagées.
// Sans mode standalone (build local habituel), ce script ne fait rien.
import fs from "node:fs";
import path from "node:path";

const standalone = path.join(process.cwd(), ".next", "standalone");
if (!fs.existsSync(standalone) || fs.existsSync(path.join(standalone, "server.js"))) process.exit(0);

function findServerDir(dir, depth = 0) {
  if (depth > 4) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === ".next") continue;
    const candidate = path.join(dir, entry.name);
    if (fs.existsSync(path.join(candidate, "server.js")) && fs.existsSync(path.join(candidate, ".next"))) return candidate;
    const deeper = findServerDir(candidate, depth + 1);
    if (deeper) return deeper;
  }
  return null;
}

function merge(src, dest) {
  for (const entry of fs.readdirSync(src)) {
    const from = path.join(src, entry);
    const to = path.join(dest, entry);
    if (fs.existsSync(to) && fs.lstatSync(from).isDirectory() && !fs.lstatSync(from).isSymbolicLink() && fs.lstatSync(to).isDirectory()) {
      merge(from, to);
    } else {
      fs.rmSync(to, { recursive: true, force: true });
      fs.renameSync(from, to);
    }
  }
  fs.rmSync(src, { recursive: true, force: true });
}

const nested = findServerDir(standalone);
if (!nested) {
  console.error("flatten-standalone : server.js introuvable dans .next/standalone");
  process.exit(1);
}
const relative = path.relative(standalone, nested);

// Les liens symboliques relatifs (ex. .next/node_modules/firebase-admin-<hash> créés par Turbopack)
// pointent vers ../../../../node_modules : on note leur cible réelle AVANT de déplacer les fichiers…
const links = [];
(function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) links.push({ rel: path.relative(nested, p), target: path.resolve(dir, fs.readlinkSync(p)) });
    else if (entry.isDirectory()) collect(p);
  }
})(nested);

merge(nested, standalone);

// … puis on les recrée avec un chemin relatif valable depuis leur nouvel emplacement.
for (const { rel, target } of links) {
  const moved = path.join(standalone, rel);
  const newTarget = target.startsWith(nested + path.sep) ? path.join(standalone, path.relative(nested, target)) : target;
  fs.rmSync(moved, { force: true });
  fs.symlinkSync(path.relative(path.dirname(moved), newTarget), moved);
}
if (links.length) console.log(`flatten-standalone : ${links.length} lien(s) symbolique(s) recalculé(s)`);
// Supprime les dossiers parents devenus vides (ex. « apps »).
let parent = path.dirname(nested);
while (parent.startsWith(standalone) && parent !== standalone && fs.existsSync(parent) && fs.readdirSync(parent).length === 0) {
  fs.rmdirSync(parent);
  parent = path.dirname(parent);
}
console.log(`flatten-standalone : serveur remonté depuis .next/standalone/${relative}`);
