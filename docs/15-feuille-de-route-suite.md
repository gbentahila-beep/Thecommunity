# 15 — Feuille de route après la phase 4

> Demandes de Rita du 7 novembre 2026, intégrées au plan. Chaque étape se termine par une démonstration et sa validation.
> Les choix marqués **(hypothèse)** sont des propositions : on les change facilement si besoin.

## Ordre proposé

| Étape | Contenu | Dépend de |
|---|---|---|
| **5a** | **Avis** sur les expériences vécues + **fiches sans date** (dates ajoutées plus tard), **expériences passées toujours listées**, **reproposer des dates** | rien |
| **5b** | **Abonnement annuel** : prix réduits pour les abonnés, prix public barré, réglages par l'admin | paiement de test (fait) |
| **5c** | **Factures** (et avoirs pour les remboursements) + **envoi par e-mail** | infos de la société pour des factures légales ; compte Brevo pour l'envoi réel |
| 5d | Codes promo, frais de service | rien |
| 5e | Prestataire de paiement réel (CMI, Payzone, YouCan Pay) | contrat signé (checklist C) |
| 6 | Composition des tables (dîners) | rien |
| 7 | Rappels J-1 / H-3, notifications push, statistiques | e-mails (5c) |
| 8 | Recette, sécurité, mise en production | checklist complète |

---

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
