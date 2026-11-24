# 26 — Organisateurs : état des lieux et plan (validé et fait le 24 novembre 2026)

## Ce qui ne va pas aujourd'hui
| # | Constat | Risque |
|---|---|---|
| 1 | À l'inscription et dans le formulaire, l'organisateur peut choisir **n'importe quel univers, Tables compris** (lieu secret, tables composées). | Des « Tables » hors des rendez-vous Wenzy, mélangées aux nôtres. |
| 2 | Une activité **déjà publiée** reste en ligne quand l'organisateur la modifie (textes, photos, prix) : **aucune relecture**. | Contenu ou prix changé sans contrôle. |
| 3 | Les **nouvelles dates** d'une activité publiée sont mises en ligne **tout de suite**. | Dates non vérifiées (lieu, horaires, conflit avec l'activité du samedi). |
| 4 | L'organisateur peut **annuler une date entière** lui-même (remboursement de tous les inscrits). | Décision lourde sans l'équipe. |
| 5 | Il voit et exporte la liste de ses participants. | Données personnelles : à limiter au nécessaire. |
| 6 | Restes de l'ancien modèle : **coordonnées bancaires, modes de paiement, taux de commission**, « vous recevez vos versements ». Depuis la décision 31, le participant paie 35 DH en ligne et le prix de l'activité **sur place** à l'organisateur, sans commission. | Pages qui se contredisent (« Devenir organisateur » dit les deux). |
| 7 | Pages publiques (« Devenir organisateur », aide, contrat, fiche organisateur) écrites avant les rendez-vous et les 3 univers. | Message flou. |

## Le plan (lot O)
- **O1. Univers** : un organisateur publie dans **Activités** ou **Événements**, jamais dans Tables (inscription,
  formulaire, serveur). Ses activités existantes dans Tables sont signalées à l'équipe.
- **O2. Validation systématique** :
  - nouvelle activité → « à valider » (déjà le cas) ;
  - modification d'une activité en ligne → la **version en ligne reste inchangée** et les changements attendent la
    validation de l'équipe (« Modifications à valider », avec ce qui a changé) ;
  - nouvelles dates → « à valider », publiées par l'équipe.
- **O3. Droits limités** :
  - garde : créer et modifier (soumis à validation), voir les réservations de ses activités, pointer les présents,
    répondre aux avis, voir ses statistiques ;
  - retire : annuler une date (il **demande l'annulation**, l'équipe décide et rembourse), exporter des données
    personnelles (il voit prénom + initiale et le nombre de places), coordonnées bancaires et modes de paiement
    (inutiles sans reversement).
- **O4. Pages** : réécrire « Devenir organisateur », l'aide organisateurs, le contrat organisateur et l'espace /pro avec
  le vrai fonctionnement (validation par l'équipe, 35 DH en ligne + prix sur place, pas de commission, Activités ou
  Événements, l'équipe peut annuler).
- **O5. Lien avec l'activité du samedi** : bouton « Proposer pour un samedi » sur une activité validée ; la proposition
  apparaît dans le planning du samedi (Back-office → Rendez-vous), l'équipe la place sur un samedi ou non.

## Décisions (24 novembre)
1. Modèle confirmé : 35 DH en ligne pour Wenzy, prix de l'activité payé sur place à l'organisateur, sans commission.
2. Modification d'une activité en ligne : la version en ligne reste jusqu'à la validation de l'équipe.
3. Annulation d'une date : l'organisateur demande, l'équipe décide (et rembourse).
4. Participants : prénom + initiale **et téléphone** (visible jusqu'à 7 jours après la date, pas d'export).
5. « Proposer pour un samedi » : maintenant.

## Ce qui a été fait
| Où | Quoi |
|---|---|
| Inscription organisateur | Choix « Activités, Événements, ou les deux » (Tables refusé, aussi par le serveur). |
| Formulaire d'activité (/pro) | Univers Activités et Événements seulement ; textes « l'équipe valide tout » ; message clair après l'envoi d'une modification. |
| Serveur | Organisateur qui enregistre une activité en ligne → `experiences/{id}/private/revision` (modifications + nouvelles dates), rien n'est appliqué ; `revisionPending` sur la fiche. |
| Back-office → fiche de l'activité | « Modifications proposées » (liste de ce qui change) : **Valider les modifications** (appliquées, dates créées) ou **Refuser** (message). L'organisateur est prévenu. |
| /pro → date | Téléphone des inscrits (lien d'appel), plus d'export ; « Demander l'annulation de la date » (motif). |
| Back-office → Organisateurs | « Demandes des organisateurs » : **Annuler la date et rembourser** ou **Refuser** (message). |
| /pro → activité en ligne | « Proposer pour l'activité du samedi » (jusqu'à 3 samedis souhaités, message). |
| Back-office → Rendez-vous | Dans l'activité du samedi, « Propositions des organisateurs » : **Placer ce samedi** (heure, places) ou **Refuser**. |
| Droits retirés | Annuler une date (`adminCancelSession` réservé à l'équipe), exporter (`adminLogExport` réservé à l'équipe), écran bancaire supprimé. |
| Textes | « Devenir organisateur », espace /pro, aide organisateurs, contrat organisateur (version 2026-11-24, acceptée par les nouveaux organisateurs à l'inscription), conditions de vente et politique de confidentialité (téléphone transmis à l'organisateur). |

## À faire de votre côté
- Prévenir les organisateurs déjà inscrits du nouveau contrat (il n'y a pas de nouvelle acceptation automatique pour
  eux) : validation de chaque modification et date, annulation sur demande, téléphone des participants.
- Faire relire par l'avocat : contrat organisateur (validation, demande d'annulation, téléphone) et politique de
  confidentialité (téléphone transmis à l'organisateur de l'activité réservée).
- Les activités d'organisateurs déjà rangées dans Tables (s'il y en a) devront être déplacées dans Activités ou
  Événements par l'équipe : l'organisateur ne pourra plus les enregistrer telles quelles.
