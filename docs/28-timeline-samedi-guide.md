# 28 — Timeline des rendez-vous, activité du samedi, Girls only, guide (24/11)

Décisions validées le 24/11. Elles remplacent la **décision 42** (lieu révélé 5 h avant, ramené à 21 h la veille le
matin et le midi ; fermeture 12 h avant, 18 h la veille avant 14 h).

## 1. La timeline des Tables (dîner, café, brunch)

La même pour tous les rendez-vous, et pour toutes les Tables (rendez-vous ou non) :

| Quand | Quoi | Pour qui |
|---|---|---|
| Veille 15h | Demande d'**option** aux restaurants, entre les deux services : inscrits du moment + **une table de marge** (au plus les places de la date) | Restaurants |
| +1 h / +2 h | Relance, puis autre restaurant si pas de réponse (réglages d'attribution inchangés) | Restaurants |
| Veille 18h30 | Alerte « Lieux à appeler » s'il manque des confirmations (une fois par date) | Équipe |
| Veille 20h30 | **Fermeture** des réservations ; **tables composées** avec la liste définitive (retouchables par l'équipe jusqu'à 21h30) ; gamme voisine ; minimum ; **nombre final** envoyé aux lieux dont la demande change (tables en trop libérées : demandes en attente d'abord, puis les dernières confirmées ; tables manquantes demandées aussitôt) | Membres, restaurants |
| Veille 21h30 | **Lieu et tables dévoilés** (notification, e-mail, aperçu de la table) | Membres |
| Jour J 11h (veille 21h30 si début avant 14h) | **Récapitulatif** à chaque lieu : tables, prénoms, régimes et allergies partagés | Restaurants |
| 1 h avant | Tables remises d'accord ; **mise à jour** au lieu seulement si le récapitulatif a changé | Restaurants |

- Concrètement : Dîner du mercredi 20h30 → options mardi 15h, dévoilement mardi 21h30, récap mercredi 11h. Café du
  samedi 16h → vendredi 15h / 21h30, récap samedi 11h. Brunch du dimanche 12h30 → samedi 15h / 21h30, récap samedi 21h30.
- Une date annulée (ou vidée) libère ses options : chaque lieu reçoit « table libérée ».
- Activité à lieu fixe (activité du samedi) : demande au lieu la veille à 15h, nombre final à la fermeture s'il a
  changé, récapitulatif comme ci-dessus.
- Nouveau modèle WhatsApp à faire valider par Meta : `wenzy_nombre_final_lieu` (docs/22 § 17.H).
- Code : `packages/shared/src/tables.ts` (heures), `functions/src/tables/automation.ts` (étapes, toutes les 15 min),
  `functions/src/tables/allocation.ts` (`runAllocation` avec option, `finalizeAllocation`, `sendFinalMessage`).
  Page d'une date : bloc « déroulé » (fait / à venir / en retard).

## 2. L'activité du samedi

- Seul l'univers **Activités** alimente l'activité du samedi ; une activité n'a pas de date à elle (formulaire :
  étape 6 remplacée par une explication). Les **Événements** ont leurs propres dates (soirée, padel ponctuel…).
- Ajouter une activité : créer l'événement (univers Activités, publié), puis sur sa fiche, carte « Activité du
  samedi » : **Ajouter à la rotation** (`adminRotationAddActivity`, en dernière position) ou **Programmer un samedi**.
- Planning : chaque samedi indique son ouverture (« s'ouvre le … (Pass), le … pour tous ») et l'heure limite pour le
  changer. Un samedi s'ouvre quand le précédent ferme (vendredi 20h30), une semaine plus tôt pour les abonnés Pass.
- **48 h avant** l'ouverture d'un samedi, l'équipe reçoit l'activité prévue, à confirmer ou à changer
  (`rotationOpeningAlerts`, une fois par samedi, marquée sur `rendezvous/{id}.alerts`).

## 3. Exclusive et éditions spéciales

- Exclusive : **en plus** de Casual et Premium, le premier mercredi du mois (3 dîners en parallèle ce jour-là).
- Éditions spéciales (révisé le 25/11) : dans les **Tables**, 3 éditions × 4 formats (café, brunch, déjeuner, dîner) :
  **Girls only** (réservée aux femmes, vérifié à la réservation), **Expats**, **New in town** ; modèles
  `<édition>-<format>` (`special-editions.ts`), mêmes restaurants que leur format. **Rien d'automatique** : l'équipe
  crée chaque édition à la main (gamme, date, places). Section « Éditions spéciales » dans « Créer ».

## 4. Site d'essai : nettoyage

Une fois (`settings/showcase.purgeCancelledAt`, contenu de départ avec `--with-demo-experiences` seulement) : les dates
annulées, les dates de l'activité du samedi hors planning et les dates de gammes hors de leur jour sont supprimées,
réservations comprises. Le Programme du back-office n'affiche plus les dates annulées.

## 5. Guide

`/admin/guide` (menu « Guide ») : le principe, la semaine type, et « comment faire » pas à pas (places, nouvelle
activité, samedi d'un partenaire, ordre de la rotation, événement, Girls only, organisateurs, alertes).

## 6. Site d'essai : foule de démonstration (25/11)

Une fois (`settings/showcase.demoCrowdV1At`, contenu de départ avec `--with-demo-experiences` seulement) : 300 comptes
fictifs `participantN@demo.wenzy.test` (mot de passe `Demo2026!`, profils complets) réservent les dates des 7 prochains
jours par le vrai circuit (réservation, paiement de test, facture) : 60 à 100 % des places, un tiers des dates
complètes. Aucun e-mail ne part vers une adresse fictive (`.test`, `example.com`), même avec Brevo (`isFakeAddress`).
Les créneaux des lieux d'essai sont alignés sur le brunch de 12h30 (`venueSlotsV2At`).

## 7. Site de démo : « Réinitialiser la démo » (25/11)

Réglages → **Site de démo** (raccourci sur l'Accueil), super-admin, site de démonstration seulement (double garde :
`settings/showcase.trial`, posé par le contenu de départ du site d'essai, et paiement de test). Un clic (confirmation
« RÉINITIALISER ») : tout ce qui s'est passé est effacé (réservations, paiements, factures, tables, demandes aux lieux,
boîte d'envoi, notifications, avis des membres, Pass et carnets, dates passées), les dates à venir sont remises à zéro,
les **comptes invités** (liste saisie sur la page) sont inscrits à un créneau de chaque rendez-vous de la semaine
(Premium de préférence, paiement de test), puis la foule remplit les 7 prochains jours. Durée : moins d'une minute.

## 8. Lieux choisis par l'équipe, 180 lieux de démonstration (25/11)

- Aucun lieu compatible restant (refus, complet) : la page d'une date liste tous les lieux du format avec la raison
  pour laquelle ils n'ont pas été proposés ; « Demander à ce lieu » (`adminRequestVenue`) envoie la demande.
- Site de démonstration : 180 lieux fictifs (`demo-lieu-001…180`, toutes gammes, formats et jours ;
  `settings/showcase.demoVenuesV1At`), coordonnées en example.com ; leurs réponses sont simulées (10 min).
