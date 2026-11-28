# 24 — Audit du parcours membre (23 novembre 2026) : corrections faites et ce qu'il reste à brancher

L'audit a suivi un membre de bout en bout : inscription, choix de l'événement, réservation, paiement, lieu et adresse,
check-in, chat de table, soirée, avis, signalement, Carnet et Pass, annulation (par le membre ou l'équipe),
remboursement, changement de date. Ce document liste ce qui a été corrigé (lots 1 à 7), les décisions prises et
**ce qu'il reste à faire de votre côté** pour activer Brevo, le CMI, Google et WhatsApp.

Les tests de chaque correction sont dans `firebase/tests/audit-fixes.test.ts` (émulateurs) et
`packages/shared/src/audit-rules.test.ts` (règles partagées).

## Décisions validées

| Sujet | Décision |
|---|---|
| Questionnaire d'inscription | Gardé tel quel (nécessaire à la composition des groupes). |
| Check-in | Pas de code ni de QR (pas de chevalet sur les tables) ; notification « Vous êtes arrivé·e ? » à l'heure du début. |
| Chat | En direct, 300 derniers messages ; pas de signalement de message. |
| Suspension d'un compte | Réservations à venir annulées et remboursées intégralement ; « sans rembourser » possible en cas de faute grave. |
| Gel après signalements | 2 personnes différentes en 90 jours → plus de nouvelle réservation ; l'équipe décide pour les réservations déjà prises et peut lever le gel. |
| Annulation tardive | Place incluse dans le Pass annulée à moins de 24 h = absence (avertissement, puis suspension). Jamais quand l'équipe annule. |
| Changement de date | Possible jusqu'à la fermeture des réservations ; le remboursement d'une annulation ultérieure se calcule sur la date d'origine. |

## Ce qui a été corrigé

### Lot 1 — Failles et sécurité
- **Changement de date** : date de référence du remboursement (`reservations.refundBasisAt`), capacité réelle des lieux
  vérifiée sur la nouvelle date, adresse de l'événement proposé, la personne quitte sa table.
- **Annulation / exclusion** : la personne est retirée de sa table (`memberIds`, `arrivedUids`) dans la même
  transaction ; elle ne voit plus le groupe et ne peut plus lire ni écrire dans le chat (serveur et règles Firestore).
- **Suspension** : réservations à venir annulées (et remboursées sauf faute grave), listes d'attente et demandes closes.
- **Signalement** depuis la réservation, de 1 h avant le début à 30 jours après la fin, pour tous les formats ; la
  personne se choisit dans sa table ou se décrit ; accusé de réception (notification + e-mail) ; alerte « URGENT » à
  l'équipe pendant l'expérience ; gel automatique au 2e signalant (Back-office → Signalements : « Lever le gel »).
- **Inscription** : l'événement choisi est gardé (connexion ↔ inscription → questionnaire → « Continuer ma
  réservation ») ; le lien de confirmation d'e-mail y ramène aussi ; **connexion Google**.
- **Liste d'attente** : âge minimum, public, questionnaire et conditions des activités physiques exigés à l'inscription
  sur la liste ; l'accord suit la place proposée.

### Lot 2 — Paiement, Carnet, Pass, remboursements
- Pass : ne couvre que les événements **pendant sa période** ; limite de 2 réservations à venir aussi pour la liste d'attente.
- Annulation à moins de 24 h d'une place du Pass = absence ; messages clairs avant d'annuler (crédits rendus ou perdus,
  absence du Pass).
- Paiement tardif : les crédits du carnet rendus à l'expiration sont repris.
- Remboursements : un échec du prestataire ne fait plus échouer l'annulation ; **relance automatique toutes les heures**
  (3 essais, puis alerte équipe et e-mail « remboursement en cours ») ; un remboursement manuel (virement, CMI) marqué
  effectué passe la réservation « remboursée ».
- Remboursement total accordé **avant** l'expérience : la place est libérée et proposée à la liste d'attente.
- **« Me rétracter »** (page Carnet et Pass) : dans les 7 jours, si rien n'a servi ; remboursement intégral et avoir.

### Lot 3 — Jour J, lieu, chat
- Coordonnées GPS copiées aussi sur les places payées. Rattrapage des réservations existantes :
  `GOOGLE_APPLICATION_CREDENTIALS=… npx tsx scripts/backfill-venue-geo.ts --project <id> [--confirm]`.
- La vraie ville dans les rappels, les e-mails et la page de réservation (plus de « Casablanca » écrit en dur).
- « Vous êtes arrivé·e ? » à l'heure du début (notification + e-mail), à qui n'a pas fait son check-in.
- Chat de table en direct (écoute Firestore), 300 derniers messages.

### Lot 4 — Avis
- File de modération : 2 étoiles ou moins, mot sensible (liste par défaut FR / darija / arabe / EN, complétée dans
  `settings/reviews.sensitiveWords`) ou numéro de téléphone → « À valider » (Back-office → Avis). Non compté dans la
  note tant qu'il attend ; publié s'il respecte les règles, même négatif.
- Avis possible après un remboursement accordé après coup (pas après une annulation avant le jour J).

### Lot 5 — E-mails (prêts pour Brevo) et invitations agenda
Nouveaux e-mails (FR, AR, EN), visibles dès maintenant dans Back-office → E-mails (boîte d'envoi de test) :

| Type (`mail.kind`) | Quand |
|---|---|
| `reservation_cancelled_by_team`, `session_cancelled` | Annulation par l'équipe (réservation, date entière, suspension) — avec une invitation agenda « annulée » |
| `waitlist_offer` | Place libérée proposée depuis la liste d'attente (4 h pour payer) |
| `change_date_self`, `change_date`, `change_venue` | Changement de date (par le membre ou l'équipe) ou de lieu — avec l'invitation agenda à jour |
| `venue_revealed`, `group_revealed` | Lieu ou groupe révélé — avec l'invitation agenda à jour |
| `reservation_invoice` | Confirmation et reçu — avec l'invitation agenda |
| `arrival_check` | « Vous êtes arrivé·e ? » à l'heure du début |
| `refund_pending` | Remboursement bloqué après 3 essais |
| `membership_withdrawal` | Rétractation confirmée |
| `report_received` | Accusé de réception d'un signalement |
| `late_cancel_warning`, `pass_suspended` | Annulation tardive d'une place du Pass |

L'invitation agenda (`.ics`) garde le même identifiant par réservation : Google Agenda et le calendrier de l'iPhone
mettent à jour l'événement existant au lieu d'en créer un second.

### Lot 6 — Paiement par carte (CMI), prêt à brancher
- Adaptateur `cmi` (3D Pay Hosting) : champs signés par le serveur (signature « ver3 », SHA-512), page
  `/paiement/cmi/{id}` qui les envoie au CMI ; aucune donnée de carte chez Wenzy.
- Adresse de retour serveur **`cmiCallback`** : signature vérifiée, puis même traitement que les autres moyens de
  paiement (idempotence, montant vérifié, place confirmée ou remboursement automatique si elle n'existe plus).
- Retour du navigateur `/api/cmi/retour` : n'accorde rien (seule la notification serveur fait foi).
- Back-office → Paramètres → Paiement : « Carte bancaire (CMI) », environnement de test du CMI ou réel.
- Remboursements CMI : à faire depuis l'espace commerçant CMI, puis « Marquer effectué » dans Remboursements.

### Lot 7 — Textes
CGV, Sécurité et Règles de la communauté (FR, EN, AR) alignés sur les nouvelles règles : changement de date, période
du Pass, annulation tardive, bouton de rétractation, gel après signalements, modération des avis.

## Ce qu'il reste à faire de votre côté

### 1. Brevo (e-mails réels)
1. Compte Brevo et **domaine d'envoi authentifié** (enregistrements SPF, DKIM et DMARC de `wenzy.ma`), sinon les
   e-mails finissent en indésirables.
2. Clé d'API en **secret Cloud** : `firebase functions:secrets:set BREVO_API_KEY` (ne jamais l'envoyer dans le chat).
3. Dans `functions/.env.<id-du-projet>` : `BREVO_ENABLED=true`, puis redéployer les fonctions.
4. Dans Firestore, `settings/email` : `{ provider: "brevo", fromEmail: "bonjour@wenzy.ma", fromName: "Wenzy" }`.
5. Envoyer un e-mail de test (une réservation de test) et vérifier sa réception.

### 2. CMI (carte bancaire)
1. Contrat CMI et identifiants du magasin : `firebase functions:secrets:set CMI_CLIENT_ID` puis `CMI_STORE_KEY`.
2. **Avant** d'activer : dans Google Cloud (IAM du projet), donner au compte de service de déploiement (celui de
   GitHub Actions) le rôle **« Cloud Functions Admin »**. Sans ce rôle, le déploiement de la fonction publique
   `cmiCallback` échoue, et avec lui celui de toutes les fonctions.
3. Dans `functions/.env.<id-du-projet>` : `CMI_ENABLED=true`, puis redéployer (la fonction `cmiCallback` n'est
   déployée qu'à ce moment-là).
4. Donner au CMI l'adresse de retour serveur :
   `https://europe-west1-<id-du-projet>.cloudfunctions.net/cmiCallback`
   (ou la fixer avec `CMI_CALLBACK_URL` dans le même fichier `.env`).
5. **Comparer avec la documentation du CMI** : ordre et noms des champs, signature, texte de réponse attendu
   (`ACTION=POSTAUTH` / `FAILURE` dans `functions/src/payments/cmi-callback.ts`), type de transaction (`PreAuth`).
   Le code suit le format standard CMI ; un exemple signé fourni par le CMI se vérifie avec `cmiHashInput`.
6. Back-office → Paramètres → Paiement → « Carte bancaire (CMI) » en **Test CMI**, essais avec les cartes de test,
   puis passage en **Réel** une fois les essais validés par le CMI.

### 3. Connexion Google
Console Firebase → Authentication → Méthodes de connexion → **Google** : activer, renseigner l'e-mail d'assistance.
Vérifier que le domaine du site figure dans « Domaines autorisés ». (Dans les navigateurs intégrés d'Instagram,
WhatsApp ou TikTok, Google refuse la connexion : le site propose alors d'ouvrir la page dans le navigateur.)

### 4. WhatsApp (place libérée)
Modèle à faire valider par Meta, nom **`wenzy_place_liberee`** (catégorie « Utilitaire »), paramètres :
`{{1}}` prénom, `{{2}}` expérience, `{{3}}` date, `{{4}}` échéance, `{{5}}` lien.

> Bonjour {{1}}, une place s'est libérée pour « {{2}} » ({{3}}). Elle vous est réservée jusqu'au {{4}} : confirmez-la ici : {{5}}

Jeton : secret `WHATSAPP_TOKEN` + `WHATSAPP_ENABLED=true` ; envoi réel dans Back-office → Paramètres → WhatsApp.
En attendant, les messages sont rangés dans la boîte d'envoi WhatsApp (envoi à la main depuis le lien prérempli).
Seules les personnes qui ont accepté WhatsApp dans leur profil reçoivent ce message.

### 5. Après la mise en ligne
- Lancer une fois `scripts/backfill-venue-geo.ts` (coordonnées GPS des réservations à venir).
- Faire relire par l'avocat les ajouts aux CGV (rétractation, annulation tardive, gel après signalements).

## Limites connues
- Les notifications « push » sur téléphone n'existent pas encore : notification dans l'espace membre + e-mail.
- Le check-in reste déclaratif (sans code), comme décidé.
- La liste de mots sensibles des avis est un point de départ : à compléter dans `settings/reviews.sensitiveWords`.
