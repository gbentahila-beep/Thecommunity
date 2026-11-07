# Phase 1 — Analyse et architecture

> Plateforme d'expériences sociales au Maroc · Nom de travail : **CLUB.** · Statut : **en attente de validation — aucun code applicatif n'a été écrit**

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

## Décisions structurantes à valider

| # | Décision | Recommandation |
|---|---|---|
| **D1** | Nom de marque et domaine | « CLUB. » reste un nom de travail. Le nom définitif peut arriver en phase 2 sans impact technique, mais doit être vérifié (OMPIC, domaine) avant les visuels finaux. Quel nom retenez-vous ? |
| **D2** | Entité juridique et prestataire de paiement | Une société marocaine encaisse en MAD. Lancer **tout de suite** la demande auprès de 2–3 prestataires (CMI via votre banque, Payzone, YouCan Pay) et comparer les offres réelles. Je développe avec l'adaptateur de test en attendant. |
| **D3** | Région des données | `europe-west1` (Belgique), irréversible pour Firestore. Implique une formalité CNDP de transfert. |
| **D4** | Séparer Expérience et Session | Oui (voir [03 §2](03-modele-de-donnees.md#2-décision-clé--expérience--session-décision-d4)). |
| **D5** | Collecter le genre (facultatif) pour équilibrer les tables | Oui, facultatif avec « Je préfère ne pas répondre ». Sinon le matching ignore ce critère. |
| **D6** | Politique d'annulation par défaut | Remboursement intégral jusqu'à 48 h avant, rien ensuite ; remboursement intégral si la plateforme annule. Personnalisable par expérience. |
| **D7** | Arabe au lancement ? | Architecture bilingue et RTL dès la phase 2 ; lancement public en français, arabe activé dès que les contenus sont traduits. |
| **D8** | Onglet « Messages » de la maquette | Retiré au lancement (modération, sécurité), remplacé par « Notifications ». Messagerie de groupe en version ultérieure. |

Une fois ces points validés (ou corrigés), je démarre la **phase 2 : design et frontend** avec des données de démonstration clairement identifiées.
