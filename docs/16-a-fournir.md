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
- [ ] **CNDP** : numéro de récépissé de la déclaration des traitements
- [ ] **CNDP** : numéro d'autorisation (ou de récépissé) pour le transfert des données hors du Maroc (hébergement en Belgique / Pays-Bas)

> ⚠️ Ne pas reprendre les informations d'une autre société (l'exemple Sahbi n'a servi que de modèle de présentation).

## À confirmer

- [ ] **Aya Snoussi** : son rôle (fondatrice ? hôtesse ? ambassadrice ?) pour la présenter correctement. Pour l'instant : lien « Aya Snoussi sur Instagram (@ayagsnoussi) » dans le pied de page.
- [ ] **Abonnement** : rétractation et remboursement (à définir avec l'avocat) ; prix définitif, puis activer dans le back-office.
- [ ] **Textes juridiques** (CGU, CGV, Confidentialité, Sécurité) : relecture par un avocat. Les versions en ligne sont des **projets** rédigés à partir du fonctionnement réel du site.
- [ ] **Durées de conservation** proposées (comptes inactifs 3 ans, journaux 12 mois, comptabilité selon la loi).
- [ ] **Délai de traitement des signalements** annoncé : 48 h (page Sécurité).

## Plus tard

- [ ] **Vraies photos** des lieux et des expériences (droits d'utilisation + accord des personnes reconnaissables).
- [ ] **Compte Brevo** (envoi des e-mails : confirmations, factures, rappels).
- [ ] **Contrat de paiement** et accès de test du prestataire (CMI, Payzone, YouCan Pay).
- [ ] **Domaine** définitif et adresses e-mail.
- [ ] **Traduction arabe** des textes juridiques (la version française s'affiche en attendant).

## Rappel CNDP (loi 09-08)

Les traitements « ordinaires » demandent une **déclaration préalable** à la CNDP, certains traitements une **autorisation**, et les **transferts hors du Maroc** sont encadrés. La CNDP précise qu'un traitement **ne peut pas être mis en œuvre avant réception du récépissé** ou de l'autorisation.
Conséquence pratique : le site d'essai reste réservé à des **testeurs** (données de test) ; **pas d'ouverture au public ni de collecte de vraies données clients avant les récépissés** (checklist, section D).
