# 10 — Phase 2 : avancement

> Design et frontend avec **données de démonstration**. Aucune donnée réelle, aucun paiement, aucune connexion Firebase à ce stade.

## Étape 2a — Site public ✅

| Livré | Détail |
|---|---|
| Monorepo | `apps/web` (Next.js 16, React 19, TypeScript, Tailwind CSS 4) + `packages/shared` (types métier, montants en centimes, places, politique d'annulation 48 h, fuseau `Africa/Casablanca`) |
| Charte | Couleurs crème / prune, Fraunces (titres), Inter (texte), IBM Plex Sans Arabic (arabe), d'après la maquette |
| Bilingue | Français par défaut, arabe sous `/ar` avec mise en page de droite à gauche. Tous les textes d'interface sont traduits ; le contenu des fiches retombe sur le français quand la traduction manque |
| Pages publiques | Accueil, catalogue avec filtres (univers, date), page ville, page univers par ville, fiche expérience (galerie, dates, places restantes, avis, données structurées `Event`), comment ça marche, à propos, FAQ (`FAQPage`), contact, pages juridiques (en attente du texte juridique) |
| Parcours | Réservation : récapitulatif avec prix et conditions ; le bouton de paiement est **désactivé et l'indique clairement** (phases 4–5). Connexion / inscription : formulaires visuels, bouton désactivé (phase 3) |
| Mobile | Barre d'onglets (Explorer, Réservations, Notifications, Profil), barre « Réserver » collante sur les fiches, sélecteur de ville |
| Favoris | Fonctionnels, enregistrés dans le navigateur ; seront synchronisés au compte en phase 3 |
| SEO | Métadonnées par page, Open Graph, `sitemap.xml`, `robots.txt` (**indexation bloquée tant que le site est en démo**) |
| Données de démo | `apps/web/lib/data/demo.ts`, toutes marquées `isDemo: true`, bandeau « Version de démonstration » sur tout le site. Les dates sont recalculées automatiquement pour toujours être à venir |

**Vérifications effectuées :** TypeScript sans erreur, ESLint sans erreur, compilation de production réussie (66 pages générées), 10 tests unitaires du module partagé, contrôle de toutes les routes (200 / 404 attendus), captures Playwright sur ordinateur et iPhone (FR et AR) sans erreur JavaScript ni débordement horizontal.

Captures : [`captures/`](captures/)

### Limites connues de l'étape 2a

- **Photos** : extraites de la maquette (basse définition, retouchées). Les réseaux de banques d'images sont bloqués dans l'environnement de développement. À remplacer par de vraies photos des lieux partenaires.
- **Adresse e-mail de contact** `contact@thecommunity.ma` : hypothèse, le domaine n'est pas encore réservé.
- Le lien « Mot de passe oublié » est un simple texte jusqu'à la phase 3.
- `cacheComponents` de Next.js 16 est désactivé : modèle classique pages statiques + revalidation (ISR), plus simple avec la bibliothèque de traduction. À réévaluer en phase 3.

## Étape 2b — Espace membre ✅

| Livré | Détail |
|---|---|
| Questionnaire `/bienvenue` | 4 écrans (vous · langues et passions · envies · photo et présentation), barre de progression, validation à chaque étape avec les **schémas Zod partagés** (`packages/shared/src/profile.ts`, réutilisés côté serveur en phase 3) : 18 ans minimum, téléphone valide, 1 langue et 3 centres d'intérêt minimum. Genre facultatif (D5). **Brouillon enregistré sur l'appareil** : on reprend là où on s'était arrêté. Mode édition (`?edition=1`) pré-rempli depuis le profil |
| Tableau de bord `/espace` | Prochaine expérience avec compte à rebours, statut du groupe (« révélé la veille »), autres réservations, avis à donner, recommandations selon les centres d'intérêt |
| Mes réservations | Onglets à venir / passées / annulées |
| Détail d'une réservation | Statut, date, lieu (ou « révélé la veille »), **ajout à l'agenda (.ics) fonctionnel**, groupe révélé (prénoms + centres d'intérêt uniquement), reçu, montant remboursable calculé avec la politique 48 h, avis |
| Profil | Lecture du profil, rappel de ce que voient les autres participants, bouton « Modifier » vers le questionnaire |
| Préférences | Notifications (enregistrées sur l'appareil en démo), langue, **export de mes données en JSON fonctionnel** (loi 09-08) |
| Notifications | Liste, non lues, « tout marquer comme lu » |
| Historique | Expériences vécues, avis publiés ou à donner, **favoris** (ceux ajoutés avec le cœur) |
| Navigation | Menu de l'espace (latéral sur ordinateur, défilant sur mobile), barre d'onglets mobile reliée à l'espace |

**Vérifications effectuées :** TypeScript et ESLint sans erreur, compilation réussie (80 pages), **17 tests unitaires** (dont 7 sur la validation du profil), **26 vérifications de bout en bout** dans un navigateur mobile (`tests/e2e/espace-membre.e2e.cjs`) : validations du questionnaire, refus des moins de 18 ans, reprise du brouillon, favoris, notifications, fichier agenda, groupe sans données de contact, export JSON, préférences, version arabe. Aucune page ne déborde horizontalement (22 pages contrôlées). Un bug de mise en page mobile a été trouvé par ces tests et corrigé.

### Limites connues de l'étape 2b (levées en phase 3 ou 4)

- L'espace affiche toujours le **membre fictif « Salma »** ; il n'est pas encore protégé par la connexion.
- Les réponses du questionnaire, les préférences et les favoris restent **sur l'appareil** ; l'envoi de la photo n'est pas actif.
- **Désactivés avec mention explicite** : annuler une réservation, publier un avis (phase 4), supprimer le compte (phase 3).
- « Signaler un comportement » n'est pas encore présent (phase 4, avec les avis).

## Étape 2c — Back-office (à venir)

Dashboard, expériences (liste, création, édition, dates), réservations, participants d'une session, groupes (glisser-déposer), utilisateurs, partenaires, paiements, codes promo, statistiques, paramètres.

## Lancer le site en local

```bash
npm install
npm run dev          # http://localhost:3000
npm run test         # tests unitaires
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run build        # compilation de production
```
