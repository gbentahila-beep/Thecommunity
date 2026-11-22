# 22 — Les Babs (22 novembre 2026)

Petits personnages de Wenzy. Ils rendent le site plus chaleureux et remplissent les états vides : un écran vide n'est jamais une impasse.

## Le dessin

- **Forme** : une arche simple (demi-cercle, côtés droits, coins bas arrondis), deux petits pieds ronds, une étincelle aux couleurs de la marque au-dessus de la tête.
- **Visage** sur le corps : yeux sombres avec un reflet, sourcils selon l'humeur, joues roses. Pas de bras.
- **Volume** : léger dégradé, reflet blanc en haut à gauche, ombre douce à droite, ombre au sol.
- **Style international** (décision du 22 novembre) : pas de motif marocain (zellige, babouches, arc outrepassé, thé). Aucun texte dans les dessins : rien à traduire.

## Les sept Babs

| Bab | Univers | Couleur | Accessoire |
|---|---|---|---|
| **Wen** | Rencontres (mascotte principale) | dégradé corail → violet | aucun |
| **Toast** | Dîners | `#E2553A` | nœud papillon |
| **Sprint** | Sport & bien-être | `#2F8A5A` | bandeau |
| **Pixel** | Jeux | `#C07A14` | chapeau de fête |
| **Doodle** | Ateliers | `#B04A9A` | béret et taches de peinture |
| **Scout** | Sorties | `#4650C8` | lunettes de soleil sur la tête |
| **Memo** | Culture & apprentissage | `#1F7F8C` | lunettes rondes |

Une catégorie créée plus tard prend Wen (`babForCategory`).

**Humeurs** : content, ravi, fête, complice, surpris, endormi, perdu, gardien, patient.

## Dans le code

- `apps/web/components/brand/bab-art.ts` : le dessin (texte SVG généré, sans dépendance), les Babs, les humeurs et les objets des états vides (calendrier, carnet, cloche, facture, cœurs, carte, loupe, étoiles, bulle, panneau, billet, stylo).
- `apps/web/components/brand/bab.tsx` : `<Bab name mood prop jump tilt />`. Dessin statique (aucun JavaScript côté navigateur), décoratif par défaut (ignoré par les lecteurs d'écran), utilisable en composant serveur ou client.
- `apps/web/components/empty-state.tsx` : `<EmptyState>` en trois variantes : `card` (carte), `plain` (sans fond), `compact` (une ligne avec un petit Bab). Titre court, texte, action pour repartir.
- Textes : groupe `emptyStates` dans `messages/fr.json`, `en.json` et `ar.json`. Les textes existants restent utilisés comme sous-titres (certains sont vérifiés par les tests de bout en bout). **Arabe à faire relire.**

## Où ils apparaissent

**États vides** : espace membre sans sortie à venir, historique, favoris, notifications, factures, mes rencontres, onglets de réservations, catalogue (recherche ou filtres sans résultat), avis (aucun avis, aucun avis pour ces filtres), blog et centre d'aide (recherche sans résultat), « Cette semaine » vide sur l'accueil, organisateur sans date, page introuvable (dans la langue du visiteur et page de secours).

**Petites touches** (sans refaire les pages) :
- Accueil : un petit Bab à côté de « Comment ça marche », « Bientôt dans d'autres villes » et « Questions fréquentes ».
- Fiche d'expérience : le Bab de l'univers se penche au-dessus du panneau de réservation.
- Historique : un Bab près de « Expériences vécues » et le Bab de l'univers au coin de chaque vignette.

## Règles

- Un ou deux Babs par écran au plus. Les photos restent prioritaires.
- Le Bab ne montre jamais qui a réservé : avant la rencontre, on ne voit ni prénom ni photo des autres participants (le groupe est révélé la veille).
- Une version finale par un illustrateur reste possible : il suffit de remplacer le dessin dans `bab-art.ts`, le reste du site ne change pas.
