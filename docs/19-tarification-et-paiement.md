# 19 — Tarification en deux parts et paiement (plan, 8 novembre 2026)

Demande de Rita : séparer **ce que le client paie en ligne** (part organisation) de **ce qu'il paie sur place au partenaire** (prix fixe ou consommation libre). Les réductions (abonnement, codes promo) ne portent **que sur la part organisation**. Texte de travail rédigé avec ChatGPT : on en garde le principe, adapté à l'architecture réelle. Rien n'est codé avant le « go ».

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
