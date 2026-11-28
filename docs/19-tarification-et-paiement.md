# 19 — Tarification en deux parts et paiement (8 novembre 2026 — étape 11 livrée, paiement 5h à venir)

Demande de Rita : séparer **ce que le client paie en ligne** (part organisation) de **ce qu'il paie sur place au partenaire** (prix fixe ou consommation libre). Les réductions (abonnement, codes promo) ne portent **que sur la part organisation**. Texte de travail rédigé avec ChatGPT : on en garde le principe, adapté à l'architecture réelle. Les 4 adaptations du § 3 ont été validées par Rita (« Ok pour les 4 ») ; l'étape 11 est livrée (§ 8).

## 1. Ce qui existe aujourd'hui (audit)

| Élément | Où | Rôle actuel |
|---|---|---|
| Formulaire d'expérience | `apps/web/components/admin/experience-form.tsx` | Sections 1 Informations · 2 Lieu · **3 Format et prix** (prix par place, prix membre, réservé aux membres, inclus…) · **4 Partenaire et économie** (partenaire, modèle « organisée par nous » / « commission », coût par place ou %) · 5 Dates |
| Schéma partagé | `packages/shared/src/experience-input.ts` | `priceDh`, `memberPriceDh`, `partnerId`, `economicsModel`, `costPerSeatDh`, `commissionPercent` |
| Données | `experiences/{id}` (`price`, `memberPrice`) ; `experiences/{id}/private/economics` (partenaire, modèle, coût, commission — lisible équipe seulement) | Le prix public est **entièrement payé en ligne** |
| Calcul du prix | `computePricing()` (`packages/shared/src/booking.ts`) | prix membre → code promo → frais de service ; recalculé **côté serveur** à la réservation |
| Réservation | `reservations/{id}.pricing` | Copie figée du prix (sous-total, réduction membre, promo, frais, total) — déjà immuable |
| Paiement | `functions/src/payments/` (`provider.ts`, `start-checkout`, `apply-event`, `refund`) | Prestataire **de test** derrière une interface ; confirmation uniquement par le serveur (jamais par une redirection) |
| Factures | `invoices/…` + PDF | Facture du montant payé en ligne |
| Pointage | `adminSetPresence` + page de la session | Présent / absent — **pas de QR code** aujourd'hui |
| Statistiques | `/admin/statistiques` | CA, marge (selon le modèle économique), remplissage… |

## 2. Ce que je garde, ce que je change

- **Section 4 « Partenaire et économie » : conservée telle quelle** (interne, équipe seulement). Elle continue de calculer la marge sur la **part encaissée en ligne**.
- **Nouvelle section 5 « Tarification et paiement client »**, juste après la 4 (pour réutiliser le partenaire choisi) ; « Dates » devient la section 6.
- Les champs **prix** quittent la section 3 (qui garde le format, les tailles de groupe, les langues, l'inclus…) et vont dans la section 5 :
  - Mode de tarification : **(A) Prix fixe chez le partenaire**, **(B) Consommation libre chez le partenaire**, **(C) Tout payé en ligne** (aucune part sur place — c'est le cas de toutes les expériences actuelles).
  - Prix organisation (payé en ligne) · Prix membre (facultatif, sur la part organisation) · Prix partenaire fixe (A seulement) · Description de ce qui est payé sur place.
  - **Aperçu dynamique** de ce que voit le client : « 450 DH par personne · 250 DH maintenant · 200 DH sur place » / « 150 DH + consommation ».
- **Réductions** : abonnement, prix membre et codes promo s'appliquent **uniquement à la part organisation** ; les frais de service aussi. C'est déjà le cas techniquement (le calcul ne porte que sur le prix payé en ligne) : je le rends explicite partout (formulaire, fiche, récapitulatif, CGV).

## 3. Points du texte ChatGPT que j'adapte (à valider)

1. **Un 3e mode « tout payé en ligne »** est nécessaire : sans lui, les expériences existantes et celles organisées entièrement par The Host Club seraient forcées d'avoir une part partenaire. Migration : toutes les expériences actuelles passent automatiquement dans ce mode, sans changement de prix.
2. **Montants en centimes** (250 DH = 25 000), comme tout le site (factures, Stripe-like) — et non en dirhams entiers : évite les erreurs d'arrondi. `null` (et non 0) quand le montant partenaire est inconnu (consommation libre) ou sans objet.
3. **Pas de second champ « nom du partenaire »** : on reprend le partenaire de la section 4 ; si aucun partenaire n'est choisi, les modes A et B sont indisponibles.
4. **Commission (section 4)** : elle reste calculée sur la part payée en ligne. Si une commission doit porter sur la part payée au partenaire sur place, ce n'est pas encaissé par nous : il faudra la **facturer au partenaire** (hors site pour l'instant) — à confirmer.
5. **QR code et scan** : à ajouter (n'existe pas). Le scan se fait avec la caméra du téléphone de l'équipe ; en secours, recherche par nom / numéro de réservation (déjà possible).
6. **« Ne pas modifier rétroactivement »** : déjà garanti par la copie figée du prix dans chaque réservation ; j'ajoute la copie de la part partenaire et un avertissement dans le formulaire si des réservations existent.

## 4. Données (rétrocompatibles)

`experiences/{id}.pricing` (public) :
```
model: "online_only" | "fixed_partner" | "variable_consumption"
currency: "MAD"
organizerPrice: { amount, currency }      // = price actuel (gardé en double pendant la transition)
partner: { name, paymentMode: "on_site", pricingType: "fixed" | "consumption", price: { amount, currency } | null, description } | null
```
`reservations/{id}` :
- `pricing` (existant, montant en ligne : prix membre, promo, frais, total) — inchangé ;
- **nouveau** `partnerSnapshot` (copie figée : nom, type, prix unitaire ou `null`, description) ;
- **nouveau** `onSiteAmount` (prix fixe × places, ou `null`) et `partnerPaymentStatus` : `not_applicable` | `due_on_site` | `paid_on_site`.

Règles Firestore : inchangées dans le principe (écriture uniquement par le serveur) ; tests ajoutés.

## 5. Étapes proposées

| Étape | Contenu |
|---|---|
| **11a** | Modèle partagé + calcul (`pricing`, total affiché, part en ligne, part sur place), migration automatique (« tout en ligne »), tests unitaires |
| **11b** | Formulaire : section 5 « Tarification et paiement client » avec aperçu dynamique ; enregistrement serveur ; avertissement si réservations existantes |
| **11c** | Fiche expérience, cartes du catalogue, tunnel de réservation, récapitulatif, réservation (« billet »), e-mails et facture : « payé en ligne » / « à régler sur place » |
| **11d** | Billet avec **QR code** ; page équipe : scanner, vérifier, marquer présent, marquer la part partenaire réglée (prix fixe seulement) |
| **11e** | Tableau de bord : encaissé en ligne, part partenaire attendue sur place (prix fixe uniquement), réglée sur place, présents, annulations/remboursements ; filtres événement / partenaire ; export CSV |
| **11f** | Tests complets (deux formules + « tout en ligne », promos, abonnement, annulations, anciennes expériences) et mise en ligne |

## 6. Paiement — remplace l'étape 5h

**Phase 1 — Virement bancaire (maintenant)**
- À la réservation : la place est réservée en attente de virement avec une **référence unique** à indiquer ; le RIB s'affiche (Rita le fournira quand je le demanderai).
- **Validation manuelle** par l'équipe dans le back-office (« Virement reçu ») → réservation confirmée → **billet et QR code** envoyés.
- Délai de virement (hypothèse : 48 h, et au plus tard 24 h avant l'expérience), sinon la place est libérée et proposée à la liste d'attente.
- Coût de passerelle : 0 DH. Facture émise à la validation.

**Phase 2 — Avant les premières ventes régulières (actions de Rita, hors code)**
- Ouvrir un **compte bancaire professionnel** au nom de la société.
- Faire valider le **modèle d'encaissement** (part organisation seulement ; part partenaire jamais encaissée).
- Établir les **contrats partenaires**.

**Phase 3 — Quand le marché est validé : ChariPay (carte)**
- Nouveau prestataire derrière l'interface de paiement existante ; confirmation **automatique** par notification serveur ; moins de vérifications manuelles.

## 7. Autre demande notée

- **Page « Comment ça marche »** : l'afficher comme la section de l'accueil (cartes décalées, icônes des univers, photos), au lieu de la mise en page actuelle.

## 8. Livré — étape 11 (8 novembre)

### Ce que voit chacun
| Qui | Où | Ce qui change |
|---|---|---|
| Équipe | Formulaire d'expérience | « 3. Format » garde le format ; **« 5. Tarification et paiement client »** (après « 4. Partenaire et économie », inchangée) : tout en ligne / prix fixe chez le partenaire / consommation libre ; prix organisation et prix membre (en ligne), prix partenaire (prix fixe), « ce qui est réglé sur place » ; **aperçu client en direct** ; formules sur place grisées sans partenaire ; avertissement « N places déjà réservées : leur prix est figé ». Dates → 6, photos → 7 |
| Client | Cartes, fiche, tunnel | Prix fixe : **« 139 DH »** puis « 59 DH maintenant · 80 DH sur place » ; consommation : **« 120 DH + consommation »** (jamais de faux total) ; prix membre barré sur la seule part en ligne ; encadré « Comment se règle cette expérience » ; bloc « À régler sur place » dans le tunnel. Le nom du partenaire n'est pas affiché tant que le lieu est secret (« au lieu partenaire ») |
| Client | Réservation, e-mail, facture | « Payé en ligne » + « À régler sur place » (puis « Réglé sur place ») ; **billet avec QR code** et code court ; e-mail de confirmation : part sur place + « Voir mon billet » ; facture : mention **« Hors facture — … Montant non encaissé par The Host Club »**, total = montant payé en ligne |
| Client | CGV, article 2 (FR / EN / AR) | Paragraphe sur les deux parts : part sur place jamais encaissée, non due si la réservation est annulée ; réductions et frais sur la part en ligne seulement |
| Équipe | **Billets (scan)** | Le QR ouvre `/admin/billets/{réservation}` (connexion équipe requise) : « Billet valide / déjà pointé / non valable », alerte si ce n'est pas le bon jour, **Marquer présent** (3 h avant), **Part partenaire réglée**. Secours : recherche par code, nom ou e-mail |
| Équipe | Page d'une date | Colonne « Sur place » (montant ou « Conso. », à régler / réglée), bouton « Part partenaire réglée », résumé « X DH attendus · n / m réglées », export CSV enrichi |
| Équipe | **En ligne / sur place** | Encaissé en ligne (net des remboursements), sur place attendu (prix fixe uniquement), sur place réglé, présents / absents / annulations ; une ligne par date ; filtres expérience, organisateur (partenaire ou The Host Club), période ; export CSV journalisé |

### Données (Firestore)
- `experiences/{id}.pricing` : `{ model, currency, partner: { name, paymentMode: "on_site", pricingType, price | null, description } | null }`. Absent = « tout en ligne » (aucune migration à lancer : lecture rétrocompatible).
- `reservations/{id}` : `partnerSnapshot` (copie figée), `onSiteAmount` (centimes ou `null`), `partnerPaymentStatus` (`not_applicable` | `due_on_site` | `paid_on_site`), `partnerPaidAt`, `partnerPaidMarkedBy`.
- `invoices/{id}.onSiteNote` (texte « hors facture »).
- Nouvelle fonction `adminSetPartnerPayment` (équipe, journalisée) ; `adminLogExport` accepte `two_part`.
- **Règles de sécurité : inchangées** (ces champs ne sont écrits que par le serveur ; tests ajoutés).

### Tests
- Unitaires : 72 (dont calcul des deux parts, totaux du tableau de bord, billet).
- Émulateurs : 122 (prix fixe, consommation, tout en ligne, copie figée après changement de prix, **prix membre + code promo sur la seule part en ligne**, part partenaire réglée par l'équipe uniquement).
- De bout en bout sur émulateurs : `tests/e2e/firebase-tarification.e2e.cjs` (30 vérifications : fiche → tunnel → paiement → billet QR → facture → scan équipe → part réglée → tableau de bord → formulaire).
- Démo : blog-accueil, aide, back-office, espace-membre (234 vérifications).

### Fichiers
`packages/shared/src/{two-part,ticket,experience-input,types,index}.ts` (+ tests) · `functions/src/{experiences/save-experience, reservations/reservation-doc, admin/reservations-admin, invoices/{issue,pdf,types}, mail/templates, index}.ts` · `apps/web/components/{price-tag, experience-card, booking/booking-form, admin/{experience-form, reservation-admin-actions, ticket-actions, admin-nav, csv-export}}.tsx` · `apps/web/app/[locale]/{experiences/[slug], reserver/[sessionId], espace/reservations/[id]}/page.tsx` · `apps/web/app/admin/{billets, billets/[id], encaissements, sessions/[id], experiences/[id]}/page.tsx` · `apps/web/lib/{admin-forms, data/demo, data/demo-admin, data/admin-firestore}.ts` · `apps/web/messages/{fr,en,ar}.json` · `apps/web/content/{legal,legal-ar}.ts` · `firebase/tests/reservations.test.ts` · `tests/e2e/firebase-tarification.e2e.cjs`.

### Démonstration
« Brunch entre inconnus » : 59 DH en ligne + 80 DH sur place (139 DH) ; « Rooftop au coucher du soleil » : 120 DH + consommation.

### Actions manuelles (Rita)
- Rien à migrer : les expériences existantes restent « tout en ligne ».
- Pour chaque expérience avec un partenaire : choisir la formule dans la section 5 et décrire ce qui est réglé sur place.
- Une commission sur la part payée sur place (si prévue au contrat) se **facture au partenaire**, hors site.
- Sur le téléphone de l'équipe : se connecter une fois au back-office ; le scan se fait avec l'appareil photo.

## 9. Livré — 5h, phase 1 : virement bancaire (8 novembre, sans RIB)

### Parcours
1. **Super-admin → Paramètres → Mode de paiement** : « Paiement de test » ou « Virement bancaire ». Le virement exige le titulaire, la banque et le **RIB (24 chiffres)** ; IBAN et SWIFT facultatifs ; délai (48 h) et limite avant l'expérience (24 h) réglables. **Tant que le RIB n'est pas saisi, le site reste en paiement de test.**
2. **Client** : « Réserver et payer … par virement » → page **Payer par virement** : montant, **référence unique** (THC-XXXXXX, boutons « Copier »), coordonnées bancaires, échéance, 3 étapes ; même contenu **par e-mail**. Sa réservation affiche « En attente de votre virement ». Si l'échéance tomberait à moins de 4 h, la réservation par virement est fermée pour cette date (message clair).
3. **Équipe → Virements** : virements à valider (recherche par référence, nom ou e-mail ; échéances dépassées signalées) → **« Virement reçu »** (confirmation dans la page avec montant et référence) → réservation confirmée, **billet QR, facture et e-mail** (même traitement que la confirmation d'un prestataire).
4. **Virement non reçu** : la place est libérée à l'échéance et proposée à la liste d'attente ; la personne reçoit un e-mail. Un virement arrivé ensuite et validé redonne la place s'il en reste, sinon il est remboursé.
5. **Remboursement** (annulation, virement tardif sans place) : il apparaît dans **« Remboursements à faire »** ; l'équipe fait le virement retour depuis le compte de la société (coordonnées demandées à la personne, **jamais enregistrées**), puis **« Remboursement effectué »** → avoir et e-mail. Le client voit « Remboursement en cours » d'ici là.
6. **Abonnement** : même virement (échéance indicative 7 jours), activé à la validation.

### Données et sécurité
- `settings/payment` = `{ provider: "bank_transfer", mode: "live" }` ; `settings/bankTransfer` (lisible par l'équipe seulement, comme tous les réglages).
- `payments/{id}` : `reference`, `transferDeadline`, `receivedBy`, `receivedAt` ; remboursement : `completedBy`, `completedAt`.
- `reservations/{id}` : `paymentMethod: "bank_transfer"`, `transferReference`, `holdExpiresAt` = échéance.
- `transferRefs/{référence}` : garantit l'unicité (création atomique) ; aucun accès depuis le navigateur.
- Fonctions : `adminConfirmTransfer`, `adminCompleteManualRefund` (admins), `adminSavePaymentSettings` (super-admin) — toutes journalisées (RIB masqué dans le journal). Le montant validé est toujours celui calculé par le serveur.
- Règles Firestore : inchangées (tout est écrit par le serveur).

### Tests
- Unitaires : référence, échéance (48 h / 24 h / trop proche), validation du RIB.
- Émulateurs (5) : référence unique et même référence au second essai, place bloquée 48 h, e-mail ; un membre ne peut pas se valider ; validation → confirmée + facture ; date trop proche refusée, échéance à 24 h avant ; échéance dépassée → place libérée + e-mail, virement tardif → place reprise ; remboursement manuel → avoir ; réglages super-admin seulement, RIB exigé.
- De bout en bout : `tests/e2e/firebase-virement.e2e.cjs` (29 vérifications).
- CGV (article 3) et aide « Payer ma réservation » mises à jour en FR / EN / AR.

### Hypothèses à valider
- Délai 48 h et limite 24 h avant l'expérience (réglables) ; virement fermé si moins de 4 h pour virer.
- Abonnement : échéance indicative de 7 jours.
- Pas encore de **rappel automatique** avant l'échéance (à ajouter si utile : e-mail 12 h avant).

### Action de Rita
- Une fois le compte professionnel ouvert : **Paramètres → Mode de paiement → Virement bancaire**, saisir titulaire, banque, RIB (et IBAN / SWIFT si clients à l'étranger), enregistrer. Rien d'autre à faire.
