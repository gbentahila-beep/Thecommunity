# 16 — Plan de refonte UX/UI (retours du 21 novembre 2026)

Source : PDF de 53 pages de captures annotées (comparaison avec Socials), plus la remarque générale :
« le site va un peu dans tous les sens, plusieurs styles existent, ça ne fait pas pro ».

Principe directeur : **un seul style, une seule façon de faire chaque chose**. Chaque page est
construite avec les mêmes briques (titres, boutons, cartes, lignes d'expérience, encadrés, fenêtres).
On enlève avant d'ajouter : moins d'éléments par écran, des actions évidentes.

## Phase 1 — Un seul système de design (base de toutes les autres phases)

Constat : boutons noirs (univers) et prune (ailleurs), dégradés pastel (abonnement), trois rayons
d'angle différents, ombres variées, titres de tailles différentes d'une page à l'autre, cartes
d'expérience en grand format à certains endroits et en ligne ailleurs.

- Couleurs : prune (action), crème (fond), encre (texte), blanc (surfaces). Les couleurs d'univers ne
  servent plus que d'accent (pastille, icône), jamais de fond de bouton.
- Typographie : serif uniquement pour les titres de page et de section ; tout le reste en sans-serif.
  Échelle fixe : titre de page, titre de section, titre de carte, texte, petit texte.
- Formes : cartes 24 px, boutons et pastilles en pilule, une seule ombre « carte » et une ombre « flottante ».
- Briques communes (components/ui) : `Button` (principal, secondaire, discret ; 2 tailles), `SectionHeader`
  (surtitre, titre, sous-titre, lien « Voir tout »), `Card`, `InfoBox` (l'encadré « Vous avez d'autres
  questions ? »), `ListRow`, `Sheet`/`Modal`, `CitySelect`.
- Passage page par page avec captures avant/après (accueil, catalogue, univers, fiche expérience,
  abonnement, avis, aide, compte, menu).

## Phase 2 — Navigation et compte

- Menu burger : suppression de la barre de recherche ; « Questions-réponses » → page FAQ (qui renvoie
  au centre d'aide, déjà le cas).
- Membre connecté, menu burger : carte profil (initiales, prénom, « Votre profil › »), puis Accueil,
  Réservations, Mon groupe ; puis Découvrir, Comment ça marche, Questions-réponses, Avis, Abonnement.
- En-tête : suppression de l'icône personnage à côté de la cloche (le profil passe par le menu).
- Suppression de la barre de pastilles « Tableau de bord · Mes réservations · … » de l'espace membre :
  chaque rubrique a sa propre page ; le tableau de bord devient l'accueil.
- Nouvelle page « Mon profil » (hub) : Mon profil, Préférences, Notifications, Historique, Factures,
  Abonnement, Se déconnecter.
- « Se déconnecter » retiré du bas des pages : uniquement dans « Mon profil » et le menu burger.

## Phase 3 — Accueil visiteur

Ordre : accroche → bouton « Découvrir les expériences » → encadré de confiance juste en dessous
(« Venez seul·e… ») → « Cette semaine à Casablanca ▾ » (le chevron ouvre la liste des villes, les autres
marquées « bientôt ») → pastilles d'univers → liste compacte (lignes avec vignette, comme « Pour vous »)
→ « Voir toutes les expériences » → une seule ligne « 🔔 Soyez prévenu·e des nouvelles tables et
activités » qui ouvre une fenêtre (titre, texte, ville, e-mail, « M'alerter », « Uniquement des e-mails
sur les nouvelles expériences. Arrêt en un clic »).

- Suppression de la pastille ville en haut de page.
- « Comment ça marche », première carte : remplacement du nuage d'icônes (une icône passe à la ligne)
  par une illustration propre, sur l'accueil et sur /comment-ca-marche.
- Fin de page, après « Vous avez d'autres questions ? » : un encadré « Lieux partenaires » (cafés,
  restaurants, studios) et un encadré « Organisateurs », même style ; puis une phrase de clôture avec
  deux boutons (S'inscrire · Voir les expériences).
- Centre d'aide : encadré « Organisateurs » à côté des deux encadrés existants.

## Phase 4 — Accueil du membre connecté (devient le tableau de bord)

« Bonjour Prénom » → un bloc par univers (photo, pastille « petit groupe », phrase, « N cette semaine ›»)
→ « Cette semaine à Casablanca ▾ » → pastilles Tout · Dîners · Sport & bien-être… → une quinzaine
d'expériences en lignes compactes → « Voir tout » → ligne d'alerte. L'ancienne page /espace renvoie ici.

## Phase 5 — Catalogue minimaliste (toutes les pages d'univers)

En-tête : « Découvrir », ville ▾ (liste des villes, « bientôt »), petite icône filtres qui ouvre un
panneau. Suppression de la barre de recherche, du bouton loupe, du nombre d'expériences et de « Trier
par ». Restent : onglets d'univers, calendrier, liste par jour.

## Phase 6 — Inscription en questions, une par écran

- Écran par question : barre de progression « Question x sur N », retour, fermer, « Passer » pour les
  questions facultatives, enregistrement au fil de l'eau, quelques cartes « Le saviez-vous ? » (études
  sourcées) et une carte finale « C'est prêt ».
- Étape d'accord obligatoire : « J'accepte les conditions générales, la politique de confidentialité et
  les règles de la communauté » (liens), plus « Je souhaite recevoir les nouveautés et offres par e-mail
  (facultatif) » ; date et version enregistrées.
- Questions (vouvoiement, « groupe » plutôt que « table ») : prénom et nom ; âge (tranche + année) ;
  genre ; ville (Casablanca, autres « bientôt » avec alerte) ; langues ; centres d'intérêt (3 à 15,
  « Voir plus ») ; pourquoi vous venez ; ambiance de groupe souhaitée ; avec de nouvelles personnes vous
  êtes plutôt (écoute → lance la conversation, 1 à 5) ; ce qui vous fait rire ; ce qui compte pour vous
  (3 au plus) ; fréquence de sport ; type de lieu et budget (en DH) ; alimentation ; secteur d'activité ;
  comment vous nous avez connus ; téléphone + WhatsApp ; Instagram (facultatif) ; photo (facultatif).
- Non repris de l'exemple : situation amoureuse, enfants, religion. Ce sont des données sensibles au
  sens de la loi 09-08, inutiles pour composer un bon groupe, et elles peuvent mettre mal à l'aise.
- Réponses rangées dans « Mon profil » par rubrique, modifiables.
- Algorithme de composition : nouveaux critères souples. Il mélange les bavards et les plus réservés,
  réunit les humours et les ambiances proches, ainsi que les budgets proches pour les dîners et les
  rythmes sportifs proches pour le sport. Il évite deux personnes du même secteur dans un même groupe.
  Il continue de respecter les critères existants (langue commune, âge, équilibre, personnes déjà
  rencontrées). Tests à l'appui.

## Phase 7 — Plus d'hôte ni d'hôtesse ; arrivée autonome

- Suppression du rôle d'hôte partout : fiche hôte du back-office, formulaires, textes (à propos, aide,
  charte, propositions de sortie).
- Arrivée autonome : le jour J, de 30 min avant à 1 h après le début, chaque participant appuie sur
  « Je suis arrivé·e » depuis sa réservation ; il voit alors les prénoms de son groupe et l'indication
  pour se retrouver (le lieu exact, le signe The Host Club sur la table).
- L'organisateur peut indiquer « Une hôtesse vous accueille sur place » (option de la date), affichée sur
  la fiche et dans la réservation.
- Le pointage des billets par l'organisateur (espace pro) est conservé.

## Phase 8 — Vérifications et mise en ligne

Tests unitaires, règles, émulateur, parcours e2e mis à jour ; captures téléphone et ordinateur de chaque
page ; mise en ligne sur le site de test après chaque phase.
