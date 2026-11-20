# 16 — À me fournir (rappels)

> Liste tenue à jour par Claude : tout ce dont le site a besoin et que seule Rita peut donner.
> Je la rappelle régulièrement. Quand une information arrive, je l'intègre et je coche.

## Informations légales et contacts (affichées « à compléter » sur le site)

Utilisées dans le pied de page, les CGU, les CGV et la Politique de confidentialité (`apps/web/lib/legal-info.ts`).

- [ ] **Éditeur** : raison sociale de la société (ex. « The Host Club SARL »)
- [ ] **Adresse du siège**
- [ ] **ICE**
- [ ] **RC** (ville et numéro)
- [ ] **E-mail support** (ex. support@…)
- [ ] **E-mail données personnelles** (ex. privacy@…)
- [ ] **E-mail sécurité** (ex. safety@…)
- [ ] **IF** (identifiant fiscal) et **taux de TVA** à appliquer — à saisir vous-même dans le back-office → Paramètres → Société (super-admin). Tant que la raison sociale, le siège et l'ICE manquent, les documents restent des « reçus » sans valeur de facture.
- [ ] **CNDP** : numéro de récépissé de la déclaration des traitements
- [ ] **CNDP** : numéro d'autorisation (ou de récépissé) pour le transfert des données hors du Maroc (hébergement en Belgique / Pays-Bas)

> ⚠️ Ne pas reprendre les informations d'une autre société (l'exemple Sahbi n'a servi que de modèle de présentation).

## À confirmer

- [x] **Aya Snoussi** : créatrice / fondatrice (confirmé le 8 novembre). Page À propos rédigée.
- [ ] **Aya** : relire et valider son texte sur la page À propos (`/a-propos`). Sa photo est recadrée depuis l'article CULTIQ (votre choix, image 1) : **obtenir l'accord de CULTIQ**, ou envoyer l'original en haute définition.
- [x] **Photo d'accueil** : fournie le 8 novembre. Le minaret visible ressemble à la Koutoubia (Marrakech) : à remplacer plus tard par une photo prise à Casablanca si vous le souhaitez.
- [ ] **Textes de Sahbi** (que vous m'enverrez) : je m'en inspirerai pour Sécurité / CGU / Confidentialité, sans les copier.
- [ ] **Abonnement** : rétractation et remboursement (à définir avec l'avocat) ; prix définitif, puis activer dans le back-office.
- [ ] **Textes juridiques** (CGU, CGV, Confidentialité, Sécurité) : relecture par un avocat. Le site ne l'indique plus (à votre demande) : les pages affichent simplement « Dernière mise à jour : 8 novembre 2026 ». Textes enrichis le 8 novembre en s'inspirant de Sahbi, sans recopier.
- [ ] Points précis à faire valider par l'avocat :
  - **rétractation de l'abonnement** : 7 jours après le paiement, remboursement moins les avantages déjà utilisés (CGV art. 6) ;
  - **annulations tardives / absences répétées** : restriction ou suspension temporaire après avertissement (CGU art. 9) — pas de barème automatique pour l'instant ;
  - **signalements et décisions de modération** conservés 3 ans au plus ;
  - mention d'une possible **vérification d'identité ou d'âge** en cas de doute.
- [ ] **Confidentialité (8h)** : faire valider le tableau des durées (compte 3 ans après la dernière activité, signalements 3 ans, contacts 3 ans, journaux 12 mois, **pièces comptables 10 ans — loi 9-88**), l'effacement du régime / des allergies **30 jours après l'expérience** (à automatiser avant la mise en production), le délai de réponse d'**un mois**, la mention de **Brevo (France)** et compléter le **prestataire de paiement** dès qu'il est choisi.
- [ ] **Galerie À propos (8e)** : s'assurer que les personnes reconnaissables sur les 8 photos fournies sont d'accord pour apparaître sur le site (et la mention « The Brunch Club x Aya Snoussi »). Envoyer d'autres photos quand vous voulez : elles s'ajoutent à la mosaïque.
- [ ] **Traductions arabes** (8 novembre) : faire relire par une personne arabophone les textes juridiques, le centre d'aide et le blog (traduits en arabe standard) ; la version française fait foi pour les textes juridiques. Saisir l'arabe de chaque expérience dans le back-office (titre, accroche, description).
- [ ] **Paiement (docs/19)** : RIB du compte qui recevra les virements (je le demanderai au moment de l'étape) ; ouvrir un compte bancaire professionnel au nom de la société ; faire valider le modèle d'encaissement (part organisation seulement) ; contrats partenaires ; plus tard, contrat ChariPay.
- [ ] **Commission sur la part partenaire** : si une commission doit porter sur ce que le client paie au partenaire sur place, elle doit être facturée au partenaire (nous ne l'encaissons pas) — à confirmer.
- [ ] **Numéro 112** depuis un portable au Maroc : vérifier qu'il aboutit bien aux secours (indiqué sur la page Sécurité, à côté du 19, 177 et 15).
- [ ] **Étapes 8f / 8g / 8h** (Règles de la communauté, CGU, Confidentialité inspirées de Timeleft) : faire valider par l'avocat le **recours sous 7 jours** après une suspension, le **droit à l'image avec accord facultatif**, les **sanctions graduées** (avertissement → exclusion), la **liste des sous-traitants** et les **transferts hors du Maroc** (Google / Brevo) au regard de la CNDP.
- [ ] **Allergies (donnée de santé, loi 09-08)** : faire valider le recueil avec accord explicite et sa durée de conservation (proposition : effacer régime et allergies 30 jours après l'expérience — pas encore automatique).
- [ ] **Codes promo et frais de service** : valider les mentions ajoutées aux CGV (art. 2) avant d'activer des frais.
- [ ] **E-mail sécurité informatique** (ex. security@…) pour le signalement des failles (page Sécurité).
- [ ] **Durées de conservation** proposées (comptes inactifs 3 ans, journaux 12 mois, comptabilité selon la loi).
- [ ] **Délai de traitement des signalements** annoncé : 48 h (page Sécurité).
- [ ] **Centre d'aide** : relire les 23 articles (`/aide`), surtout côté partenaires : les deux modèles de rémunération (achat de prestation ou commission) et ce que vous transmettez aux lieux avant chaque date.
- [ ] **Candidatures partenaires** : qui les traite et sous quel délai (elles arrivent dans le back-office → Partenaires).

## Plus tard

- [ ] **Vraies photos** des lieux et des expériences (droits d'utilisation + accord des personnes reconnaissables).
- [ ] **Compte Brevo** (envoi des e-mails : confirmations, factures, rappels) + domaine d'envoi vérifié. La clé se range comme secret Cloud `BREVO_API_KEY` — ne me l'envoyez jamais dans le chat.
- [ ] **Notifications push** (étape 7) : générer la clé « Web Push » dans la console Firebase (Paramètres du projet → Cloud Messaging → Certificats Web Push) et me dire quand c'est fait ; je branche ensuite l'autorisation et l'envoi.
- [ ] **Expert-comptable** : valider le modèle de facture (mentions, TVA des places et de l'abonnement, conservation).
- [ ] **Contrat de paiement** et accès de test du prestataire (CMI, Payzone, YouCan Pay).
- [ ] **Domaine** définitif et adresses e-mail.
- [ ] **Traduction arabe** des textes juridiques et des articles du centre d'aide (la version française s'affiche en attendant).
- [ ] **Traduction anglaise des fiches d'expériences** (titre, description) dans le back-office : sinon la version anglaise du site les affiche en français.

## Rappel CNDP (loi 09-08)

Les traitements « ordinaires » demandent une **déclaration préalable** à la CNDP, certains traitements une **autorisation**, et les **transferts hors du Maroc** sont encadrés. La CNDP précise qu'un traitement **ne peut pas être mis en œuvre avant réception du récépissé** ou de l'autorisation.
Conséquence pratique : le site d'essai reste réservé à des **testeurs** (données de test) ; **pas d'ouverture au public ni de collecte de vraies données clients avant les récépissés** (checklist, section D).

## Kit presse (8 novembre)
- [ ] **Adresse e-mail presse** (ex. presse@…) : pour l'instant, la page renvoie vers le formulaire de contact.
- [ ] **Photos** : confirmer que The Host Club détient les droits des photos du site ; pour la presse, n'envoyer des photos où des participants sont reconnaissables qu'avec leur accord. Le kit ne propose que 2 photos sans visage.
- [ ] **Portrait d'Aya** en haute définition (sans la photo CULTIQ tant que l'accord n'est pas obtenu).

## Sécurité et sauvegardes (étapes D et E, 8 novembre)
- [ ] **Clé reCAPTCHA Enterprise pour App Check** : console Firebase → App Check → application web → reCAPTCHA Enterprise → créer la clé (domaine du site). Me donner la **clé du site** (publique, ce n'est pas un secret) : je l'ajoute au site, puis j'active l'obligation sur les formulaires publics.
- [ ] **Droits de la sauvegarde nocturne** : console Google Cloud → IAM → compte de service des fonctions (« Compute Engine default service account ») → ajouter les rôles **« Administrateur import/export Cloud Datastore »** et **« Administrateur des objets Storage »**. Sans eux, la carte « Santé du site » affiche « échec » et les super-admins reçoivent une alerte. (Je ne modifie pas les droits moi-même sans votre accord.)
- [ ] **Alerte de budget** : console Google Cloud → Facturation → Budgets et alertes (ex. 20 € par mois, alerte à 50 %, 90 %, 100 %).
- [ ] **E-mail des super-admins** : vérifier que l'adresse de votre compte super-admin est la bonne (les alertes de santé y arrivent ; boîte d'envoi tant que Brevo n'est pas branché).

## Toutes les activités (étape 18, 19 novembre)

- **Conditions de participation aux activités physiques** (`/conditions-activites-physiques`, FR / EN / AR) : projet rédigé par nous, sans reprendre le texte d'une autre société. À faire relire par un avocat quand Rita le souhaite (notamment : partage des responsabilités, assurance conseillée, durée de conservation de la preuve d'accord, 5 ans proposés). Toute nouvelle version = changer `PHYSICAL_TERMS_VERSION` (packages/shared/src/activity.ts).
- **CGV, CGU, charte, confidentialité, sécurité** complétées le 19 novembre (âge minimum, activités physiques, questionnaire, plein air, membres de confiance) : à inclure dans la relecture de l'avocat.
- **Assurance des lieux** : pour chaque lieu qui accueille une activité physique, demander l'attestation de responsabilité civile et la date de fin, puis la saisir dans Partenaires → la fiche → « Assurance du lieu ». Une alerte apparaît sur le tableau de bord tant qu'elle manque.
- **Photos** : de vraies photos de padel et de paintball (avec l'accord écrit des personnes reconnaissables). Le site utilise en attendant deux illustrations sans personnes (`public/images/illustrations/`).
- **Membres de confiance** : décider plus tard d'une éventuelle contrepartie pour les membres qui proposent et accueillent des sorties (aujourd'hui : aucune, écrit dans les CGU).


## Marketplace : organisateurs et encaissement pour leur compte (étapes 19 à 24, 20 novembre)

- [ ] **Contrat CMI (ou autre prestataire)** : vérifier que le contrat autorise **l'encaissement pour le compte de tiers** (les organisateurs, modèles A « tout en ligne » et B « acompte »). Sans cette autorisation, seul le modèle C (frais de service en ligne, reste payé sur place à l'organisateur) peut être utilisé. Question précise à poser à la banque : « Pouvons-nous encaisser le prix d'activités vendues par des organisateurs indépendants, prélever notre commission et leur reverser le solde ? »
- [ ] **Avocat** : relire le **contrat organisateur** et les **conditions de vente des activités des organisateurs** (The Host Club intermédiaire), en plus des CGV de The Host Club. Points clés : mandat d'encaissement, délai de reversement, annulations et remboursements, responsabilité de l'organisateur (assurance, sécurité), loi 31-08 (protection du consommateur), facturation (qui facture le participant ?).
- [ ] **Expert-comptable** : traitement de la commission (chiffre d'affaires de The Host Club) et des sommes encaissées pour le compte des organisateurs (à reverser, pas du chiffre d'affaires) ; TVA sur la commission.
- [ ] **CNDP** : la déclaration doit mentionner la transmission aux organisateurs du prénom, de l'initiale du nom, et, si la personne l'accepte, du régime et des allergies des participants de leurs activités.
- [x] **Catégories préparées** : « Rencontres & activités sociales » et « Culture & apprentissage » sont visibles depuis le 20 novembre (21b) ; reste à leur donner une vraie image et à vérifier les traductions.
- [ ] **Avant le paiement réel** (étape 22) : Back-office → Paramètres → **Modes de paiement des organisateurs** : ne laisser que **C — frais de réservation** tant que le contrat CMI n'autorise pas l'encaissement pour le compte de tiers. Les trois modes sont ouverts sur le site d'essai, où les paiements sont des tests.
- [ ] **CMI — remboursements** : vérifier que le contrat permet les **remboursements partiels** et **plusieurs remboursements** sur un même paiement (le site les gère déjà) et dans quel délai l'argent revient sur la carte (à indiquer dans les CGV).
- [ ] **Avocat — politiques d'annulation** : valider les trois politiques proposées (standard 48 h ; souple 24 h ; stricte 100 % à 7 jours et 50 % à 48 h), le délai de **7 jours après l'activité** pour demander un remboursement, et le fait que **l'équipe** (pas l'organisateur) décide des remboursements.

## Expériences inventées (21b, 20 novembre)

- [ ] Les 14 expériences ajoutées pour la démonstration (et les 11 d'origine) sont **fictives** (`isDemo`) : à archiver ou supprimer dans le back-office avant l'ouverture au public, ou à transformer en vraies expériences (lieu, prix, dates réels).
- [ ] Leurs images sont des **illustrations** (sans personnes) : à remplacer par de vraies photos des lieux (avec l'accord écrit des personnes reconnaissables).
- [ ] Vérifier les traductions arabes des titres et accroches.

## Catalogue et découverte (étape 23, 20 novembre)

- [ ] **Accueil** : Back-office → Accueil du site : choisir les **coups de cœur** et, si vous le souhaitez, activer « Ce week-end », « Nouveautés » ou « Populaires » (désactivées par défaut pour garder l'accueil actuel).
- [ ] **Coordonnées GPS des lieux publics** (points de rendez-vous, parcs, plages…) : à saisir dans chaque activité pour afficher la carte. Celles des activités de démonstration sont **approximatives**.
- [ ] **« Non inclus »** : à compléter sur les vraies activités (boissons, transport, location de matériel…).
- [ ] **Avocat / CNDP** : la politique de confidentialité mentionne désormais la carte OpenStreetMap (chargée seulement sur clic) et le lien vers Google Maps.

## Avis (étape 24, 20 novembre)

- [ ] **Charte de modération** : valider les motifs de signalement et la règle « pas de masquage automatique » ; désigner qui traite les signalements et les photos (back-office → Avis → « Signalés » et « Photos à vérifier »), et dans quel délai.
- [ ] **Avocat / CNDP** : les photos jointes aux avis (avec, parfois, des personnes reconnaissables) — accord des personnes, durée de conservation ; CGU article 11 et politique de confidentialité complétées, à relire.

## Audit du 20 novembre : étapes 28 à 32

- [ ] **Avocat** : activités **réservées aux femmes** (décision de Rita du 20 novembre : possibles ; le serveur vérifie le genre indiqué dans le profil). Faire confirmer la formulation et la conformité (non-discrimination, loi 31-08).
- [ ] **Blog** : les articles qui décrivent le paiement par virement seront à mettre à jour quand le paiement par carte (CMI) sera ouvert ; l'aide et « À propos » s'adaptent déjà tout seuls.
