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

## Étape 2b — Espace utilisateur (à venir)

Questionnaire de profil en 4 écrans, tableau de bord, mes réservations, détail d'une réservation, profil, préférences et « Mes données », notifications, historique. Toujours avec des données de démonstration.

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
