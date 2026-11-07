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

S'y ajoutent les tests unitaires du module partagé et les vérifications de bout en bout des phases 2b et 2c.

### Écart avec le document 04

Les expériences et sessions ne sont **plus modifiables directement par un admin** depuis le navigateur : tout passe par des Cloud Functions (validation complète, journalisation). C'est plus strict que prévu initialement.

### Comptes de démonstration (émulateurs uniquement)

| Compte | Rôle |
|---|---|
| `admin@thecommunity.test` | super-admin |
| `salma@thecommunity.test` | membre |

Mot de passe : `Demo2026!`. Ces comptes n'existent que dans les émulateurs locaux, jamais sur un vrai projet.

## Étape 3b — Le site branché sur Firebase ✅

Le site fonctionne désormais en **deux modes**, choisis par la configuration (aucun changement de code) :

| Mode | Quand | Comportement |
|---|---|---|
| Démonstration | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` absent (ex. intégration continue) | Données fictives de la phase 2, aucun compte |
| Firebase | Configuration présente (émulateurs, projet d'essai, puis projet réel) | Vrais comptes, vraie base de données, vraies photos |

| Livré | Détail |
|---|---|
| Inscription | Prénom, e-mail, mot de passe (8 caractères min.), **consentements obligatoires** (CGU, confidentialité, charte) et prospection facultative, **horodatés par le serveur** avec la version des textes (fonction `acceptTerms`) ; e-mail de confirmation envoyé |
| Connexion / déconnexion | Messages d'erreur clairs ; **cookie de session httpOnly** créé et vérifié côté serveur (révocation contrôlée) ; la déconnexion révoque les sessions ; protection contre les redirections externes |
| Mot de passe oublié | Lien de réinitialisation par e-mail, sans révéler si un compte existe |
| Confirmation d'e-mail | Bandeau dans l'espace membre, renvoi de l'e-mail, prise en compte immédiate |
| Questionnaire | Enregistré par le serveur (revalidation complète), **photo de profil envoyée dans Storage**, brouillon propre à chaque compte |
| Espace membre | Accessible seulement connecté (sinon redirection), questionnaire obligatoire avant d'y entrer, compte suspendu bloqué ; réservations, groupe révélé, notifications lues depuis Firestore **uniquement pour l'utilisateur connecté** |
| Préférences, notifications, favoris | Enregistrés dans le compte (favoris synchronisés entre appareils) |
| Mes données (loi 09-08) | Export JSON de toutes ses données ; demande de suppression enregistrée |
| Catalogue public | Villes, univers, expériences, dates et avis lus depuis Firestore |
| Contact | Formulaire enregistré dans Firestore (format contrôlé par les règles) |

### Tests

- **25 vérifications de bout en bout sur les émulateurs** (`tests/e2e/firebase-auth.e2e.cjs`) : catalogue Firestore, espace protégé, mauvais mot de passe, consentement obligatoire, inscription, questionnaire et photo enregistrés, consentements horodatés, confirmation d'e-mail, préférences, favoris, déconnexion, connexion d'un membre existant, groupe révélé, **réservation d'un autre membre introuvable**, notifications, export limité à ses propres données, demande de suppression, jeton de session falsifié refusé, mot de passe oublié, contact.
- **34 tests de règles et de fonctions** (+2 : consentements ; genre facultatif).
- **27 tests unitaires**, et les **60 vérifications du mode démonstration** repassent sans régression.

Bug trouvé et corrigé par ces tests : un questionnaire sans genre (champ facultatif) était refusé par le serveur, car Firebase transmet un champ vide comme « null ».

### Limites connues (traitées ensuite)

- **Back-office** : toujours en données fictives et non protégé → étape 3c.
- **E-mails** (confirmation, mot de passe) : modèles par défaut de Firebase → à traduire / personnaliser dans la console au branchement du projet réel.
- **Demandes de suppression** : enregistrées ; leur traitement automatique viendra plus tard, une liste dans le back-office arrive en 3c.
- **App Check** (protection anti-robots) : nécessite un vrai projet et une clé reCAPTCHA → 3d.
- Réservation et paiement : phases 4 et 5.

## Étape 3c — Le back-office branché ✅

| Livré | Détail |
|---|---|
| Accès réservé | `/admin` exige une connexion avec le rôle **admin** ou **super-admin** (vérifié côté serveur à chaque page) ; un membre reçoit une page introuvable ; le compte connecté et un bouton de déconnexion sont affichés |
| Données réelles | Tableau de bord, sessions, participants, réservations, utilisateurs, partenaires, paiements, codes promo, statistiques et paramètres lus depuis Firestore |
| Créer / modifier une expérience | Bouton **« Enregistrer »** : photos envoyées dans Storage (dossier de l'expérience), puis fonction serveur `adminSaveExperience` qui revalide tout, génère l'adresse de la fiche (unique), crée l'expérience, son modèle économique et ses dates en une seule opération, et journalise. Modification possible après publication (sans toucher aux places déjà vendues) ; ajout de nouvelles dates à la demande. Les pages publiques sont rafraîchies immédiatement |
| Comptes | **Suspendre / réactiver** (le compte suspendu ne peut plus se connecter ; un admin ne peut pas suspendre un membre de l'équipe) ; **changer un rôle** (super-admin uniquement) |
| Demandes 09-08 | Nouvelle page listant les demandes de suppression / export |
| Journal | Création, modification, suspension et changement de rôle enregistrés dans `auditLogs` |

### Tests

- **27 vérifications de bout en bout du back-office sur émulateurs** (`tests/e2e/firebase-admin.e2e.cjs`) : redirection sans session, refus d'un membre, connexion admin, création d'une expérience avec photo et 2 dates, fiche et photo visibles sur le site, catalogue rafraîchi, modification du prix sans doublon de dates, suspension (connexion refusée) puis réactivation, nomination d'un admin (claim posé, accès accordé, pas de choix des rôles pour un simple admin), journal, page 09-08.
- **41 tests de règles et de fonctions** (+7), **25 vérifications** de l'espace membre sur Firebase, **27 tests unitaires**, **60 vérifications** du mode démonstration : tout passe.

Bug trouvé et corrigé : comme pour le genre, les champs facultatifs vides du formulaire (ex. commission inutilisée) étaient transmis comme « null » et refusés ; le site ne les envoie plus et le serveur les ignore.

### Limites connues

- Les photos ne sont pas encore redimensionnées automatiquement (prévoir des photos de taille raisonnable, 8 Mo maximum).
- Partenaires et codes promo : consultation seulement (création en phases 4–5).
- Groupes : composition à l'écran, enregistrement en phase 6. Annulation/remboursement : phase 4.
- Traitement automatique des demandes de suppression : à venir.

## Étape 3d — Mise en ligne sur le projet d'essai (en cours)

Préparé côté code :
- alias `dev` → `the-community-36766` (`.firebaserc`) et configuration App Hosting (`apps/web/apphosting.yaml`) ;
- workflow **« Déploiement — projet d'essai »** (`.github/workflows/deploy-dev.yml`) : règles, index, fonctions, contenu de départ (`scripts/seed-content.ts`, jamais de comptes ni de réservations fictifs) et super-admins (variable `SUPERADMIN_EMAILS`) ; inactif tant que la clé n'est pas enregistrée ;
- le site ne lit plus la base pendant sa compilation (la machine de build n'y a pas accès) : pages rendues à la visite, **catalogue mis en cache 5 minutes** (lectures Firestore limitées) et vidé à chaque modification dans le back-office.

Vérifié : compilation en mode Firebase **sans aucun accès à la base**, puis 52 vérifications sur émulateurs, 60 en mode démonstration, 27 tests unitaires.

Reste à faire par Rita : [13 — Mise en ligne sur le projet d'essai](13-mise-en-ligne-essai.md).

## Lancer en local

```bash
npm install
npm run emulators      # terminal 1 — interface des émulateurs : http://localhost:4000
npm run seed           # terminal 2 — données de démonstration
cp apps/web/.env.example apps/web/.env.local   # puis décommenter le bloc « Émulateurs locaux »
npm run dev            # terminal 3 — site branché sur les émulateurs : http://localhost:3000
npm run test:rules     # tests des règles et des fonctions (lance ses propres émulateurs)
```

Les e-mails (confirmation, mot de passe oublié) ne partent pas réellement avec les émulateurs : les liens apparaissent dans l'interface des émulateurs (onglet Authentication).

Prérequis : Node.js 22 et Java 21.

> Note pour l'environnement de développement de Claude : un proxy réseau y intercepte la communication interne entre émulateurs. Il faut lancer les émulateurs sans les variables `HTTPS_PROXY` / `https_proxy`. Ce n'est pas nécessaire sur un ordinateur normal, ni dans GitHub Actions.
