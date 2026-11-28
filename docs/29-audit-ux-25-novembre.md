# 29 — Audit UI/UX du 25 novembre 2026

Audit complet du site public (21 pages, mobile 390 px et ordinateur 1440 px), comparé à Timeleft et Socials by Detor (38 captures envoyées par Hamza). L'audit détaillé, avec captures, plan en phases et questions, est une page Artifact privée (lien dans la conversation du 25/11).

## Décisions de Hamza (25 novembre)

| Question | Décision |
| --- | --- |
| Accroche « Your people are out there. » | **On la garde** en anglais. |
| Mascottes (Babs) | **On les garde.** |
| Alignement des titres | « Comme les sites pro » : titres de contenu (listes, questions, pages de texte) **alignés à gauche** ; grandes phrases d'accroche, avis et appel final **centrés** (c'est ce que font Timeleft et Socials). À appliquer en phase 1. |
| Photos | **Changées plus tard** (pas de shooting pour l'instant). |
| Application | **Pas encore dans les stores** : annoncée « bientôt sur l'App Store et Google Play », sans lien. |
| Point médian (seul·e, prévenu·e…) | **Supprimé** : phrases reformulées (« en solo », « nous vous prévenons », « Premiers pas »…). |

Les autres questions de l'audit restent ouvertes ; en attendant, on suit les recommandations de l'audit.

## Phase 0 — fait le 25 novembre

- **Pied de page** : les informations légales ne s'affichent que si elles sont renseignées (plus aucun « à compléter » visible) ; sur mobile, liens sur deux colonnes (≈ 1 500 → 1 200 px).
- **Point médian** retiré de tous les textes visibles en français : site (`messages/fr.json`), blog, aide, pages légales, e-mails et notifications (`functions/src`).
- **Accueil** : bloc « Travaillons ensemble » retiré (il reste dans le pied de page, le centre d'aide et les pages dédiées) ; machine à écrire supprimée ; bloc application déplacé juste avant les questions, avec « Bientôt » sur l'App Store et Google Play.
- **Badges des cartes** : une seule apparence (encre), corail seulement pour « Dernières places ».
- **Étoiles** : même violet partout (la page Avis était en jaune).
- **Démo** : « Dîner entre inconnus » passe au mercredi (comme l'accueil) et « inclus » ne promet plus un menu payé.

Laissé en l'état : la double navigation mobile (☰ en haut + barre du bas), que Socials utilise aussi ; les « à compléter » dans le texte des CGU et de la confidentialité (phase 4, pages de confiance).

## Étape 1 — titres et espacements (25 novembre)

Réponses de Hamza : écart fixe entre les blocs (oui), fonds alternés crème / blanc (oui), serif pour les grands titres seulement (oui), largeur unique de 1 200 px (oui).

- **Échelle de titres** (`globals.css`) : `page-title` 38 / 56 px, `section-title` 30 / 40 px en serif ; `card-title` passe en Inter 18 / 20 px. Les titres n'imposent plus le centrage : ils suivent leur bloc.
- **Alignement** : titres et introductions à gauche (accueil, Comment ça marche, À propos, fiche, Avis, Presse, pages de texte, aide, blog, connexion) ; centrés seulement pour les avis, l'application, la phrase de clôture, les encadrés d'action et la fiche organisateur.
- **Rythme** : classe `section` (72 px téléphone / 120 px ordinateur), `section-white` et `section-night`, `section-head` (24 / 40 px sous un titre).
- **Largeurs** : `container-page` 1 200 px (utilisé par `PageShell`), `container-text` 680 px.
- **Composants** : `Section` (fond + espace + largeur) et `SectionHeading` (sur-titre, titre, intro, « Voir tout » à droite).
- **Accueil** : chaque bloc est une section, fonds blanc et crème en alternance ; FAQ sur deux colonnes sur ordinateur ; univers, liste et « Comment ça marche » sur toute la largeur.

## Étape 1 bis — même mise en page sur toutes les pages (25 novembre)

Remarque de Hamza : l'étape 1 n'avait vraiment changé que l'accueil. Étape 1 bis : le même cadre partout, sans toucher aux textes.

- **`PageHeader`** (bande d'en-tête : sur-titre, titre, intro à gauche) et classe `page-header` (48 / 80 px en haut).
- **Pages de texte** (`StaticPage` : FAQ, Contact, Devenir partenaire, Devenir organisateur, toutes les pages légales) : en-tête crème, contenu sur fond blanc dans une colonne alignée sur le titre.
- **Comment ça marche** et **À propos** : découpés en sections pleine largeur, fonds crème et blanc en alternance.
- **Pass, Avis, Blog (accueil, thèmes, articles), Presse, article d'aide** : même espace en haut et en bas, titres et colonnes alignés à gauche.
- **Centre d'aide** : bandeau lilas remplacé par la bande blanche commune.
- **Découvrir et pages univers** : titre à gauche, ville et filtres à droite, onglets et calendrier alignés sur le titre.
- **Encadrés** : plus de fond beige ni lilas (`info-box`, appels du blog, de la presse, des avis) : blanc avec un filet fin.
- Le pied de page touche la dernière section (plus de bande vide entre les deux).

Pas touché dans cette étape : la fiche d'un rendez-vous et la connexion (mise en page déjà spécifique, revues aux étapes 4 et 8), l'espace membre.

Les captures locales utilisent d'anciennes données de démonstration ; les contrôles se font sur le site d'essai, avec les vrais rendez-vous.

## Règle d'alignement (25 novembre, validée par Hamza)

Plus de mélange sur une même page :
- **Pages vitrine, titres centrés** : accueil, Comment ça marche, À propos, Pass, Avis. Introduction de 2 lignes au plus sous un titre centré ; « Voir tout » sous la liste.
- **Pages de contenu, tout à gauche** : Découvrir, fiche, FAQ et aide, blog, pages légales, espace membre.
- Exceptions : un bloc « photo + texte » côte à côte garde son texte à gauche (accroche et histoire d'À propos) ; les titres à l'intérieur des cartes suivent la carte.

## Étape 2 — une seule carte « rendez-vous » (25 novembre)

Réponses de Hamza : carte entière cliquable sans bouton (oui) ; deux badges seulement (oui) ; lignes sur mobile sans texte coupé (oui) ; illustrations gardées jusqu'aux nouvelles photos (oui).

- **`EventCard`** (`components/event-card.tsx`) : une seule carte pour l'accueil, Découvrir, l'espace membre, « Dans le même esprit » et la page organisateur (`CompactRow` et `ExperienceRow` l'appellent).
- **Plus de bouton** « Réserver / Demander / Liste d'attente » : toute la carte ouvre la fiche ; à la place, l'état des places : « 7 places libres », « Plus que 3 places » (corail), « Sur demande », « Complet · liste d'attente » (carte grisée, photo en noir et blanc).
- **Repères** : « Nouveau » (moins de 30 jours ou choisi dans le back-office) et « Dernières places » seulement. Coup de cœur, Populaire et Édition spéciale ne s'affichent plus sur les cartes ; ils servent toujours aux sections de l'accueil.
- **Téléphone** : vignette de 72 px, repère au-dessus du titre (plus d'étiquette qui déborde sur le texte), titre sur deux lignes, heure, quartier · taille du groupe, public et gamme, puis l'état des places : plus aucun texte coupé.
- **Ordinateur** (grille dès 3 rendez-vous) : repère sur la photo, état des places aligné en bas de chaque carte.

## Étape 3 — accueil : ordre des blocs et textes (25 novembre)

Réponses de Hamza : ordre validé, réglé par l'équipe dans le back-office ; accroche reformulée autour des trois formats (Tables : dîner, café, brunch, parfois déjeuner ; une Activité par semaine, parfois des dates en plus ; un Événement de temps en temps) ; prochaine date dans l'accroche (oui) ; manifeste validé ; prix : toujours 35 DH en ligne, le reste sur place (prix annoncé avec le lieu, ou fourchette selon la gamme), sans parler de « repas ».

- **Nouveaux blocs réglables** (back-office → Accueil) : « Phrase manifeste » (avec les Babs), « Combien ça coûte », « Application ». Le bloc « trust » devient la **bande sombre Sécurité**.
- **Ordre par défaut** : manifeste, Comment ça marche, Votre semaine, univers, avis, sécurité, prix, application, questions, puis la phrase de clôture (toujours en dernier). « Votre semaine » n'est plus imposée juste sous l'accroche : tout suit l'ordre du back-office.
- **Réglages déjà enregistrés** : une section nouvelle se place seule à un endroit sensé (manifeste en tête, prix et application avant les questions) ; l'équipe ajuste ensuite l'ordre dans le back-office.
- **Accroche** : nouveau texte, bouton « Voir les dates », carte « Prochain rendez-vous » (la date la plus proche qui a encore de la place, places libres), mise à jour toute seule.
- **Prix** : « Sur Wenzy, en ligne : 35 DH » et « Sur place : votre addition » (ou le prix de l'activité, annoncé ou en fourchette selon la gamme) ; lien vers le Pass. Même formulation dans « Comment ça marche ».
- Fonds : blanc et crème en alternance, la sécurité en bande encre.

## Étape 4 — fiche d'un rendez-vous et Découvrir (25 novembre)

Réponses de Hamza : bandeau « DÉMO » retiré ; haut de fiche « de manière pro », pas en billet ; bloc « Comment ça se passe » (oui) ; barre mobile prix · places · un bouton (oui) ; lien vers tous les avis (oui).

- **Bandeau « DÉMO »** retiré du site d'essai (`NEXT_PUBLIC_DEMO_BANNER=false`). Le site d'essai reste **non indexé** par les moteurs de recherche grâce à une variable séparée (`NEXT_PUBLIC_NOINDEX=true`, lue par `robots.ts`).
- **En-tête de la fiche** : format en sur-titre (plus de pastille), titre et note alignés à gauche, note cliquable vers les avis.
- **L'essentiel** : plus d'encadré ; grille aérée sous un filet, une icône dans un rond par information (date, lieu, groupe, gamme ou niveau, langues, public).
- **« Comment ça se passe »** : trois moments (vous réservez, la veille / la veille 21h30 si le lieu est secret, le jour J), textes adaptés au rendez-vous (sur demande, lieu secret, groupe composé), lien vers le déroulé complet.
- **Sections** séparées par un filet fin, titres en Inter.
- **Avis** : les 3 derniers sur la fiche, puis « Voir les N avis » vers la page Avis filtrée sur ce rendez-vous (`/avis?rdv=<slug>`, filtre effaçable).
- **Barre mobile** : prix, date, places libres (corail sous 4), un seul bouton.
- **Découvrir** : déjà traité aux étapes 1 bis et 2 (titre et filtres, carte unique).

## Étape 6 — pages secondaires, et retouches de la fiche (25 novembre)

L'étape 5 (une page par rendez-vous fixe) est laissée de côté : la fiche d'un rendez-vous de la semaine joue déjà ce rôle.

Réponses de Hamza : cartes inclinées retirées (oui) ; photos de l'équipe : plus tard ; carrousel « Nos outils » retiré (oui) ; nom de la page : « Abonnement » ; blog en une seule grille (oui). Remarques : la frise de la fiche annonçait l'adresse « la veille » même quand elle est déjà connue ; la fiche était trop longue et manquait de style.

- **Fiche** : adresse déjà connue → « La veille : un rappel avec l'heure, l'adresse et l'itinéraire » (le « dévoilement » reste pour les lieux secrets) ; sur téléphone, le choix des dates remonte juste sous l'essentiel ; l'essentiel dans une carte, sur deux colonnes (trois sur ordinateur) ; « Comment ça se passe » en trois cartes, le moment en grand ; « Inclus » en liste cochée ; « Bon à savoir » sur deux colonnes, icônes dans des ronds.
- **Comment ça marche** (composant de l'accueil et de la page) : cartes droites, plus d'inclinaison ni de photos penchées, numéros lisibles.
- **Page Comment ça marche** : la frise est l'élément principal, le moment en grand à gauche (Aujourd'hui, Jusqu'à la veille 20h30, La veille 21h30…), le détail à droite ; premier texte raccourci.
- **À propos** : plus de carrousel « Nos outils ».
- **Abonnement** : la page et l'onglet de l'espace membre s'appellent « Abonnement » (les produits restent le Pass et le Carnet).
- **Blog** : plus de « Les plus lus » en double ; une seule grille « Tous les articles » avec image, tri et recherche ; lignes compactes sur téléphone.

## Étape 7 — direction artistique (demandée le 28 novembre, à valider avant tout code)

Demande de Hamza : faire évoluer Wenzy vers un design plus premium, moderne et immédiatement identifiable, en gardant le côté chaleureux et convivial. Wenzy doit donner envie de sortir et de rencontrer des gens, pas ressembler à une application de réservation classique.

Règles :
- La maquette de référence envoyée par Hamza est une **direction visuelle** : pas une source de textes, de données, de polices ni d'espacements. On garde les vrais textes, les fonctionnalités, les liens, les règles de réservation et les réglages déjà validés (échelle de titres, espacements, largeurs, alignements, carte unique).
- Là où il manque une photo, on utilise les photos déjà en stock ; elles seront remplacées plus tard.
- **Propositions en images d'abord** (mobile et ordinateur), validées par Hamza avant toute modification du site.
- Tout le site reste **homogène** : une même direction appliquée à toutes les pages, pas seulement à l'accueil.

Déroulé prévu :
1. Recevoir la maquette de référence ; en tirer les principes (ambiance, place de la photo, couleurs, formes, mouvement), sans copier.
2. Proposer 2 ou 3 pistes en écrans (accueil, carte rendez-vous, fiche ; mobile et ordinateur).
3. Après validation : décliner la piste retenue sur tous les écrans, puis l'appliquer au site par étapes, chacune poussée et vérifiée en ligne.

### Décisions du 28 novembre

- **Piste A « Soleil de Casa »** retenue (piste B « Ciel de 19 h » écartée).
- **Rien n'est retiré ni réécrit** : seul le style change ; toutes les sections, textes, liens et règles restent ceux du site.
- **Photo du haut** : forme libre partant du coin haut droit, derrière le menu ; **photo du bas** : bandeau arrondi d'où la photo de groupe (mosquée Hassan II) dépasse en haut à droite, sur la phrase de clôture.
- **Pied de page** : Instagram seul pour l'instant (identifiant à venir), signature manuscrite « Your people are out there. ».
- Écrans de la piste A (accueil, Découvrir, fiche ; ordinateur et téléphone) présentés le 28/11 ; application au site après validation.

### Étape 7a — briques communes et accueil (28 novembre)

- **Briques** : police manuscrite Caveat (`font-hand`), couleurs `peach`, `lilac`, `cream-light`, ronds doux `bub-peach` / `bub-lilac`, numéro d'étape `step-num`, ombre des cartes plus douce et plus profonde, bouton secondaire à contour encre, touches dessinées (`Sparks`, `Swash`) et formes de photo (`PhotoShapes`, `components/brand/doodles.tsx`).
- **Accueil** : photo de l'accroche en forme libre, qui passe derrière le menu sur ordinateur (menu transparent tant qu'on n'a pas fait défiler, `HeaderScrollState`) ; bord ondulé sur téléphone ; texte encre, « are out there. » en dégradé avec un trait dessiné ; carte « Prochain rendez-vous » avec rond pêche.
- **Comment ça marche** : ronds pastel avec icône, numéros en dégradé, flèches dessinées entre les cartes.
- **Babs** : légende en écriture manuscrite. **Alerte** : rond lilas.
- **Sécurité** : panneau encre arrondi posé sur la section, icônes dans des ronds en dégradé.
- **Prix** : ronds doux ; **application** : halo lilas ; **avis** : photo plus arrondie.
- **Clôture** : bandeau pêche-lilas, la photo de groupe face à la mosquée Hassan II (`groupe-hassan-ii.webp`) dépasse en haut à droite (au-dessus sur téléphone).
- **Carte rendez-vous** : icônes date et lieu, badge en pastille, flèche ronde sur la grille d'ordinateur.
- **Pied de page** : léger dégradé, Instagram (lien à venir), signature « Your people are out there. ».
- Textes, sections et ordre inchangés ; boutons : texte encre sur le dégradé.

### Étape 7b — Découvrir et la fiche (28 novembre)

- **Découvrir** : halos pêche et lilas et traits corail en haut de page ; onglets Tout / Tables / Activités / Événements en pastilles ; calendrier en pastilles (blanc cerclé quand il y a des dates, point en dégradé, encre pour le jour choisi) ; jours en serif.
- **Fiche** : halo lilas en haut, traits corail près des photos, photos plus arrondies ; l'essentiel avec des ronds pêche ; carte de réservation plus arrondie et plus en relief, gamme choisie cerclée de violet ; déroulé en cartes à ombre douce, numéros en dégradé, lilas et pêche ; « Inclus » coché en dégradé ; « Bon à savoir » avec ronds lilas.
- Textes, contenus et règles de réservation inchangés.

### Étape 7c — pages vitrines, lot 1 (28 novembre)

- **En-tête photo commun** (`components/page-hero.tsx`) : le dessin de l'accueil en plus court (forme libre derrière le menu sur ordinateur, bord ondulé sur téléphone, trait sous le titre) ; version courte (`compact`) pour Abonnement et Avis. `PhotoShapes` est posé une fois dans la mise en page.
- **Comment ça marche** : frise reliée par un fil en dégradé, détails en cartes ; sécurité en panneau encre arrondi ; bandeau de clôture.
- **À propos** : « Des amis en repartant. » en dégradé ; photo de l'histoire posée sur un rond pêche ; valeurs et « Pourquoi on fait ça » avec ronds pêche et lilas ; galerie plus arrondie ; le bouton « Voir les dates » sous la galerie est gardé ; bandeau de clôture.
- **Abonnement** : accroche dans l'en-tête photo ; offre choisie surlignée en violet doux, prix en serif ; coches en dégradé ; bandeau de clôture.
- **Avis** : en-tête photo ; barres en dégradé ; filtres en pastilles ; initiales dans les ronds ; bloc final pêche-lilas.
- **Découvrir** : ville et filtres en pastilles blanches.
- **Instagram** : pastille « Suivez-nous sur Instagram » sous le logo du pied de page et dans le Menu du téléphone ; l'identifiant se renseigne dans `lib/site.ts` (`INSTAGRAM_HANDLE`).

### Étape 7c — retouches validées le 28 novembre

- **Bandeau de clôture** : photo de groupe détourée (`groupe-hassan-ii-detoure.webp`, ciel retiré) posée sur le fond pêche-lilas ; sur ordinateur au coin bas droit, fondue sous le texte ; sur téléphone recadrée sur le groupe et la mosquée, le minaret dépasse du bord haut.
- **Formats** (`UniverseGrid`, accueil, Comment ça marche, Mon espace) : cartes photo en hauteur, nom en serif blanc, pastille « N cette semaine » ; fond pêche ou lilas légèrement tourné (« photo emboîtée ») ; défilement horizontal sur téléphone.
- **Photos emboîtées** : réservées aux photos seules (histoire d'À propos, formats, « Pourquoi venir », plus tard blog et aide) ; jamais sur la photo du haut, les cartes rendez-vous, Découvrir, la galerie ni le bandeau. La forme de chaque photo est gardée (pas de carré imposé).

### Étape 7c — lot 2, pages de contenu (validé le 28 novembre)

- **En-têtes** : halos pêche et lilas (`.halo-top`) et traits corail sur `PageHeader` (pages de texte), le blog, l'aide et l'espace membre.
- **Pages légales et Sécurité** (`lib/legal-page.tsx`, `StaticPage` avec `aside`) : sommaire collant à gauche sur ordinateur, repliable (« Sommaire ») sur téléphone ; date de mise à jour en pastille.
- **FAQ** : une carte arrondie par question, flèche dans un rond lilas ; lien vers l'aide en bouton.
- **Contact** : e-mail à gauche (rond pêche), formulaire à droite sur ordinateur.
- **Blog** : « amis demain » en dégradé ; guide mis en avant avec photo emboîtée (fond pêche) ; cartes d'articles plus arrondies ; article : couverture emboîtée (fond lilas), « L'essentiel » et bloc final en bandeau pêche-lilas, intertitres en serif, conseils avec rond pêche.
- **Aide** : rubriques avec ronds pêche et lilas ; « Vous ne trouvez pas votre réponse ? » en bandeau pêche-lilas ; encadrés partenaires et organisateurs en cartes blanches.
- **Espace membre** : carte de profil en bandeau pêche-lilas, rubriques arrondies avec ronds lilas ; réservations plus arrondies, onglets dans une barre blanche.
- **« Découvrez votre table »** (accueil) : une seule photo au lieu des trois bandeaux (à changer plus tard).

### Étape 7d — finitions (validé le 28 novembre)

- **Animation** : à l'apparition, les blocs des sections montent en fondu au rythme du défilement (`.reveal` sur `Section`, CSS lié au défilement) ; rien n'est caché si l'appareil demande moins d'animations ou si le navigateur ne la gère pas.
- **Étincelles** (règle du 28/11) : une seule par page, collée au dernier mot du titre principal (`TitleSparks`) ; jamais sur une photo, dans un coin vide ou dans un panneau.
- **Blog, pages de thème** : halos, articles en cartes, encadré Casablanca en bandeau pêche-lilas, questions en cartes ; la rangée des thèmes défile jusqu'au thème actif sur téléphone.
- **Badges des stores** (accueil) : logo Apple / Google Play et « Bientôt sur », sans lien jusqu'à la publication de l'application.
- **Espace membre** : interrupteurs en dégradé ; ronds lilas (notifications) et pêche (factures).
- **Homogénéité** : Kit presse (halos, boutons alignés sur le texte), Devenir partenaire / organisateur (ronds pêche et lilas), connexion et inscription (halos, photo emboîtée), Menu (halos).

## Suite

Phase 1 (fondations : échelle de titres, espaces, deux largeurs, composants Section et Carte, lexique), puis accueil, Découvrir et fiche, pages secondaires, animations — voir l'audit.
