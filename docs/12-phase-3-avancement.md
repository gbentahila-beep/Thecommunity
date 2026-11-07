# 12 — Phase 3 : Firebase — avancement

> Tout se développe et se teste sur les **émulateurs Firebase** (une copie locale de Firebase, sans compte ni coût).
> Le branchement à un vrai projet (essai, puis réel) se fera en publiant le même code ; aucune réécriture n'est nécessaire.

## Étape 3a — Infrastructure, sécurité et comptes ✅

| Livré | Fichier(s) |
|---|---|
| Configuration Firebase : Firestore, Storage, Functions, émulateurs (comptes, base, stockage, fonctions, interface d'administration locale sur le port 4000) | `firebase.json`, `.firebaserc` |
| **Règles de sécurité Firestore** pour toutes les collections du modèle (refus par défaut ; rien de sensible n'est écrit par le navigateur) | `firebase/firestore.rules` |
| **Règles de sécurité Storage** (photos d'expériences publiques mais envoyées par l'équipe, 8 Mo ; photo de profil 3 Mo par son propriétaire ; exports interdits) | `firebase/storage.rules` |
| 14 index composites pour le catalogue, l'espace membre et le back-office | `firebase/firestore.indexes.json` |
| **Cloud Functions** (région Belgique) : création automatique du profil à l'inscription ; enregistrement du questionnaire **revalidé côté serveur** avec le même schéma que le navigateur ; attribution des rôles par le super-admin, avec révocation des sessions et journal d'audit | `functions/src/` |
| Script de **données de démonstration** pour les émulateurs (1 006 documents, 66 comptes), qui refuse de tourner ailleurs que sur un projet `demo-*` | `scripts/seed.ts` |
| Script de nomination du **premier super-admin** d'un vrai projet | `scripts/bootstrap-superadmin.ts` |
| **Intégration continue GitHub** : types, lint, tests unitaires, build, règles et fonctions sur émulateurs, à chaque envoi de code | `.github/workflows/ci.yml` |

### Tests

**32 tests sur émulateurs** (`npm run test:rules`), tous verts :

- **Firestore (21)** : un membre ne lit que son profil ; il ne peut ni s'attribuer un rôle, ni écrire son questionnaire directement, ni pointer sa photo vers le dossier d'un autre ; les modèles économiques et brouillons sont invisibles du public ; personne (même un admin) n'écrit directement places, réservations ou paiements ; un groupe n'est visible de ses membres qu'une fois révélé ; formulaires publics au format strict ; tout ce qui n'est pas prévu est refusé.
- **Storage (3)** : formats, tailles et propriétaires des fichiers.
- **Fonctions (8)** : profil créé à l'inscription ; questionnaire enregistré ; moins de 18 ans, ville fermée et champs non prévus (`role: superadmin`) refusés ou ignorés par le serveur ; un membre ne peut pas nommer un admin ; un super-admin le peut, l'action est journalisée ; il ne peut pas se retirer ses propres droits.

S'y ajoutent les 26 tests unitaires du module partagé et les 60 vérifications de bout en bout des phases 2b et 2c.

### Écart avec le document 04

Les expériences et sessions ne sont **plus modifiables directement par un admin** depuis le navigateur : tout passe par des Cloud Functions (validation complète, journalisation). C'est plus strict que prévu initialement.

### Comptes de démonstration (émulateurs uniquement)

| Compte | Rôle |
|---|---|
| `admin@thecommunity.test` | super-admin |
| `salma@thecommunity.test` | membre |

Mot de passe : `Demo2026!`. Ces comptes n'existent que dans les émulateurs locaux, jamais sur un vrai projet.

## Prochaines étapes

- **3b — Brancher le site** : inscription, connexion, mot de passe oublié, vérification d'e-mail, questionnaire enregistré, espace membre et catalogue lus depuis Firestore, cookie de session côté serveur.
- **3c — Brancher le back-office** : accès réservé aux rôles admin, création/modification d'expériences et de dates, envoi des photos, gestion des rôles.
- **3d — Mise en ligne sur le projet d'essai** : quand tu me le diras (voir [checklist, section G](11-checklist-avant-lancement.md)).

## Lancer en local

```bash
npm install
npm run emulators      # terminal 1 — interface des émulateurs : http://localhost:4000
npm run seed           # terminal 2 — données de démonstration
npm run test:rules     # tests des règles et des fonctions (lance ses propres émulateurs)
```

Prérequis : Node.js 22 et Java 21.

> Note pour l'environnement de développement de Claude : un proxy réseau y intercepte la communication interne entre émulateurs. Il faut lancer les émulateurs sans les variables `HTTPS_PROXY` / `https_proxy`. Ce n'est pas nécessaire sur un ordinateur normal, ni dans GitHub Actions.
