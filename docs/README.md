# Phase 1 — Analyse et architecture

> Plateforme d'expériences sociales au Maroc · Marque : **The Community** · Statut : **phase 4 — site en ligne sur le projet d'essai ; réservation et paiement de test opérationnels (4a) ; annulation, liste d'attente et back-office des réservations à venir**

## Sommaire

| Document | Contenu |
|---|---|
| [01 — Analyse produit](01-analyse-produit.md) | Concept, modes de réservation, rôles, parcours, périmètre MVP, lecture de la maquette, spécificités Maroc |
| [02 — Architecture technique](02-architecture-technique.md) | Stack Next.js + Firebase, hébergement, environnements, rendu, multi-villes/langues/devises, abstraction paiement, notifications |
| [03 — Modèle de données](03-modele-de-donnees.md) | Collections Firestore, champs, relations, index |
| [04 — Rôles, sécurité, conformité](04-roles-et-securite.md) | Custom claims, règles Firestore/Storage, App Check, audit, sauvegardes, loi 09-08 |
| [05 — Pages et parcours](05-pages-et-parcours.md) | Routes publiques/utilisateur/admin, tunnel de réservation, design system, SEO |
| [06 — Cloud Functions](06-cloud-functions.md) | Inventaire des functions, transaction de réservation, paiement, annulation, liste d'attente, matching, finance |
| [07 — Risques](07-risques.md) | 16 risques et parades, dépendances externes |
| [08 — Organisation et plan](08-organisation-et-plan.md) | Arborescence, stratégie de test, plan en 8 phases, hypothèses |
| [09 — Démarches avant lancement](09-demarches-lancement.md) | Société, banque, prestataire de paiement, CNDP, marque : feuille de route non technique |
| [10 — Avancement phase 2](10-phase-2-avancement.md) | Ce qui est livré, vérifié, et ce qui reste |
| [12 — Avancement phase 3](12-phase-3-avancement.md) | Firebase : règles de sécurité, fonctions serveur, émulateurs, tests |
| [14 — Avancement phase 4](14-phase-4-avancement.md) | Réservations : transaction, blocage 15 min, paiement de test, concurrence |
| [13 — Mise en ligne sur le projet d'essai](13-mise-en-ligne-essai.md) | **À faire par Rita** : clé GitHub, App Hosting, compte super-admin |
| [11 — Checklist avant lancement](11-checklist-avant-lancement.md) | **À faire par Rita** : société, banque, paiement, CNDP, textes juridiques, marque, comptes, partenaires |

## Synthèse en 10 points

1. **Next.js + TypeScript + Tailwind** sur **Firebase App Hosting**, avec Auth, Firestore, Storage, Cloud Functions v2, FCM et App Check. Pas de backend externe.
2. **Le navigateur n'écrit rien de sensible** : places, prix, paiements, rôles et groupes passent exclusivement par des Cloud Functions, dans des transactions Firestore.
3. **Expérience ≠ Session** : la fiche (SEO, avis) est séparée de ses dates (places, réservations, groupes).
4. **5 modes de réservation** configurables par expérience : individuel, groupe, dîner social, libre, privatisé.
5. **Multi-villes par conception** : tout est rattaché à une `cityId` ; ouvrir Rabat = ajouter un document.
6. **Montants en centimes + devise**, dates en UTC affichées en `Africa/Casablanca`, textes localisés `{fr, ar}`.
7. **Paiement derrière une interface** : le prestataire marocain est un adaptateur interchangeable ; confirmation uniquement par webhook signé ; aucune donnée de carte chez nous.
8. **Rôles par custom claims** (`user`, `organizer`, `admin`, `superadmin`), attribués uniquement côté serveur, MFA pour les admins.
9. **Matching v1 à base de règles et de score**, module isolé et testé, toujours sous contrôle de l'admin.
10. **Tests à chaque niveau** (unitaires, règles, intégration avec concurrence, E2E mobile) et environnements dev/prod séparés.

## Décisions structurantes

| # | Décision | Statut |
|---|---|---|
| **D1** | Nom de marque | ✅ **The Community** (disponibilité OMPIC et domaine à vérifier, voir [09](09-demarches-lancement.md)) |
| **D2** | Entité juridique et prestataire de paiement | ⏳ **En cours** : aucune structure ni contrat à ce jour. Feuille de route dans [09](09-demarches-lancement.md). Le développement avance avec l'adaptateur de paiement de test |
| **D3** | Région des données | ✅ `europe-west1` (Belgique). Formalités CNDP à faire par la société avant l'ouverture au public |
| **D4** | Séparer Expérience et Session | ✅ Retenu (non contesté) |
| **D5** | Genre facultatif pour équilibrer les tables | ✅ Oui, avec « Je préfère ne pas répondre » |
| **D6** | Politique d'annulation par défaut | ✅ 100 % jusqu'à 48 h avant, 0 % ensuite, 100 % si la plateforme annule ; personnalisable par expérience |
| **D7** | Arabe | ✅ Architecture bilingue et RTL dès la phase 2 ; lancement en français, arabe activé après traduction |
| **D8** | Messagerie | ✅ Pas au lancement ; onglet « Notifications » à la place |

Phase 2 en cours : voir [10 — Avancement](10-phase-2-avancement.md).
