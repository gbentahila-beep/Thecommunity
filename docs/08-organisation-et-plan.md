# 08 — Organisation du code et plan de développement

> Phase 1 · Document d'architecture · Statut : **validé**

## 1. Organisation des fichiers (monorepo npm workspaces)

```
thecommunity/
├── apps/
│   └── web/                         # Next.js (App Router)
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── (public)/        # accueil, experiences, [city], pages institutionnelles
│       │   │   ├── (auth)/          # inscription, connexion, mot de passe
│       │   │   ├── (account)/       # bienvenue, espace/*
│       │   │   └── reserver/        # tunnel de réservation
│       │   ├── admin/               # back-office (hors i18n, protégé)
│       │   ├── api/                 # routes serveur Next (session cookie, revalidation)
│       │   ├── sitemap.ts
│       │   └── robots.ts
│       ├── components/
│       │   ├── ui/                  # design system (Button, Card, Chip, Sheet…)
│       │   ├── experience/          # cartes, galerie, sélecteur de dates
│       │   ├── booking/
│       │   └── admin/
│       ├── lib/
│       │   ├── firebase/            # client.ts (SDK web), admin.ts (Admin SDK, serveur uniquement)
│       │   ├── data/                # requêtes Firestore typées (lecture)
│       │   ├── auth/                # session cookie, garde de rôle
│       │   └── i18n/
│       ├── messages/                # fr.json, ar.json, en.json
│       ├── styles/
│       └── middleware.ts
├── functions/                       # Cloud Functions v2
│   └── src/
│       ├── index.ts                 # exports
│       ├── reservations/
│       ├── payments/
│       │   ├── providers/           # sandbox.ts, cmi.ts, … (implémentent PaymentProvider)
│       │   └── webhook.ts
│       ├── waitlist/
│       ├── groups/
│       ├── notifications/
│       │   └── email/               # adaptateur + templates FR/AR
│       ├── admin/
│       ├── stats/
│       ├── account/
│       └── lib/                     # auth guards, audit, rate limit, erreurs
├── packages/
│   ├── shared/                      # types, schémas Zod, constantes, prix, politique d'annulation
│   └── matching/                    # algorithme de groupes (pur, testé)
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── tests/
│   ├── rules/                       # tests des règles (émulateur)
│   ├── functions/                   # tests d'intégration (émulateur) dont concurrence
│   └── e2e/                         # Playwright (mobile + desktop)
├── scripts/
│   ├── seed.ts                      # données de démonstration (isDemo: true)
│   └── bootstrap-superadmin.ts
├── docs/                            # ce dossier
├── firebase.json                    # émulateurs, functions, hosting
├── .firebaserc                      # alias dev / prod
├── apphosting.yaml
└── .github/workflows/ci.yml
```

## 2. Stratégie de test

| Niveau | Outil | Exemples |
|---|---|---|
| Unitaires | Vitest | Prix + promo, politique d'annulation, découpage en groupes, score de matching, fuseaux horaires |
| Règles de sécurité | `@firebase/rules-unit-testing` + émulateur | Un utilisateur ne lit pas la réservation d'un autre ; ne change pas son rôle ; ne voit pas un groupe non révélé |
| Intégration | Émulateurs Auth/Firestore/Functions | Réservation → paiement test → webhook → confirmé ; expiration ; annulation + liste d'attente ; **50 réservations simultanées pour 12 places** |
| End-to-end | Playwright (iPhone, Android, desktop) | Parcours complet visiteur → avis ; création d'expérience admin |
| Qualité | ESLint, `tsc --noEmit`, Lighthouse CI | Zéro erreur TypeScript, performance mobile |

La CI exécute tout cela à chaque push. Une fonctionnalité n'est « terminée » que si ses tests passent.

## 3. Plan de développement

Chaque phase se termine par une démonstration et **votre validation** avant la suivante.

| Phase | Contenu | Livrable de validation |
|---|---|---|
| **1 — Architecture** ✅ | Analyse, architecture, données, sécurité, pages, functions, risques, plan | Décisions D1–D8 validées (D2 en cours côté administratif) |
| **2 — Design & frontend** ✅ | Monorepo, design system, toutes les pages publiques, inscription/connexion (UI), questionnaire, espace utilisateur, back-office (UI) avec **données de démonstration identifiées** | Site navigable sur mobile et desktop, URL de prévisualisation |
| **3 — Firebase** ✅ | Projets dev/prod, Auth, Firestore, Storage, règles + tests, index, émulateurs, seed, App Check, CI | Connexion réelle, profil enregistré, tests de règles verts |
| **4 — Réservations** ✅ | Création d'expériences et sessions (admin), réservation transactionnelle, blocage, annulation, liste d'attente, historique, export | Tests de concurrence verts, parcours complet avec l'adaptateur de test |
| **5 — Avis, abonnements, factures, paiements** (détail : [15](15-feuille-de-route-suite.md)) | Adaptateur du prestataire retenu, webhook, remboursements, codes promo, réconciliation — **en mode test du prestataire** | Paiements et remboursements de test réussis bout en bout |
| **6 — Matching** | Algorithme v1, écran groupes (glisser-déposer, scores, alertes), révélation | Constitution des tables d'un dîner de démonstration |
| **7 — Notifications & statistiques** | E-mails transactionnels FR/AR, in-app, rappels, push, agrégats, tableau de bord financier, SEO complet | Rappel J-1 reçu, tableau de bord chiffré |
| **8 — Tests & lancement** | Recette complète, sécurité, performance, sauvegardes testées, projet prod, bascule paiement réel, ouverture | Checklist de lancement signée |

**Chemin vers un MVP vendable :** phases 2 → 5 avec un back-office permettant d'attribuer les tables **manuellement** ; le matching automatique (6) arrive juste après, sans bloquer les premières ventes (les premières sessions de dîners peuvent être composées à la main).

## 4. Hypothèses retenues sans validation (modifiables)

- Gestion de paquets : npm workspaces ; Node.js 22.
- Service e-mail : Brevo (via une interface remplaçable).
- Durée de blocage d'une place pendant le paiement : 15 minutes ; 24 h après acceptation d'une demande ; 4 h pour une place proposée depuis la liste d'attente.
- Fermeture des réservations : 12 h avant pour les dîners, 2 h pour les autres formats (paramétrable).
- Âge minimum : 18 ans.
- Favoris implémentés (présents sur la maquette).
- Onglet « Messages » de la maquette remplacé par « Notifications » au lancement.
