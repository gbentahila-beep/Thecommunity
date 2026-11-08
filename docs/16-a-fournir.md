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
  - **annulations tardives / absences répétées** : restriction ou suspension temporaire après avertissement (CGU art. 7) — pas de barème automatique pour l'instant ;
  - **signalements et décisions de modération** conservés 3 ans au plus ;
  - mention d'une possible **vérification d'identité ou d'âge** en cas de doute.
- [ ] **Confidentialité (8h)** : faire valider le tableau des durées (compte 3 ans après la dernière activité, signalements 3 ans, contacts 3 ans, journaux 12 mois, **pièces comptables 10 ans — loi 9-88**), l'effacement du régime / des allergies **30 jours après l'expérience** (à automatiser avant la mise en production), le délai de réponse d'**un mois**, la mention de **Brevo (France)** et compléter le **prestataire de paiement** dès qu'il est choisi.
- [ ] **Galerie À propos (8e)** : s'assurer que les personnes reconnaissables sur les 8 photos fournies sont d'accord pour apparaître sur le site (et la mention « The Brunch Club x Aya Snoussi »). Envoyer d'autres photos quand vous voulez : elles s'ajoutent à la mosaïque.
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
