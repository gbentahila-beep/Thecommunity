#!/usr/bin/env bash
# Régénère apps/web/package-lock.json « autonome », utilisé par Firebase App Hosting
# (qui installe le site depuis le dossier apps/web). À lancer après tout changement
# de dépendances du site : npm run lock:web
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/apps/web" "$TMP/packages"
cp "$ROOT/apps/web/package.json" "$ROOT/apps/web/.npmrc" "$TMP/apps/web/"
cp -r "$ROOT/packages/shared" "$TMP/packages/"
rm -rf "$TMP/packages/shared/node_modules"
(cd "$TMP/apps/web" && npm install --package-lock-only --no-audit --no-fund >/dev/null)
cp "$TMP/apps/web/package-lock.json" "$ROOT/apps/web/package-lock.json"
echo "apps/web/package-lock.json régénéré."
