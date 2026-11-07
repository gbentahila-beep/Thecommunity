# The Community — plateforme d'expériences sociales au Maroc

Découvrir des expériences, rencontrer de nouvelles personnes et sortir de sa routine. Lancement à Casablanca, puis Rabat, Marrakech, Tanger, Agadir.

Stack prévue : Next.js · React · TypeScript · Tailwind CSS · Firebase (Auth, Firestore, Storage, Cloud Functions, FCM, App Check, App Hosting).

## État du projet

**Phase 1 — Architecture : validée.** **Phase 2 — Design et frontend : terminée** (site public, espace membre et back-office `/admin` avec données de démonstration, voir [`docs/10-phase-2-avancement.md`](docs/10-phase-2-avancement.md)).

👉 Lire [`docs/README.md`](docs/README.md) pour l'architecture complète et les décisions prises, et [`docs/09-demarches-lancement.md`](docs/09-demarches-lancement.md) pour les démarches administratives.

## Développement

```bash
npm install
npm run dev        # http://localhost:3000
npm run test && npm run typecheck && npm run lint && npm run build
```

👉 À faire avant la mise en ligne : [`docs/11-checklist-avant-lancement.md`](docs/11-checklist-avant-lancement.md)

Structure : `apps/web` (site Next.js), `packages/shared` (logique métier partagée), `docs/` (architecture et décisions).
