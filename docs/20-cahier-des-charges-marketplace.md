# 20 — Cahier des charges « marketplace » (20 novembre 2026) : ce qu'on a, ce qu'il faut changer, ce qu'il faut ajouter

Rita a repensé le projet en marketplace d'activités (clients, **organisateurs**, administration), lancement à Casablanca.
La direction artistique ne change pas (section 3 du cahier des charges écartée à sa demande).
On avance **étape par étape** : chaque étape ci-dessous attend un « go ».

Légende : ✅ déjà fait · 🟡 existe, à améliorer · ➕ à ajouter

---

## Décisions de Rita (20 novembre)

1. Encaisser pour le compte des organisateurs : **oui**, modèles A (tout en ligne) et B (acompte) **en plus** du modèle actuel (C : frais en ligne, reste sur place).
   À vérifier avant la mise en ligne réelle : le contrat CMI doit autoriser l'encaissement pour compte de tiers, et l'avocat valider le schéma (docs/16).
2. Paiement réel : avec la **CMI**, bientôt.
3. Côté social : **gardé en option** par activité.
4. Catégories : **dynamiques**, adresses actuelles conservées.
5. Noms techniques : **conservés**.
6. Rôle juridique : **je rédige** contrat organisateur et CGV séparées (relecture avocat).
7. Environnements : non précisé → hypothèse retenue (essai = préproduction, production créée au lancement).

« Go » pour les étapes **19 à 24** (20 novembre).

## Points à trancher avant de commencer (avec mon hypothèse par défaut)

1. **Encaisser pour le compte des organisateurs (modèles A « tout en ligne » et B « acompte »)**.
   Aujourd'hui, la règle est : *The Host Club n'encaisse jamais la part partenaire*. Encaisser l'argent d'un organisateur puis le lui reverser,
   c'est de l'encaissement pour compte de tiers : statut et contrat bancaire particuliers au Maroc.
   → **Hypothèse** : le modèle **C** (frais de réservation en ligne, reste payé sur place au partenaire) est celui par défaut ;
   le modèle **A** seulement pour les expériences que The Host Club vend lui-même ; le modèle **B** codé mais **désactivé**
   tant que l'avocat et la banque ne l'ont pas validé.
2. **Paiement réel** : le cahier exige un vrai paiement par carte. Il faut un contrat avec un prestataire marocain
   (ex. CMI ou un agrégateur), après l'ouverture du compte pro. → **Hypothèse** : architecture prête (elle l'est déjà :
   interface « prestataire »), branchement dès que le contrat existe ; en attendant, virement + paiement de test **uniquement en test**.
3. **Le côté « social » (tables composées, questionnaire)** : le cahier dit de ne pas faire de matching au lancement.
   C'est pourtant ce qui nous distingue de Timeleft et des annuaires. → **Hypothèse** : on garde, **en option par activité**
   (« activité sociale »), jamais imposé aux organisateurs. Rien n'est supprimé.
4. **Univers / catégories** : aujourd'hui 5 univers figés dans le code (dîners, sport, jeux, ateliers, sorties).
   Le cahier en veut 7, avec sous-catégories, image et icône, gérés par l'administrateur. → **Hypothèse** : rendre les catégories
   entièrement dynamiques (gros chantier technique, 8 fichiers clés), en gardant les adresses actuelles.
5. **Noms techniques et adresses** (« activities », « bookings », `/activite/...`) : on garde les nôtres (`experiences`,
   `reservations`, `/experiences/...`) : renommer coûte cher, casse le référencement déjà en place et n'apporte rien.
   Table de correspondance plus bas. Les pages ville/catégorie peuvent avoir des adresses en français (`/casablanca/ateliers-creatifs`).
6. **Rôle juridique** : avec des organisateurs indépendants, The Host Club devient **intermédiaire** pour leurs activités
   (et reste vendeur pour les siennes). Il faut séparer les CGV, écrire un **contrat organisateur** et vérifier la loi 31-08
   (protection du consommateur). → À faire relire par l'avocat ; je rédige les projets.
7. **Environnements** : le cahier exige développement / préproduction / production séparés. Aujourd'hui : émulateurs (dev) +
   projet d'essai `the-community-36766`. → **Hypothèse** : l'essai devient la préproduction ; Rita crée un projet **production**
   (facturation, domaine) au moment du lancement.

---

## Section par section

### 2. Trois espaces
- ✅ Espace client, ✅ back-office administrateur.
- ➕ **Espace organisateur** : n'existe pas. Les partenaires sont gérés par l'équipe seulement (le rôle « organisateur » existe déjà dans les droits, sans écrans).

### 4. Espace client
| Élément | État | Ce qui manque |
|---|---|---|
| Accueil (accroche, univers, sections, cartes) | ✅ | 🟡 sections et bannière **modifiables par l'admin** ; « Ce week-end », « Nouveautés », « Populaires » automatiques |
| Header (ville, recherche, compte, réservations) | 🟡 | ➕ **barre de recherche** avec suggestions |
| Catalogue | 🟡 filtres univers + « quand » | ➕ filtres prix, quartier, débutants, seul / en groupe, disponible ; ➕ **tri** ; ➕ panneau de filtres mobile ; ➕ recherche tolérante aux fautes |
| Cartes d'activités | ✅ photo, univers, quartier, date, prix, note, places | 🟡 badges « populaire », « nouveau », « dernières places » à généraliser |
| Fiche activité | ✅ galerie, infos, inclus, à apporter, niveau, âge, langues, dates, prix en deux parts, lieu révélé plus tard | ➕ galerie plein écran ; ➕ bloc **organisateur** (nom, logo, note, avis) ; ➕ carte (lieu public) ; ➕ « non inclus » |
| Parcours de réservation | ✅ date, places, connexion, récapitulatif, paiement, confirmation, blocage 15 min, numéro / billet | 🟡 informations complémentaires demandées par l'organisateur ; 🟡 modèles de paiement A / B / C par activité **et par date** |
| Compte client | ✅ tableau de bord, réservations par statut, billet QR, factures, favoris, notifications, profil, avis, données personnelles | 🟡 statut « partiellement remboursé » ; ➕ demande de remboursement suivie ; ➕ photo dans un avis |

### 5. Espace organisateur — ➕ entièrement à créer
Inscription (documents, acceptation du contrat) → validation par l'admin (accepter, refuser, demander un complément, suspendre)
→ tableau de bord (réservations, participants, chiffre d'affaires, commissions dues, remplissage) → création d'activités
(brouillon → envoi en validation → publication) → **dates** (plusieurs d'un coup, récurrentes, prix et date limite propres à chaque date)
→ réservations et participants (filtres, export CSV, pointage par **QR code** — déjà fait pour l'équipe, à ouvrir aux organisateurs)
→ statistiques. Chaque organisateur ne voit **que** ses données (règles de sécurité + tests).
On réutilise : formulaire d'expérience, dates récurrentes, scan des billets, export, propositions des membres de confiance (même circuit de validation).

### 6. Administration
| Module | État | Ce qui manque |
|---|---|---|
| Tableau de bord | 🟡 statistiques, santé du site | ➕ GMV, revenus plateforme, **à reverser**, remboursements, taux d'annulation ; filtres date et ville |
| Utilisateurs | ✅ recherche, rôle, suspension, membres de confiance, journal | 🟡 historique et signalements par personne |
| Organisateurs | 🟡 « Partenaires » (fiche, candidatures, assurance) | ➕ validation des comptes organisateurs, performances, commissions par organisateur |
| Activités | ✅ créer, modifier, archiver, dates | ➕ **valider / refuser** une activité d'organisateur, badges, ordre d'affichage, mise en avant |
| Catégories | 🟡 5 univers modifiables (textes) | ➕ catégories dynamiques, sous-catégories, image, icône, ordre (voir point 4) |
| Réservations | ✅ filtres, annuler, déplacer, pointer, exporter, journal | 🟡 correction de statut documentée, historique d'événements par réservation |
| **Commissions** | 🟡 commission ou coût par expérience, commission sur la part sur place, tableau « En ligne / sur place » | ➕ règles globale / organisateur / catégorie / activité **avec date d'effet**, **copie figée sur chaque réservation**, **registre des commissions** (dû, payé, soldé) |
| **Remboursements** | 🟡 automatiques à l'annulation, remboursement manuel des virements | ➕ tableau des **demandes**, refus motivé, remboursements partiels, justificatif hors plateforme, plafond = montant encaissé |
| Contenus | 🟡 blog, aide, pages légales (dans le code) | ➕ bannière, sections d'accueil, FAQ modifiables par l'admin |
| Codes promo | ✅ code, %, montant, dates, plafond, une fois par personne | ➕ par activité, montant minimum, plafond par personne paramétrable |
| Journal | ✅ actions sensibles journalisées | — |

### 7. Paiement
- ✅ interface « prestataire » interchangeable, ✅ virement avec référence, ✅ paiement de test (en test seulement), ✅ idempotence,
  ✅ vérification côté serveur, ✅ jamais de données de carte.
- ➕ prestataire carte réel (contrat), ➕ webhooks signés, ➕ statuts « partiellement remboursé », ➕ **acompte (modèle B)** derrière interrupteur.

### 8. Notifications
- ✅ dans l'application (pastille non lus), ✅ e-mails (boîte d'envoi de test, Brevo prêt à brancher), ✅ rappels J-1 / H-3, changements de date ou de lieu.
- ➕ notifications **organisateur** (nouvelle réservation, annulation, avis, date presque complète), ➕ push (FCM), ➕ WhatsApp plus tard (API officielle, consentement).

### 9. Annulations
- ✅ annulation client (48 h), ✅ annulation d'une date par l'équipe avec remboursements, ✅ journal.
- ➕ **politiques configurables** (paliers : 100 % / 50 % / 0 %), ➕ annulation d'une date **par l'organisateur**, ➕ frais non remboursables affichés avant paiement.

### 10. Avis
- ✅ avis des participants présents, note moyenne calculée par le serveur, modération.
- ➕ réponse de l'organisateur, ➕ signalement d'un avis, ➕ historique de modération, ➕ note de l'organisateur.

### 11. Recherche et recommandations
- ➕ recherche (nom, description, univers, quartier, organisateur) tolérante aux fautes simples ; ➕ recommandations simples (populaires, récentes, mieux notées, proches de la date).

### 12. Social (optionnel)
- ✅ déjà plus loin que demandé : venir seul ou à plusieurs, tables composées, questionnaire, membres de confiance. **Gardé en option** (point 3). Pas de messagerie ni de profils publics (conforme).

### 13. Villes
- ✅ villes modifiables, une seule active. 🟡 ajouter région, image, pays ; choix de la ville par l'utilisateur.

### 14. Commercial
- ✅ mise en avant (manuelle), ✅ abonnement **membres** (côté clients, non prévu par le cahier : gardé). Parrainage et abonnement organisateurs : plus tard.

### 15–16. Données et règles métier
- ✅ transactions Firestore, aucune double réservation (test : 50 personnes pour 12 places), blocage temporaire, idempotence, prix figé à la réservation, rien n'est supprimé (statuts).
- ➕ collections `organizers`, `refunds`, `commissionLedger`, `commissionRules` ; ➕ copie de la commission et de la politique d'annulation sur chaque réservation.

| Cahier des charges | Chez nous |
|---|---|
| activities | experiences |
| bookings | reservations |
| sessions | sessions |
| organizers | partners (à faire évoluer en organisateurs avec comptes) |
| coupons | promoCodes |
| adminLogs | auditLogs |
| categories / cities | categories / cities |
| notifications | users/{uid}/notifications |

### 17. Sécurité
- ✅ règles restrictives testées (143 tests), opérations financières côté serveur, App Check prêt, journal.
- ➕ rôle organisateur **cloisonné** (règles + tests « un organisateur ne voit pas un concurrent »), ➕ stockage des documents des organisateurs (privés).

### 18. SEO — ✅ adresses propres, titres, descriptions, Open Graph, sitemap, robots, données structurées, rendu serveur. ➕ pages organisateur, adresses de catégories en français.
### 19. Analytics — ➕ suivi des événements (recherche, fiche, début de réservation, paiement réussi / échoué…) avec bandeau de consentement ; indicateurs GMV, conversion, fidélisation dans l'admin.
### 20. Langues — ✅ français, arabe **et** anglais (en avance sur le cahier), MAD, fuseau Casablanca.
### 21. Juridique — 🟡 CGU, CGV, confidentialité, sécurité, charte, conditions activités physiques (projets) ; ➕ contrat organisateur, politique de remboursement, loi 31-08 ; relecture avocat et comptable.
### 22. Technique — ✅ Next.js, TypeScript, Tailwind, Firebase (Auth, Firestore, Storage, Functions, App Hosting). ➕ FCM, Analytics, environnement production.
### 25. Tests critiques — ✅ dernière place simultanée, paiement notifié plusieurs fois, rôle modifié par l'utilisateur, paiement échoué après blocage, date annulée avec plusieurs clients. ➕ organisateur qui consulte un concurrent, remboursement demandé deux fois.

---

## Étapes proposées (une à la fois, chacune sur « go »)

| Étape | Contenu | Taille | Dépend de Rita |
|---|---|---|---|
| **19** | **Fondations marketplace** : organisateurs (comptes liés aux partenaires), rôles cloisonnés + règles + tests d'isolement, catégories dynamiques (7, sous-catégories, image, icône), villes enrichies | Grande | Décision points 4 et 5 |
| **20** | **Espace organisateur** : inscription + documents + contrat, validation admin, tableau de bord, activités (brouillon → validation → publication), dates multiples / récurrentes / prix par date, réservations, participants, scan QR, export CSV, notifications organisateur | Très grande | Projet de contrat organisateur |
| **21** | **Commissions et comptabilité** : règles avec date d'effet, copie sur chaque réservation, registre (dû / payé / soldé), relevé organisateur, tableau admin GMV / revenus / à reverser | Grande | Comptable (TVA sur commissions) |
| **22** | **Réservation, annulation, remboursement** : modèles A / C (B désactivé), politiques d'annulation configurables, demandes de remboursement, remboursements partiels, confirmation par l'organisateur | Grande | Point 1 |
| **23** | **Catalogue et découverte** : recherche avec suggestions, filtres combinables + tri, panneau mobile, pages organisateur, galerie plein écran, carte, badges, accueil modifiable par l'admin | Moyenne | — |
| **24** | **Avis** : réponse de l'organisateur, signalement, historique de modération, note organisateur | Petite | — |
| **25** | **Paiement réel, e-mails, push, analytics** | Moyenne | Contrat prestataire, Brevo, consentement cookies |
| **26** | **Pilotage admin** : tableau de bord complet, contenus modifiables, codes promo enrichis, exports | Moyenne | — |
| **27** | **Production** : projet de production, préproduction, surveillance, documentation de livraison (section 26 du cahier) | Moyenne | Projet Firebase prod, domaine, CNDP, avocat |
