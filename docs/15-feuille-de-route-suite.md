# 15 — Feuille de route après la phase 4

> Demandes de Rita du 7 novembre 2026, intégrées au plan. Chaque étape se termine par une démonstration et sa validation.
> Les choix marqués **(hypothèse)** sont des propositions : on les change facilement si besoin.

## Ordre proposé

| Étape | Contenu | Dépend de |
|---|---|---|
| **5a** ✅ | **Avis** sur les expériences vécues + **fiches sans date** (dates ajoutées plus tard), **expériences passées toujours listées**, **reproposer des dates** | rien |
| **5b** ✅ | **Abonnement annuel** : prix réduits pour les abonnés, prix public barré, réglages par l'admin | paiement de test (fait) |
| **5c** | **Factures** (et avoirs pour les remboursements) + **envoi par e-mail** | infos de la société pour des factures légales ; compte Brevo pour l'envoi réel |
| 5c+ | **Contenus et aide** : FAQ (10 questions), pages Sécurité / CGU / CGV / Confidentialité (projets), informations légales, **version anglaise**, **centre d'aide** (clients / partenaires), nouvelle image d'accueil | infos légales à fournir (docs/16) |
| 5d | Codes promo, frais de service | rien |
| 5e | Prestataire de paiement réel (CMI, Payzone, YouCan Pay) | contrat signé (checklist C) |
| 6 | Composition des tables (dîners) | rien |
| 7 | Rappels J-1 / H-3, notifications push, statistiques | e-mails (5c) |
| 8 | Recette, sécurité, mise en production | checklist complète |

---

## Ajouts du 7 novembre (exemples Sahbi et Timeleft)

Inspirations à reprendre **à notre façon** (sans copier) :

| Idée | Où | Statut |
|---|---|---|
| FAQ courte (10 questions max) : prix, langues, régime alimentaire, abonnement, sécurité | /faq | ✅ |
| Pages **Sécurité**, **Conditions d'utilisation**, **Confidentialité** (et CGV), avec un bloc « Informations légales et contacts » | pied de page, /securite, /cgu, /cgv, /confidentialite | ✅ projets à valider (infos à fournir : docs/16) |
| Version **anglaise** du site | sélecteur FR · عربي · EN, adresses /en/… ; prix affichés en « MAD » ; fiches d'expériences encore en français tant qu'elles ne sont pas traduites dans le back-office | fait |
| **Centre d'aide** façon Timeleft : recherche, onglets **Clients / Partenaires**, catégories (Bien démarrer, Abonnement, Expériences et réservations, Compte, Sécurité, Partenariats), articles, « Cet article vous a-t-il aidé ? », articles liés | /aide | en cours |
| **Programme partenaires** : « Devenir partenaire », nos critères (ambiance propice à la conversation, réputation, emplacement central, lieux indépendants, accueil de petits groupes), formulaire de candidature, aide partenaires (gestion des réservations, signaler un problème : absences, retards, comportement) | /aide (Partenaires) + back-office | à faire |
| **Régime alimentaire / allergies** demandés à la réservation et transmis au lieu | tunnel de réservation | à faire (en attendant : via Contact, FAQ) |
| **Langue(s) de la table** choisie(s) à la réservation pour mieux composer les groupes | tunnel + matching (phase 6) | à faire |
| « Se rencontrer d'abord » : après la table, **contacts échangés seulement si les deux le souhaitent** | espace membre (après phase 6) | idée à valider (décision D8 : pas de messagerie au lancement) |
| Lien **Instagram d'Aya Snoussi** | pied de page | ✅ (rôle à confirmer) |
| **Image d'accueil** nette | accueil | en cours |

## 5a — Avis, fiches sans date, expériences passées

### Avis
- Qui peut noter : une personne **pointée présente**, ou dont la réservation était confirmée et l'expérience **terminée** (si l'équipe n'a pas pointé). Pas les absents.
- Un avis par réservation : **note de 1 à 5** et commentaire (facultatif, 1 000 caractères). Signé « Prénom + initiale » (ex. « Sara B. »).
- L'avis **reste attaché à l'expérience** (pas seulement à la date) : affiché sur sa fiche, avec la note moyenne, même quand il n'y a plus de date à venir.
- Dans l'espace membre : « Votre avis » sur la réservation passée, et une liste « À noter ». Notification in-app le lendemain de l'expérience (l'e-mail viendra avec 5c/7).
- Back-office : liste des avis, **masquer** un avis inapproprié (journalisé).

### Fiches sans date et expériences passées
- Créer une expérience **sans date** : la fiche est publiée avec « Prochaines dates bientôt ».
- Sur la fiche admin, **« Ajouter des dates »** à tout moment (une date ou une récurrence) ; c'est aussi le moyen de **reproposer** une expérience passée.
- Le catalogue liste **toutes les expériences publiées** : d'abord celles qui ont une date à venir, puis « **Déjà vécues** » (avec leurs avis et « Dernière édition : 12 octobre »).
- Sur une fiche sans date à venir : bouton **« Me prévenir des prochaines dates »** ; quand l'équipe ajoute une date, les personnes inscrites reçoivent une notification.

### Livré (5a) ✅

| Pour qui | Ce qui change |
|---|---|
| **Équipe** | Fiche expérience : case **« Programmer des dates maintenant »** (décochée = fiche publiée sans date) ; section **« Ajouter des dates (ou reproposer l'expérience) »** sur toute fiche existante. Liste des expériences : **« Aucune — ajouter des dates »** pour celles sans date à venir. Nouvelle page **Avis** : lire, **masquer** / republier (note recalculée, journalisé). |
| **Visiteur** | Catalogue : section **« Déjà vécues — de nouvelles dates arrivent »** (cartes « Prochaines dates bientôt » avec note moyenne). Fiche sans date : **« Me prévenir des prochaines dates »** ; « Éditions passées » (nombre et dernière date) ; les avis restent affichés. |
| **Membre** | Le lendemain de l'expérience : notification **« Comment s'est passée votre expérience ? »** ; sur la réservation passée : **note 1 à 5 + avis**, publié sur la fiche avec « Prénom N. ». Tableau de bord : « À noter ». Notification quand une expérience suivie a de nouvelles dates. |

Règles : un avis par réservation ; personnes pointées présentes, ou confirmées une fois l'expérience terminée ; jamais les absents ; dans les **60 jours** (hypothèse). Sur la fiche publique, un nouvel avis apparaît dans les 5 minutes (cache du catalogue) ; l'auteur le voit tout de suite.

| Avis (membre) | Modération (équipe) |
|---|---|
| ![Avis](captures/avis-1-formulaire.jpg) | ![Back-office avis](captures/avis-2-back-office.jpg) |

Tests : 6 tests d'intégration (éligibilité, note moyenne exacte, doublon, modération, demande d'avis unique, création sans date, alerte unique) et 20 vérifications de bout en bout (`tests/e2e/firebase-reviews.e2e.cjs`). Toutes les suites : 84 sur émulateurs, 37 unitaires, 150 de bout en bout en mode Firebase, 60 en démonstration.

## 5b — Abonnement annuel

Proposition de construction (à valider) :

- **Une formule** au lancement (ex. « The Host Club Membre »), prix **annuel** réglé par l'admin. L'architecture permet plusieurs formules plus tard.
- **Avantages réglables par l'admin** :
  - **réduction** sur les expériences : un pourcentage global **(hypothèse : 15 %)**, ou un **prix membre précis** par expérience (prioritaire sur le pourcentage) ;
  - **accès anticipé** aux nouvelles dates (ex. 48 h avant le public) — facultatif ;
  - **expériences réservées aux membres** — case à cocher par expérience ;
  - texte des avantages (FR/AR) affiché sur la page d'abonnement.
- **Affichage** : partout où un prix apparaît, le **prix public est barré** à côté du **prix membre** (pour tout le monde : c'est l'argument de vente), avec « Devenir membre ». Un abonné voit « Votre prix membre » et paie ce prix.
- **Souscription** : page « Abonnement » → paiement (même parcours que les réservations, adaptateur de test en attendant la banque) → abonnement actif **12 mois**. **Pas de prélèvement automatique** (les prestataires marocains le proposent rarement) : rappel avant l'échéance et renouvellement en un clic **(hypothèse)**.
- **Le prix est toujours calculé par le serveur** au moment de la réservation (abonnement actif vérifié) et figé dans la réservation.
- **Back-office** : réglages de la formule, liste des abonnés (dates, renouvellements), offrir / retirer un abonnement (journalisé), revenus des abonnements dans les statistiques.
- Espace membre : **carte de membre** (statut, date d'échéance, économies réalisées).
- À faire valider par le comptable et l'avocat : CGV de l'abonnement (rétractation, remboursement), TVA.

### Livré (5b) ✅

| Pour qui | Ce qui change |
|---|---|
| **Équipe** | Back-office → **Abonnement** : nom, **prix annuel**, **réduction** (%), **accès anticipé** (heures, 0 = aucun), avantages FR/AR, case **« Proposer l'abonnement »** ; membres actifs, revenus, liste des abonnés ; **offrir** un abonnement (1-24 mois) ou le **retirer** (motif journalisé). Fiche expérience : **« Prix membre (DH) »** facultatif (sinon la réduction s'applique) et **« Réservée aux membres abonnés »**. |
| **Visiteur** | Partout (cartes, fiche, tunnel) : **prix public barré** à côté du **prix membre** (arrondi au dirham), lien « Devenir membre ». Page **Abonnement** (lien dans le pied de page et l'espace membre) : avantages, prix, souscription. |
| **Membre** | Souscription → paiement (adaptateur de test) → **abonnement actif 12 mois**, notification, carte de membre (échéance, **économies réalisées**). Le **prix membre est appliqué par le serveur** à chaque réservation (aussi pour une place proposée par la liste d'attente) et apparaît sur le reçu (« Réduction membre »). Accès aux expériences **réservées aux membres** et aux **nouvelles dates en avant-première**. Renouvellement en un clic **30 jours avant** l'échéance (la nouvelle année part de l'échéance) ; **pas de prélèvement automatique**. |

| Membre | Reçu | Back-office |
|---|---|---|
| ![Membre](captures/abonnement-1-membre.jpg) | ![Reçu](captures/abonnement-2-recu.jpg) | ![Back-office](captures/abonnement-3-back-office.jpg) |

**Sur le projet d'essai, l'abonnement est créé mais pas encore proposé** : back-office → Abonnement → régler le prix → cocher « Proposer l'abonnement » → Enregistrer.

À venir : rappel avant l'échéance (avec les e-mails, 5c/7), remboursement d'un abonnement (au cas par cas pour l'instant).

Tests : 6 tests d'intégration et 4 unitaires (formule, souscription et renouvellement, prix membre, réservé aux membres, accès anticipé, cadeau / retrait, offre de liste d'attente au prix membre, règles de sécurité) ; 24 vérifications de bout en bout (`tests/e2e/firebase-membership.e2e.cjs`). Toutes les suites : 90 sur émulateurs, 41 unitaires, 172 de bout en bout en mode Firebase, 60 en démonstration.

## 5c — Factures et e-mails

- **Une facture pour chaque paiement** (réservation, abonnement) et un **avoir** pour chaque remboursement, avec une **numérotation continue sans trou** (ex. `FA-2026-000123`, `AV-2026-000012`), attribuée par le serveur.
- Contenu : identité de la société (raison sociale, siège, ICE, IF, RC — saisis par le super-admin dans **Paramètres → Société**), client, détail, montants HT / TVA / TTC, moyen de paiement.
  Tant que la société n'existe pas, le document s'intitule **« Reçu — projet d'essai »** et n'a pas valeur de facture.
- **PDF** généré par le serveur, stocké de façon privée (visible par la personne et l'équipe seulement).
- Membre : bouton **« Télécharger la facture »** sur chaque réservation et page **« Mes factures »**. Équipe : factures depuis **Paiements**, bouton **« Renvoyer par e-mail »**.
- **Envoi par e-mail** automatique après paiement et remboursement, via un service d'envoi interchangeable :
  en attendant le compte Brevo, les e-mails sont rangés dans une **boîte d'envoi de test** consultable dans le back-office (rien n'est réellement envoyé) ; brancher Brevo = enregistrer sa clé, sans changer le code.
- À faire valider par le comptable : mentions obligatoires, taux de TVA applicables (places, commissions, abonnement), conservation.

---

## Corrections faites le 7 novembre

- **Annulation impossible depuis le téléphone** : la confirmation utilisait une fenêtre système que certains navigateurs intégrés (WhatsApp, Instagram) bloquent sans l'afficher. Toutes les confirmations se font désormais **dans la page** (« Oui, annuler » / « Non, garder ma place »), y compris dans le back-office. Les tests de bout en bout refusent maintenant toute fenêtre système, pour que le problème ne revienne pas.
- **« Mes réservations » en erreur pendant ~1 minute** juste après la mise en ligne de la 4b : un index de la base était encore en construction. Il est prêt ; à l'avenir, le délai de construction des nouveaux index est à prévoir lors des mises en ligne (quelques minutes).
