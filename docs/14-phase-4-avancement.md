# 14 — Phase 4 : Réservations — avancement

> Objectif de la phase (docs/08) : réservation transactionnelle, blocage pendant le paiement, annulation,
> liste d'attente, historique, export. Livrable : **tests de concurrence verts** et **parcours complet avec l'adaptateur de paiement de test**.

| Étape | Contenu | Statut |
|---|---|---|
| **4a** | Réserver une place, la bloquer 15 min, payer (en test), confirmer ; expiration ; paiement tardif | ✅ |
| 4b | Annulation par le membre (politique 48 h, remboursement), liste d'attente | à venir |
| 4c | Back-office : réservations réelles, annulation/déplacement par l'équipe, pointage, export des participants | à venir |

## Étape 4a — Réserver et payer (en mode test) ✅

### Ce que voit un membre

1. Sur une date, **Réserver** → page récapitulative (prix, places restantes, conditions d'annulation).
   - Pas connecté : invitation à se connecter ou à créer un compte, puis retour automatique sur cette page.
   - E-mail pas encore confirmé, ou profil incomplet : explication et bouton pour régler ça.
   - Date complète, fermée (12 h avant un dîner, 2 h avant les autres formats) : message clair, pas de bouton.
2. Choix du nombre de places (si l'expérience l'autorise), puis **Réserver et payer**.
   La place est **bloquée 15 minutes** pour lui pendant le paiement.
3. Page de paiement. Tant que le contrat avec une banque n'est pas signé, c'est une **page de TEST**
   clairement signalée : aucune carte, aucun argent ; deux boutons simulent l'accord ou le refus de la banque.
4. Refus : la place reste bloquée, bouton **Payer** pour réessayer. Accord : **réservation confirmée**,
   lieu exact affiché (sauf dîners : révélé avec le groupe), ajout à l'agenda.

| Tunnel | Paiement de test | Confirmée |
|---|---|---|
| ![Tunnel](captures/reservation-1-tunnel.jpg) | ![Paiement de test](captures/reservation-2-paiement-test.jpg) | ![Confirmée](captures/reservation-3-confirmee.jpg) |

### Garanties côté serveur

| Garantie | Comment |
|---|---|
| **Jamais plus de réservations que de places** | Vérification et blocage dans une même transaction Firestore |
| **Une seule réservation par personne et par date** | Verrou `sessions/{id}/seatLocks/{uid}` ; un double clic reprend la même réservation |
| **Prix incontestable** | Calculé et enregistré par le serveur ; le navigateur n'envoie que la date et le nombre de places |
| **Place libérée si on ne paie pas** | Tâche automatique toutes les 5 minutes (`expireHolds`) |
| **Paiement arrivé trop tard** | Place reprise s'il en reste ; sinon **remboursement automatique** et explication au membre |
| **Notification de paiement reçue deux fois** | Traitée une seule fois (journal `paymentEvents`) |
| **Montant payé différent** | Remboursé automatiquement, réservation inchangée |
| **Paiement de test impossible en production** | La page et la fonction de test ne marchent que si le réglage `settings/payment` vaut `{ provider: "sandbox", mode: "test" }` ; sans réglage, le paiement est désactivé |

Le vrai prestataire (CMI, Payzone, YouCan Pay…) sera un **adaptateur de plus** derrière la même interface (phase 5) :
le reste du code ne change pas.

### Tests

- **16 tests d'intégration** sur émulateurs (`firebase/tests/reservations.test.ts`), dont :
  - **50 réservations simultanées pour 12 places : exactement 12 réussissent**, les 38 autres reçoivent « complet » ;
  - 10 vrais clients en même temps pour 4 places ; 5 clics simultanés de la même personne → une seule réservation ;
  - paiement refusé puis accepté, expiration, paiement tardif avec et sans place, date gratuite, paiement désactivé.
- **6 tests unitaires** (prix, fermeture des réservations, raisons de refus).
- **22 vérifications de bout en bout** dans un vrai navigateur mobile (`tests/e2e/firebase-booking.e2e.cjs`) :
  visiteur → connexion → e-mail à confirmer → 2 places → paiement refusé → paiement accepté → confirmé dans Firestore → doublon refusé → version arabe.
- Tous les tests précédents repassent : 57 sur émulateurs, 33 unitaires, 73 de bout en bout en mode Firebase, 60 en mode démonstration.

### Fichiers principaux

| Rôle | Fichier |
|---|---|
| Règles communes (prix, délais, refus) | `packages/shared/src/booking.ts` |
| Réservation | `functions/src/reservations/create-reservation.ts` |
| Expiration des blocages | `functions/src/reservations/expire-holds.ts` |
| Interface prestataire + adaptateur de test | `functions/src/payments/provider.ts`, `providers/sandbox.ts` |
| Démarrage du paiement / réponse de test | `functions/src/payments/start-checkout.ts`, `sandbox-complete.ts` |
| Traitement d'un paiement (commun à tous les prestataires) | `functions/src/payments/apply-event.ts` |
| Tunnel, page de test, suivi | `apps/web/app/[locale]/reserver/…`, `paiement-test/…`, `espace/reservations/[id]` |

### Reste pour la suite de la phase 4

- Annulation par le membre avec remboursement selon la politique 48 h, liste d'attente (4b).
- Back-office branché sur les vraies réservations : liste, annulation, déplacement, pointage, export (4c).
- E-mails de confirmation : phase 7 (pour l'instant, la confirmation s'affiche sur le site et dans « Mes réservations »).
- Codes promo et frais de service : phase 5.
