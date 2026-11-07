# 05 — Pages, parcours et design

> Phase 1 · Document d'architecture · Statut : **en attente de validation**

## 1. Structure des URLs

- Français par défaut sans préfixe : `/casablanca`
- Arabe : `/ar/casablanca` (mise en page RTL)
- Anglais (plus tard) : `/en/casablanca`
- Back-office : `/admin/...` (non indexé, en français)
- Les slugs restent identiques entre langues pour simplifier (balises `hreflang` entre versions)

## 2. Pages publiques (indexables)

| # | Page | Route | Rendu | Contenu clé |
|---|---|---|---|---|
| 1 | Accueil | `/` | ISR | Hero « Moins de scroll. Plus de rencontres. », sélecteur de ville, catégories, « Cette semaine à {ville} », comment ça marche (3 étapes), réassurance, avis, newsletter |
| 2 | Découvrir | `/experiences` | ISR + filtres client | Grille de cartes, filtres ville / catégorie / date (aujourd'hui, ce week-end, cette semaine) / prix / seul ou accompagné |
| 3a | Page ville | `/casablanca` | ISR | « Expériences à Casablanca », sessions à venir par catégorie, quartiers |
| 3b | Page catégorie | `/casablanca/eat` | ISR | « Dîners & gastronomie à Casablanca », texte SEO éditable |
| 3c | Page thématique | `/casablanca/t/diners-entre-inconnus` | ISR | Pages SEO ciblées par tag : pilates, escape games, brunch, ramadan… |
| 4 | Fiche expérience | `/experiences/diner-entre-inconnus-casablanca` | ISR + places en temps réel | Galerie, badge, description, dates disponibles (places restantes), prix, mode (seul / groupe de 6), lieu (ou « révélé la veille »), inclus, infos pratiques, conditions d'annulation, avis, CTA « Réserver ma place » fixe en bas sur mobile, données structurées `Event` |
| 5 | Comment ça marche | `/comment-ca-marche` | Statique | Étapes, formats, sécurité, FAQ courte |
| 6 | À propos | `/a-propos` | Statique | Mission, équipe, valeurs |
| 7 | FAQ | `/faq` | Statique (contenu en base plus tard) | Données structurées `FAQPage` |
| 8 | Contact | `/contact` | Statique + formulaire | Écrit dans `contactMessages` (App Check) |
| 9 | CGU / CGV | `/cgu`, `/cgv` | Statique | Versionnées (date de version enregistrée dans le consentement) |
| 10 | Confidentialité | `/confidentialite`, `/cookies` | Statique | Loi 09-08 |
| + | Charte de bonne conduite | `/charte` | Statique | Acceptée à l'inscription |
| + | Devenir partenaire | `/partenaires` | Statique + formulaire | Acquisition de lieux (B2B) |

## 3. Pages utilisateur (non indexées)

| # | Page | Route | Notes |
|---|---|---|---|
| 1 | Inscription | `/inscription` | E-mail, mot de passe, prénom ; acceptation CGU + charte ; e-mail de vérification envoyé |
| 2 | Connexion | `/connexion` | + `/mot-de-passe-oublie`, `/verifier-email` |
| 3 | Questionnaire | `/bienvenue` | 4 écrans max, barre de progression : (1) identité & ville, (2) langues & centres d'intérêt (puces), (3) envies sociales, (4) photo + bio facultatives. Reprise possible plus tard |
| 4 | Tableau de bord | `/espace` | Prochaine expérience (compte à rebours, groupe révélé), recommandations selon intérêts, avis à donner |
| 5 | Mes réservations | `/espace/reservations` | À venir / passées / annulées |
| 6 | Détail réservation | `/espace/reservations/[id]` | Statut, lieu, groupe (si révélé), reçu, bouton annuler (avec montant remboursé affiché avant confirmation), ajouter au calendrier |
| 7 | Mon profil | `/espace/profil` | Modification à tout moment |
| 8 | Préférences | `/espace/preferences` | Intérêts, notifications, langue, consentements, « Mes données » (export, suppression) |
| 9 | Notifications | `/espace/notifications` | Liste en temps réel |
| 10 | Historique | `/espace/historique` | Expériences vécues, avis laissés, favoris |

**Tunnel de réservation** : `/reserver/[sessionId]` (récapitulatif, places, code promo, total calculé par le serveur, CTA payer) → page du prestataire → `/reserver/retour?r=[reservationId]` qui **écoute le statut en temps réel** et affiche « Paiement en cours de confirmation » jusqu'à ce que le webhook confirme.

## 4. Pages administrateur

| # | Page | Route | Fonctions principales |
|---|---|---|---|
| 1 | Dashboard | `/admin` | KPI du jour/semaine : réservations, CA, remplissage, prochaines sessions, alertes (paiements bloqués, sessions sous le minimum) |
| 2 | Expériences | `/admin/experiences` | Liste filtrable, statut, dupliquer |
| 3 | Création / édition | `/admin/experiences/nouvelle`, `/admin/experiences/[id]` | Formulaire en sections : infos, médias (glisser-déposer), lieu, mode de réservation, prix & économie (coût, commission), conditions, SEO, **ajout de dates** (unique ou récurrente) |
| 4 | Réservations | `/admin/reservations` | Recherche, filtres statut/ville/date, annuler, rembourser, déplacer vers une autre date |
| 5 | Participants d'une session | `/admin/sessions/[id]` | Liste en temps réel, places, liste d'attente, check-in, export CSV/Excel |
| 6 | Groupes | `/admin/sessions/[id]/groupes` | Générer une proposition, glisser-déposer entre groupes, fusionner/diviser, scores et alertes, valider, révéler |
| 7 | Utilisateurs | `/admin/utilisateurs` | Recherche, fiche, historique, suspendre, rôle (superadmin) |
| 8 | Partenaires | `/admin/partenaires` | Fiche, commission par défaut, expériences liées |
| 9 | Paiements | `/admin/paiements` | Transactions, remboursements, réconciliation |
| 10 | Codes promo | `/admin/promos` | Création, suivi des utilisations |
| 11 | Statistiques | `/admin/statistiques` | CA brut, commissions, coûts, marge, réservations, remplissage, par ville / catégorie / période |
| 12 | Paramètres | `/admin/parametres` | Villes, catégories, politiques d'annulation, durée de blocage, frais, journal d'audit |

Le back-office suit une interface sobre et dense (tableaux, filtres) mais reprend la typographie et les couleurs de la marque.

## 5. Design system (issu de la maquette)

**Couleurs (tokens Tailwind, valeurs indicatives à affiner) :**

| Token | Valeur | Usage |
|---|---|---|
| `cream` | `#F8EFE8` | Fond principal |
| `sand` | `#EEDFD3` | Surfaces secondaires, bandeaux |
| `plum-900` | `#5A1A2A` | Marque, titres, CTA |
| `plum-700` | `#7A2A3C` | Survol, liens |
| `ink` | `#2A1D1F` | Texte principal (noir doux) |
| `muted` | `#7B6A66` | Texte secondaire |
| Accents catégories | `eat` terracotta, `move` sauge, `play` ambre, `create` argile rosée, `discover` bleu nuit | Badges et puces, avec parcimonie |

**Typographie :** titres en serif éditorial à fort contraste (proposition Google Fonts : *Fraunces* ou *Playfair Display*), texte en sans-serif lisible (*Inter* ou *DM Sans*). Arabe : *IBM Plex Sans Arabic* (texte) et *Noto Naskh Arabic* ou *Amiri* (titres). Polices chargées via `next/font` (pas de requêtes externes).

**Composants clés :** carte d'expérience, puce de catégorie, sélecteur de ville, barre de CTA collante, compteur de places (« plus que 3 places »), stepper du questionnaire, barre d'onglets mobile (Explorer, Réservations, Notifications, Profil), bottom sheet de filtres, toasts, états vides illustrés, squelettes de chargement.

**Principes :** mobile-first (conçu à 375 px puis élargi), grandes photos (`next/image`, WebP/AVIF), animations discrètes (fondu, légère translation, respect de `prefers-reduced-motion`), contrastes conformes WCAG AA, cibles tactiles ≥ 44 px, aucun bouton sans action.

## 6. SEO

- Métadonnées dynamiques par page (`generateMetadata`), Open Graph et Twitter cards avec l'image de couverture.
- `sitemap.xml` dynamique (villes, catégories, pages thématiques, expériences publiées) et `robots.txt` (exclut `/admin`, `/espace`, `/reserver`).
- Données structurées : `Organization`, `Event` (sessions avec `offers`, `location`, `eventStatus`), `BreadcrumbList`, `FAQPage`, `AggregateRating`.
- URL canoniques, `hreflang` fr/ar.
- Performance : objectif Lighthouse mobile ≥ 90, LCP < 2,5 s.
