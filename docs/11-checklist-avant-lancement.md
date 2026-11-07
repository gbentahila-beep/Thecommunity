# 11 — Ce que Rita doit faire avant la mise en ligne

> Liste d'actions **non techniques** (ou de création de comptes) à mener en parallèle du développement.
> Cochez au fur et à mesure (`- [x]`). Les explications détaillées sont dans [09 — Démarches avant lancement](09-demarches-lancement.md).
> Ce document n'est pas un avis juridique ni fiscal : les étapes juridiques sont à valider avec un expert-comptable et un avocat.

**Légende :** 🔴 bloque l'ouverture au public · 🟠 nécessaire avant une phase de développement · 🟢 recommandé

## Par où commencer (chemin critique)

```
1. Expert-comptable ──► 2. Société ──► 3. Compte bancaire ──► 4. Contrat de paiement ──► Paiements réels
                                  └──► 5. CNDP (déclarations + transfert UE) ──────────► Ouverture au public
```

Les étapes 1 à 4 prennent souvent **plusieurs semaines chacune** : c'est ce qui décidera de la date de lancement, pas le développement. **À démarrer dès maintenant.**

---

## A. Société et comptabilité (décision D2) 🔴

- [ ] **Prendre rendez-vous avec un expert-comptable** au Maroc.
- [ ] Lui poser ces questions :
  - [ ] Quelle forme juridique choisir ? *(Recommandation : SARL ou SARL à associé unique dédiée au projet. Auto-entrepreneur déconseillé.)*
  - [ ] Quel **objet social** prévoir ? *(Organisation d'événements et d'activités de loisirs, vente de places, intermédiation avec des partenaires, édition d'une plateforme numérique.)*
  - [ ] **Modèle d'encaissement** : la société revend-elle les places en son nom (elle achète la prestation au restaurant), ou encaisse-t-elle pour le compte du partenaire contre une commission ? Le second cas peut être réglementé.
  - [ ] Quelle **TVA** s'applique aux places vendues et aux commissions ? Que doit contenir un reçu ?
  - [ ] Randonnées, food tours ou excursions relèvent-ils de **règles du tourisme** (guides, agrément) ?
  - [ ] Qui sont les **associés**, et dans quelles proportions ?
- [ ] **Créer la société** (certificat négatif, statuts, registre du commerce, identifiant fiscal, ICE, taxe professionnelle, CNSS). Le comptable s'en charge généralement.
- [ ] Me communiquer la **raison sociale, l'adresse du siège et l'ICE** : ils doivent apparaître dans les mentions légales et sur les reçus.

## B. Banque 🔴

- [ ] Choisir la banque **en fonction de son offre de paiement en ligne** (contrat e-commerce via le CMI). Le demander dès le premier rendez-vous.
- [ ] Ouvrir le **compte bancaire professionnel** de la société.

## C. Paiement en ligne 🔴 (🟠 dès la phase 5 pour l'environnement de test)

- [ ] Demander une offre à **au moins trois prestataires** : CMI (via la banque), Payzone, YouCan Pay.
- [ ] Poser à chacun les mêmes questions :
  - [ ] Pièces exigées et délai d'activation
  - [ ] Commission par paiement (cartes marocaines / étrangères), frais fixes, frais d'installation
  - [ ] Remboursements, y compris **partiels**, possibles automatiquement ?
  - [ ] **Notification serveur sécurisée** (webhook / callback signé) ?
  - [ ] **Environnement de test** (sandbox) disponible ?
  - [ ] Délai de versement de l'argent sur le compte
  - [ ] 3D Secure, Apple Pay / Google Pay
- [ ] Comparer, choisir, **signer le contrat**.
- [ ] Obtenir les **accès de test** du prestataire. Ne pas me les envoyer dans la conversation : je te dirai où les enregistrer de façon sécurisée.
- [ ] Faire passer l'**homologation du site** par le prestataire (ils vérifient CGV, mentions légales, prix en dirhams, contact).

## D. Protection des données — CNDP (loi 09-08) 🔴

> À faire **au nom de la société** (donc après A), et **avant l'ouverture au public**.

- [ ] Choisir un **conseil** (avocat ou cabinet spécialisé CNDP), ou faire les démarches en ligne sur cndp.ma.
- [ ] Déposer la **déclaration des traitements** : comptes clients, réservations et paiements, prospection commerciale (newsletter), formulaire de contact.
- [ ] Déposer la **demande de transfert de données vers l'Union européenne** (hébergement Google Cloud en Belgique).
- [ ] Vérifier sur cndp.ma le **délai d'instruction** actuel (un cabinet évoque 30 jours, à confirmer).
- [ ] Valider les **durées de conservation** des données. *(Proposition : comptes inactifs 3 ans, journaux techniques 12 mois, données comptables selon la loi.)*
- [ ] Désigner la **personne qui traite les demandes** des utilisateurs (accès, suppression de compte).
- [ ] Conserver les **récépissés** de la CNDP.

## E. Textes juridiques 🔴

> Je peux préparer des **projets** de ces textes à partir du fonctionnement réel du site ; ils devront être relus et validés par un avocat.

- [ ] Conditions générales d'utilisation (CGU)
- [ ] Conditions générales de vente (CGV), avec la politique d'annulation 48 h
- [ ] Politique de confidentialité (loi 09-08)
- [ ] Politique cookies
- [ ] Charte de bonne conduite des participants
- [ ] Mentions légales (raison sociale, siège, ICE, contact, hébergeur)
- [ ] Modèle de **convention partenaire** : prix, commission, annulation, responsabilités, photos

## F. Marque, domaine et e-mail 🟠

- [ ] Vérifier la disponibilité de **« The Community »** auprès de l'**OMPIC**. Classes à étudier avec le conseil : 41 (événements, loisirs), 43 (restauration), 35 (vente / mise en relation), 9 (application).
- [ ] **Déposer la marque** si elle est disponible. Sinon, me prévenir : le nom est facile à changer dans le site.
- [ ] Réserver le **nom de domaine** : `.ma` (via un bureau d'enregistrement agréé) et idéalement un `.com`.
- [ ] Créer une **adresse e-mail professionnelle** sur ce domaine (contact@…). Je te donnerai les réglages techniques (SPF, DKIM, DMARC) pour que les e-mails de réservation n'arrivent pas en spam.
- [ ] Réserver les **comptes réseaux sociaux** (Instagram, TikTok, Facebook) au même nom.
- [ ] Me communiquer l'adresse de contact définitive (remplace `contact@thecommunity.ma`, actuellement provisoire).

## G. Comptes techniques à créer 🟠 (avant la phase 3)

> Je te guiderai pas à pas le moment venu. **Ne partage jamais tes mots de passe** : je n'en ai pas besoin.

- [ ] Créer un **compte Google dédié au projet** (pas ton compte personnel), idéalement à l'adresse professionnelle.
- [ ] Créer **deux projets Firebase** : un de test (dev) et un réel (prod).
- [ ] Activer la **facturation** (plan Blaze) avec une **alerte de budget** (ex. 20 €/mois au début).
- [ ] ⚠️ **Ne pas créer la base Firestore soi-même** : son emplacement est définitif. On la crée ensemble, en Europe (Belgique).
- [ ] Relier le dépôt GitHub à **Firebase App Hosting** (dans la console Firebase).
- [ ] Créer un compte chez le **service d'envoi d'e-mails** (proposition : Brevo).
- [ ] Activer la **double authentification** sur les comptes Google, GitHub et Brevo.

## H. Contenu et partenaires 🔴

- [ ] Signer avec les **premiers partenaires** : restaurants, studio de Pilates/yoga, escape game, atelier céramique ou cuisine.
- [ ] Pour chacun, rassembler : nom, adresse, contact, prix, coût par place ou commission, capacité, conditions.
- [ ] Obtenir de **vraies photos** des lieux et des expériences, en bonne définition.
  - [ ] Avoir le **droit de les utiliser** (photographe ou partenaire).
  - [ ] Avoir l'**accord écrit des personnes reconnaissables** (droit à l'image).
- [ ] Rédiger ou valider les **descriptions** des expériences, puis leur **traduction en arabe**.
- [ ] Préparer le **calendrier** des premières sessions (4 à 6 semaines).
- [ ] Relire la **FAQ** et la page « À propos » du site.

## I. Organisation et sécurité des participants 🟠

- [ ] Qui répond au **support client**, sur quel canal (e-mail, WhatsApp) et à quelles heures ?
- [ ] **Procédure de signalement** : qui traite un signalement, sous quel délai, quand suspendre un compte.
- [ ] Un **hôte ou animateur** est-il présent sur place pour les dîners ?
- [ ] Quel **contact d'urgence** le jour de l'expérience (lieu ou participant absent) ?
- [ ] **Assurance responsabilité civile** organisateur d'événements.
- [ ] Règle interne pour les **gestes commerciaux** : remboursement exceptionnel, report.

## J. Juste avant l'ouverture (avec moi) 🔴

- [ ] Tester un **vrai paiement de petit montant**, puis son **remboursement**.
- [ ] Relire le site complet sur ton téléphone (français et arabe).
- [ ] Valider que le **mode démonstration est retiré** et que le site est **ouvert à Google**.
- [ ] Créer les **comptes administrateurs** de l'équipe (avec double authentification).
- [ ] Vérifier que les **sauvegardes** fonctionnent (je fais un test de restauration).
- [ ] Inscrire le site sur **Google Search Console**.
- [ ] Réunir les **récépissés CNDP**, le contrat de paiement signé et les textes juridiques validés.

---

## Calendrier indicatif

| Semaines | Toi | Développement |
|---|---|---|
| 1–3 | Comptable, création de la société, vérification de la marque et du domaine | Phase 2 : espace utilisateur et back-office |
| 3–6 | Banque, demandes aux prestataires de paiement, comptes Google / Firebase, premiers partenaires | Phases 3–4 : Firebase, comptes, réservations |
| 6–10 | Contrat de paiement, CNDP, textes juridiques, photos | Phase 5 : paiement en mode test |
| 10+ | Homologation, récépissés CNDP, calendrier des sessions | Phases 6–8 : groupes, notifications, tests, ouverture |

Les délais dépendent des administrations, de la banque et du prestataire de paiement.
