# 22 — Refonte v2 : un seul modèle pour tout le site (22 novembre 2026)

Plan complet après le brainstorm du 22 novembre. Remplace les choix contraires des docs 16, 19 et 20.
Rien n'est encore codé : ce document sert de référence pour chaque lot.

---

## 1. Décisions validées

| # | Décision |
|---|---|
| 1 | **Prix à l'unité : 35 DH** affichés (30 DH Wenzy + 5 DH de frais), un seul chiffre partout. |
| 2 | **Abonnements** : on supprime le « –15 % ». On garde un **Carnet 3 sorties** et un **Pass illimité** (1 semaine, 1, 3, 6 ou 12 mois). |
| 3 | Le pass (et le carnet) couvre aussi les frais des **activités d'organisateurs**. |
| 4 | Frais Wenzy sur les activités d'organisateurs : **30 DH + frais, comme partout** (35 DH). |
| 5 | **Garde-fous** : 2 réservations à venir au maximum ; une absence (pas de check-in) donne un avertissement, une deuxième suspend le pass 2 semaines. |
| 6a | **Pas assez d'inscrits** pour une table complète à la fermeture : chaque inscrit **choisit** entre une autre date et le remboursement. |
| 6b | **Nombre qui ne tombe pas juste** (ex. 7 inscrits pour des tables de 4 à 6) : le logiciel propose une table de 7, **l'admin valide à chaque fois**. |
| 6c | **Lieu secret par défaut.** |
| 6d | **Accès anticipé des abonnés** (choix de Claude) : quand une date est mise en ligne, seuls les abonnés peuvent réserver pendant X jours (réglé à la création ; 0 = ouvert à tous tout de suite). Ensuite tout le monde peut réserver. Les autres voient l'événement avec « Ouvre à tous le … ». |
| 7 | **Modèle « format récurrent + dates »** : on crée un rendez-vous une fois, puis on ajoute des dates en quelques secondes. |
| 8 | **Sur l'appli, on ne paie que les frais Wenzy.** Tout le reste se paie **sur place** (sans préciser cash ou carte : « à régler sur place »). |
| 9 | **Au lancement, c'est Wenzy qui crée tout**, de tous les types (tables, ateliers, sport, soirées…). Les organisateurs viendront ensuite. |
| 10 | **Les membres de confiance sont supprimés.** |
| 11 | L'univers « Dîners » est **renommé** (proposition § 4) et couvre **Café, Brunch, Déjeuner, Dîner**. |
| 12 | Filtres de Découvrir : on **retire « Prix par place » et « Quartier »**, on **garde « Gamme du restaurant »**. |
| 13 | L'univers s'appelle **« Tables »** (§ 4). |
| 14 | **Codes promo : on les garde** (ex. première sortie offerte). Ils s'appliquent aux frais Wenzy. |
| 15 | **Lieu par date, au choix de l'admin** : même restaurant à chaque date ou restaurants différents ; un restaurant qui convient peut devenir le **lieu habituel** du rendez-vous (§ 7.3). |

---

## 2. Le principe en une phrase

> **Tu réserves ta place sur Wenzy pour 35 DH (ou avec ton pass), et tu règles sur place ce que tu consommes ou le prix de l'activité.**

Une seule mécanique pour **tous** les événements, qu'ils soient organisés par Wenzy ou par un organisateur :

| | En ligne (Wenzy) | Sur place |
|---|---|---|
| Brunch à menu fixe | 35 DH | Menu 120 DH, affiché sur la fiche |
| Dîner à la consommation | 35 DH | Consommation, budget indicatif affiché (ex. ≈ 100–150 DH) |
| Atelier ou sport à prix fixe | 35 DH | Prix de l'activité, affiché sur la fiche |
| Balade, quiz, rien à payer sur place | 35 DH | — |
| Avec un pass | 0 DH (« Inclus dans ton pass ») | idem |

Ce que ça supprime d'un coup : le paiement « tout en ligne », l'acompte, le prix membre, la marge par place, les reversements aux organisateurs, les commissions, le suivi « part partenaire réglée ». **Wenzy n'encaisse jamais l'argent de quelqu'un d'autre.**

Conséquence assumée : Wenzy ne paie plus jamais un lieu ou un prestataire à la place des participants.

---

## 3. Les rôles

| Rôle | Ce qu'il fait | Ce qui change |
|---|---|---|
| **Participant** | Réserve à l'unité (35 DH) ou avec un carnet ou un pass | Plus de « prix membre » |
| **Équipe Wenzy** | Crée les rendez-vous de tous types, choisit les lieux, vérifie les tables | Back-office réduit (§ 9) |
| **Organisateur** | Crée ses activités **avec le nom du lieu**, encaisse tout **sur place**. Wenzy ne fait que la plateforme : réservations, rappels, avis | Plus de modes A/B, de commission, de reversements, de page Finances avec virements |
| **Lieu partenaire** | Accueille les rendez-vous Wenzy. Son nom n'apparaît pas avant la révélation quand le lieu est secret | Fiche lieu avec capacité ; message automatique 1 h avant. Pas de compte au lancement |
| ~~Membre de confiance~~ | **Supprimé** | Retrait du statut, de « Proposer une sortie », des propositions, de la page admin « Propositions » |

---

## 4. L'univers « Dîners » devient « Tables »

**Validé : « Tables »** (FR et EN), « موائد » (AR). C'est court, ça marche pour le café comme pour le dîner, et c'est cohérent avec « On compose les tables ».
« Social Tables » est en anglais et reprend le vocabulaire d'un concurrent (Socials) : à éviter. Autres pistes possibles : « À table », « Tables & cafés ».

- **Sous-catégories (formats)** : Café · Brunch · Déjeuner · Dîner. Les sous-catégories existent déjà (étape 19).
- L'identifiant technique `eat` ne change pas : aucune adresse du site ne casse.
- À renommer partout : menu (`nav.dinners`), méta-description, sous-titre du catalogue, nom de l'univers, tuiles de l'accueil, blog, presse, aide, FAQ, e-mails, back-office (« univers Dîners »).

---

## 5. Abonnements : Carnet et Pass

| Offre | Prix | Par mois | Rentable dès |
|---|---|---|---|
| À l'unité | 35 DH | — | — |
| **Carnet 3 sorties** (1 offerte, valable 3 mois) | 70 DH | — | 3 sorties |
| Pass 1 semaine | 49 DH | — | 2 sorties |
| Pass 1 mois | 99 DH | 99 | 3 sorties par mois |
| Pass 3 mois | 249 DH | 83 | |
| **Pass 6 mois** (mis en avant) | 449 DH | 75 | |
| Pass 1 an | 790 DH | 66 | |

- **Page Abonnement** : trois offres visibles (Carnet, Pass 1 mois, Pass 6 mois), plus un lien « autres durées ». Le pass semaine est proposé au moment de payer.
- **Le pass comprend** : les frais Wenzy offerts sur tous les événements (Wenzy et organisateurs), l'accès anticipé (§ 1, 6d), l'accès aux événements « Abonnés uniquement », la priorité sur la liste d'attente.
- **Le carnet** : 3 crédits utilisables sur tous les événements. Il ne donne pas l'accès anticipé.
- **Avantages des lieux partenaires** (facultatif) : par exemple –10 % chez eux pour les abonnés. C'est un avantage offert par le lieu, pas de l'argent.
- **Garde-fous** : décision 5. Les absences sont détectées automatiquement grâce au check-in.
- **Paiement** : tant que le paiement se fait par virement (validation manuelle sous 48 h), on vend le carnet et les pass d'un mois et plus. Le pass semaine arrive avec le paiement par carte.
- **Migration** : chaque abonné actuel reçoit un pass de la durée qui lui reste.
- **Code existant réutilisé** : durées 1/3/6/12 mois, frais offerts, accès anticipé (`packages/shared/src/membership.ts`). À ajouter : la durée 7 jours, le carnet (crédits), la limite de réservations, les avertissements et suspensions. À retirer : le % de réduction et le prix membre.

---

## 6. Prix affiché

- **Cartes, listes, agenda** : « **35 DH** », et une petite mention grise « + sur place » seulement s'il y a quelque chose à payer sur place. Rien d'autre : plus de « 33 DH membres », plus de « + resto 100–150 DH ».
- **Fiche** : un encadré unique « Ce que tu paies », écrit une seule fois :
  - « En ligne : 35 DH (inclus dans ton pass) »
  - « Sur place : menu 120 DH » / « Sur place : ta consommation, ≈ 100–150 DH » / « Sur place : 150 DH pour l'activité »
- **Tunnel de réservation** : le même encadré, et rien de plus.
- **Abonné** : « Inclus dans ton pass » remplace le prix.

---

## 7. Créer un événement (équipe ; organisateur au § 10)

### 7.0 Partir d'un modèle

Toute création commence par **un modèle** qui pré-remplit tout, du titre au questionnaire, image comprise. On peut aussi partir de zéro. L'équipe crée ses propres modèles dans l'appli (**Paramètres → Modèles**, ou « Enregistrer comme modèle » depuis un événement). Le lieu partenaire se choisit tout de suite ou plus tard. **Liste complète des 46 modèles à valider : [docs/23](23-modeles-evenements.md).**

### 7.1 Format récurrent, puis dates
1. **Créer un rendez-vous** (une seule fois). C'est là qu'est tout le formulaire.
2. **Ajouter des dates** : date, heure, et éventuellement « répéter chaque semaine ». Rien d'autre.
3. **Page d'une date** (le travail de la semaine) : inscrits, lieux à renseigner, tables, check-ins.

### 7.2 Le formulaire, par type
On choisit d'abord le **type**, qui ne montre que ses propres champs :

| Type | Champs propres |
|---|---|
| **Tables** (café, brunch, déjeuner, dîner) | Taille des tables (min et max), nombre de tables (facultatif), lieu secret (par défaut) ou affiché, gamme, cuisine, ambiance, sur place (menu fixe ou consommation avec budget). Régime, allergies et langues demandés automatiquement. **Heure de début seulement.** |
| **Atelier** (Créer, Jouer, Découvrir) | Niveau, matériel fourni, à apporter, durée, prix sur place, groupes ou non |
| **Sport** (Bouger) | Niveau, à apporter, tenue, plein air, activité physique (cochée d'office), durée, prix sur place |
| **Soirée / sortie** | Tenue, alcool, consommation libre, durée |

Les 5 étapes : **Type → L'essentiel** (titre, accroche, description, photos ; arabe et anglais repliés) **→ Format et lieu → Sur place → Accès et dates**.

- **Accès** : « Ouvert à tous » / « Abonnés d'abord : X jours » / « Abonnés uniquement ».
- **Options avancées** (repliées) : inscription sur demande, réservé aux femmes, âge, langues, conditions d'annulation, places max par réservation (inchangé), hôtesse sur place.
- **Disparaissent du formulaire** : le prix (c'est le réglage global « Frais Wenzy »), le prix membre, le choix « comment le client paie », le bloc « ce que ça nous rapporte » (coût par place, commission), la taille cible, la durée pour les Tables, la capacité saisie dans « Dates » (elle se déduit des tables), le lien vers une proposition.
- **Questionnaire** : l'éditeur reste dans le formulaire.

### 7.3 Le lieu
- **Lieu affiché** : nom, adresse, carte dès la fiche.
- **Lieu secret** : rien sur la fiche, **pas même le quartier**. Seulement la cuisine, l'ambiance et la gamme.
- **Le lieu se renseigne pour chaque date, pas sur le rendez-vous.** On peut le faire à la création, plus tard, ou au plus tard 5 h avant. On peut en mettre **plusieurs**, chacun avec sa capacité en tables.
- Le choix se fait parmi les **lieux partenaires** (fiche avec capacité) ou en saisie libre.
- **Même restaurant ou restaurants différents, au choix de l'admin**, date par date :
  - **Lieu habituel** (facultatif) sur le rendez-vous : chaque nouvelle date est pré-remplie avec lui. Sans lieu habituel, chaque date attend son lieu.
  - En choisissant le lieu d'une date, une case **« Utiliser ce lieu pour toutes les prochaines dates »** (dates déjà pourvues non modifiées).
  - **Tester puis adopter** : après une date, sur sa page, l'admin note le lieu (« Ça s'est bien passé ? 👍 / 👎 ») et peut cliquer **« En faire le lieu habituel »**. Le rendez-vous devient alors hebdomadaire dans ce restaurant, jusqu'à ce qu'il le change.
  - Le lieu habituel reste secret pour les participants comme les autres (révélé 5 h avant).
- **Le lieu secret n'est jamais dans un document public de la base** (aujourd'hui le nom est lisible dans `experiences/{id}`) : il est rangé dans une partie privée de la date.

---

## 8. Le parcours d'un participant (Tables)

| Quand | Ce qui se passe |
|---|---|
| **Agenda / Découvrir** | « Mercredi 26 nov. · Dîner · 20h00 · 35 DH ». Icône de l'univers, pas de lieu ni de quartier |
| **Réservation** | Carte « billet » : date en grand, Début · Langue · Tables de 4 à 6, puis 🔒 « Le lieu et l'adresse arrivent 5 h avant ». « Réservations jusqu'à mer. 8h00 ». Choix **Moi seul·e / Moi + 1**. Carrousel « Comment on compose les tables », généré depuis les réglages (réponses, langue commune, 18 ans et plus, équilibre femmes et hommes, seul·e ou à deux, table découverte au check-in). Barre fixe « 35 DH · 1 place · Continuer » |
| **À propos de toi** | Régime, allergies, langues et questions de l'admin, pré-remplis d'après le profil. **Avant le paiement, et obligatoire** |
| **Paiement** | 35 DH, ou « Inclus dans ton pass », ou 1 crédit du carnet |
| **Confirmation** | « Le lieu arrive mer. 15h00 ». **Pas de QR code** |
| **12 h avant** | Fermeture des réservations (règle déjà dans le code mais invisible ; on l'affiche et on la rend réglable). Si le minimum n'est pas atteint, chaque inscrit choisit **autre date** ou **remboursement** (décision 6a) |
| **5 h avant** | Le logiciel répartit les participants entre les lieux, s'il y en a plusieurs. **Le lieu se révèle** dans la réservation : nom, adresse, carte, notification et e-mail |
| **1 h avant** | **Les tables sont composées automatiquement** dans chaque lieu (l'algorithme `composeGroups` existe déjà). Une table de 7 est proposée si besoin, à valider par l'admin (décision 6b). Le lieu reçoit le nombre de tables, les prénoms et les allergies |
| **30 min avant → 1 h après** | **Check-in** (« Je suis arrivé·e ») : on voit **sa table, les prénoms et qui est déjà arrivé**. La table n'est visible **qu'après le check-in** |
| **Après** | Pas de check-in = absence : avertissement, puis suspension du pass. Demande d'avis (existe déjà) |

**Lieu affiché** (ex. Pizza entre inconnus) : même parcours, avec le lieu, l'adresse et la carte visibles dès la fiche et dans la confirmation.

**QR code** : uniquement si « Hôtesse sur place » est coché, ou pour les activités d'organisateurs (l'organisateur pointe ses participants).

---

## 9. Le back-office

**Aujourd'hui** : environ 25 entrées de menu. **Demain** :

| Entrée | Contenu |
|---|---|
| **Aujourd'hui** | Les dates à venir et ce qu'il reste à faire : lieu à renseigner (relances à 24 h et à 8 h avant), tables à valider (table de 7), minimum non atteint, check-ins en cours |
| **Rendez-vous** | Les rendez-vous et leurs dates (création par type, § 7) |
| **Lieux partenaires** | Fiche : tables et places, jours possibles, gamme, cuisine, budget moyen, contact (WhatsApp), avantage abonnés |
| **Organisateurs** | Comptes, activités à valider |
| **Participants et abonnements** | Utilisateurs, pass, carnets, avertissements et suspensions |
| **Paiements** | Virements à valider, remboursements (seulement les frais Wenzy) |
| **Contenu** | Accueil, avis, aide, e-mails |
| **Paramètres** | Frais Wenzy (30 + 5 DH), offres carnet et pass, conditions d'annulation, catégories |

**Supprimés ou fusionnés** : Propositions, Commissions, Reversements, Encaissements (« en ligne / sur place »), Billets (scan) sauf pour les hôtesses, Promos (à garder seulement si utile pour le lancement).

---

## 10. Organisateurs

- Inscription, contrat et validation par l'équipe : **inchangés**.
- **Formulaire court** dans l'espace pro, avec les mêmes types qu'au § 7.2 mais **sans lieu secret ni tables composées** : lieu (nom, adresse, carte) obligatoire, prix payé sur place, nombre de places, dates.
- **Paiement** : le participant paie 35 DH en ligne (ou son pass), puis le prix **sur place à l'organisateur**.
- **Revenu de Wenzy** : les frais de réservation. L'organisateur ne paie rien à Wenzy.
- **Pointage** : l'organisateur pointe ses participants (liste ou QR code) depuis l'espace pro.
- **Annulation par l'organisateur** : Wenzy rembourse ses frais ; rien d'autre n'a été encaissé.
- **Espace pro** : « Finances » devient « Statistiques » (réservations, présents, avis). Plus de reversements ni de factures de commission.

---

## 11. Lieux partenaires

- Ils **accueillent** les rendez-vous Wenzy, sans créer d'événement.
- **Ce qu'ils y gagnent** : des tables pleines les soirs creux.
- **Ce qu'on peut leur demander**, au choix et hors site : une commission sur la consommation facturée au lieu, un avantage pour les abonnés, une mise en avant payante (Découvrir, bar d'après-dîner).
- **1 h avant** : message automatique (e-mail, puis WhatsApp) avec le nombre de tables, les prénoms et les allergies.
- Un lieu qui veut organiser ses propres événements devient aussi organisateur.
- La page « Devenir partenaire » propose deux portes : **accueillir nos tables** ou **publier vos activités**.

---

## 12. Découvrir et accueil

**Accueil**
- « Cette semaine à Casablanca » devient un **agenda par semaine** (Cette semaine / Semaine prochaine / Dans 2 semaines).
- Chaque ligne : icône de l'univers, date en gras, format, heure, et **35 DH à droite**. Pas de photo ni de quartier.

**Découvrir, les filtres**

| Filtre | Décision |
|---|---|
| Univers (pastilles) | Garder ; « Dîners » devient « Tables » |
| Format (Café, Brunch, Déjeuner, Dîner) | **Ajouter**, visible quand on choisit Tables |
| Quand ? / Jour | Garder |
| **Moment de la journée** (matin, midi, soir) | **Ajouter** : utile avec café, brunch, déjeuner et dîner |
| Gamme du restaurant | **Garder**, visible pour Tables |
| Seul·e / À plusieurs | Garder |
| Accessible aux débutants | Garder |
| Places disponibles | Garder |
| Réservé aux femmes | Garder |
| ~~Prix par place~~ | **Retirer** : c'est 35 DH partout |
| ~~Quartier~~ | **Retirer** : les lieux sont secrets |
| Tri | Garder Recommandées, Date, Mieux notées, Nouveautés. **Retirer** Prix croissant et décroissant |

- La recherche ne doit plus indexer le quartier (`catalog.ts:116`).
- Retirer « Maarif » de l'exemple de recherche.

---

## 13. Tout ce qui change sur le site, page par page

### 13.1 Corrections urgentes (fuites)
| Où | Problème |
|---|---|
| Fiche (`experiences/[slug]/page.tsx:270`) | Nom et adresse du lieu affichés même quand le lieu est secret |
| Fiche (`page.tsx:51` et `:205`) | Quartier dans le **titre de la page (référencement)** et dans les infos clés |
| Cartes et lignes (`experience-card.tsx:90`, `experience-row.tsx:62-66`, `compact-row.tsx`) | Quartier affiché ; pastilles « Resto … » et « Lieu surprise » |
| Recherche (`catalog.ts:116`) | Quartier indexé : on retrouve une expérience secrète en tapant son quartier |
| Base (`experiences/{id}.venue`) | Nom du lieu secret lisible publiquement |
| Billet (`booking.ts:182`) | QR code donné dès qu'il y a une part sur place, même en check-in seul |
| Questionnaire | Rempli après le paiement, et facultatif |

### 13.2 Pages publiques
| Page | À revoir |
|---|---|
| **Accueil** | « Comment ça marche » (« place confirmée dès le paiement » devient « 35 DH ou ton pass, le reste sur place ») ; « Travaillons ensemble » passe de **3 à 2 portes** (retirer « Membres de confiance ») ; texte organisateurs (« paiement en ligne pris en charge » devient « vous encaissez sur place ») ; FAQ de l'accueil (« notre équipe valide chaque composition », « que comprend le prix ») ; agenda ; univers renommé |
| **Comment ça marche** | Réécrire avec le nouveau parcours : réserver, lieu révélé 5 h avant, check-in, table |
| **Découvrir** | Filtres (§ 12), cartes (prix unique, sans quartier) |
| **Fiche expérience** | Encadré « Ce que tu paies », lieu, carrousel « Comment on compose les tables », accès abonnés |
| **Réserver** | Nouvel écran (§ 8), étape « À propos de toi » avant le paiement, carnet et pass |
| **Abonnement** | Carnet et Pass (§ 5) ; retirer prix membre et –X % |
| **Devenir partenaire** | Retirer « Le paiement, c'est nous… remboursements » ; deux portes (§ 11) |
| **Devenir organisateur** | Encaissement sur place, frais payés par le participant, plus de commission ni de reversements |
| **Page organisateur publique** | Inchangée sur le fond |
| **FAQ** | Prix, annulation (remboursement des frais), composition automatique, lieu secret, pass |
| **À propos, Presse** | « Dîners et gastronomie » devient « Tables » ; modèle économique |
| **Blog** | « Dîners & gastronomie » dans « wenzy-guide-complet » et « toutes-les-activites » ; **supprimer ou réécrire « proposer-votre-propre-sortie »** (membres de confiance) ; vérifier « comment-nous-composons-les-tables », « reserver-sa-premiere-experience », « le-questionnaire-avant-votre-experience » (le questionnaire passe avant le paiement), « diner-avec-des-inconnus » |

### 13.3 Espace membre
| Page | À revoir |
|---|---|
| **Proposer une sortie** (`espace/proposer`) | **Supprimer** |
| **Réservation** | Lieu révélé à l'heure prévue, sans billet si check-in seul, table visible après le check-in, choix « autre date / remboursement », questionnaire déplacé dans le tunnel |
| **Factures** | Montant des frais Wenzy seulement, mention « à régler sur place » |
| **Compte / profil** | Pass ou carnet : crédits restants, date de fin, avertissements |

### 13.4 Espace organisateur (`/pro`)
Formulaire court, modes de paiement retirés, Finances remplacée par Statistiques, pointage (Billets).

### 13.5 Back-office
Menu (§ 9) ; formulaire (§ 7) ; page d'une date (lieux, tables, check-ins) ; Abonnement (offres) ; retrait de Propositions, Commissions, Reversements, Encaissements.

### 13.6 Centre d'aide (FR / EN / AR)
| Article | Action |
|---|---|
| Comment fonctionne Wenzy ? | Réécrire |
| Réserver une place · Payer ma réservation | 35 DH ou pass, le reste sur place |
| Annuler une réservation et être remboursé | Remboursement des frais Wenzy, annulation libre jusqu'à la fermeture |
| Régime alimentaire, allergies et langues | Demandé avant le paiement |
| Comment fonctionne l'abonnement ? · Renouveler | Carnet et Pass |
| Devenir lieu ou organisateur partenaire · Nos critères | Deux portes |
| **Comment êtes-vous rémunéré ?** | Lieu : par ses clients, sur place. Organisateur : sur place. Plus de reversements |
| Espace organisateur | Encaissement sur place, pointage |
| Préparer l'accueil d'un groupe | Message automatique 1 h avant |
| Annulations et changements de date | Lieu par date, plusieurs lieux possibles |
| Combien vais-je payer pour un dîner ? | Devient « Combien vais-je payer ? » |
| **Nouveaux** | « Le lieu secret : quand est-il révélé ? » · « Le check-in et ma table » · « Pass et carnet » · « Absences et suspension du pass » · « Pas assez de participants : autre date ou remboursement » |

### 13.7 Documents juridiques (FR / EN / AR) : à faire relire
| Document | À revoir |
|---|---|
| **CGV** | Art. 2 Prix : seuls les frais Wenzy sont payés en ligne, le reste sur place (fixe ou consommation), plus de prix membre. Art. 3 : questionnaire avant paiement et obligatoire ; billet seulement avec hôtesse. Art. 4 : remboursement des frais, annulation jusqu'à la fermeture. Art. 5 : minimum non atteint, choix autre date ou remboursement. **Art. 6 : Carnet et Pass**, nouvelle règle de rétractation (on déduit les frais déjà utilisés). Art. 7 : absences et suspension du pass. Art. 8 : facture des frais seulement |
| **CGU** | Art. 3 (ce que fait Wenzy, ce que fait le lieu), art. 7 (composition automatique, lieu révélé 5 h avant, table au check-in), art. 9 (absences), art. 11 (retirer les propositions de sorties) |
| **Contrat organisateur** | Art. 4 : seulement l'encaissement sur place. **Art. 5 Commission et art. 6 Reversements : supprimés** (remplacés par les frais payés par le participant). Art. 7 : remboursements limités aux frais Wenzy. Art. 12 : responsabilité (elle n'est plus « limitée aux commissions ») |
| **Conditions de vente des activités des organisateurs** | Art. 1 : Wenzy n'encaisse plus au nom de l'organisateur (plus de mandat d'encaissement). Art. 2 : prix. Art. 3 : pointage par l'organisateur |
| **Confidentialité** | Données transmises au lieu 1 h avant (prénoms, allergies), check-in, questionnaire avant paiement, retrait des données « membre de confiance » |
| **Règles de la communauté** | « Les lieux partenaires », absences |
| **Sécurité** | Lieu révélé tard, retrouver sa table au check-in |

### 13.8 E-mails et notifications
| Message | À revoir |
|---|---|
| Confirmation de réservation | Sans billet en check-in seul ; « le lieu arrive à … » |
| Abonnement | Carnet et Pass |
| « Votre table est prête » | Devient « **Ton lieu est révélé** » (5 h avant). La table s'affiche au check-in |
| Rappels (veille, 3 h avant) | Veille + lieu révélé + « check-in à partir de 19h30 » |
| Changement de lieu ou de date | Lieu par date, plusieurs lieux |
| Messages aux organisateurs | Retirer reversements et commission |
| **Nouveaux** | Minimum non atteint (choix) · Absence, puis pass suspendu · Message au lieu 1 h avant · Alertes équipe « lieu à renseigner », « table de 7 à valider » |

### 13.9 Factures
Elles portent seulement sur les frais Wenzy. La mention « à régler sur place, non encaissé par Wenzy » reste. Les anciennes factures ne changent pas.

---

## 14. Données et code (repères pour le développement)

- **Réglage global « Frais Wenzy »** : 3 000 + 500 centimes. Plus de prix par expérience.
- **Modèles** : collection `eventTemplates/{id}` (mêmes champs qu'un rendez-vous, sans date ni lieu ; image ; actif ou masqué ; ordre). Les modèles validés de docs/23 sont créés au déploiement ; l'équipe les modifie ensuite dans l'appli.
- **Expérience** : `onSite { type: none | fixed | consumption, amount, budgetMin, budgetMax, description }`, `tables { min, max, maxTables? }`, `access { mode: open | early | members, earlyDays }`, `venueMode: shown | secret`. On retire `memberPrice`, `pricing.model`, `economicsModel`, `costPerSeat`, `commission*`, `paymentModel`, `depositPercent`, `proposalId`, et `groupTarget`.
- **Date** : `closesAt` (12 h avant, réglable), `revealAt` (5 h avant), `earlyAccessUntil`, et dans `sessions/{id}/private/venues` la liste des lieux (lieu partenaire ou saisie libre, nom, adresse, coordonnées, nombre de tables).
- **Automatisations** (une tâche planifiée toutes les 5 à 15 min, sur le modèle de `sendReminders`) : fermeture et minimum (12 h avant), relances « lieu à renseigner », répartition et révélation (5 h avant), composition des tables et message au lieu (1 h avant), absences (après la fin).
- **Check-in** : la table et les présents se lisent après son propre check-in.
- **Abonnement** : produits `carnet` (crédits) et `pass` (7, 30, 90, 180, 365 jours), limite de réservations, avertissements et suspension.
- **À supprimer** : propositions et `trustedHost` (fonctions, pages, règles de la base), reversements, commissions, encaissements, `adminSetPartnerPayment`, modes A et B des organisateurs.
- **Anciennes réservations** : leur prix figé reste lisible ; aucune facture n'est réécrite.
- **Règles de la base** : la partie privée des lieux n'est lisible que par l'équipe et, après la révélation, par chaque participant via sa réservation.
- **Tests** : mettre à jour ou retirer les tests de bout en bout liés aux fonctions supprimées (tarification en deux parts, reversements, propositions).

---

## 15. Le plan en lots

Chaque lot met à jour ses propres écrans, e-mails et articles d'aide. **Les documents juridiques (lot 6) doivent être en ligne en même temps que le nouveau modèle de prix.**

| Lot | Contenu | Dépend de |
|---|---|---|
| **0, corrections** | Fuites du lieu et du quartier (fiche, cartes, référencement, recherche, base) ; QR code seulement avec hôtesse ; questionnaire avant le paiement et obligatoire | — |
| **1, prix unique** | Réglage « Frais Wenzy » ; « sur place » fixe, consommation ou rien ; retrait des autres modes, du prix membre et de la marge ; affichage « 35 DH » partout ; factures des frais seulement ; univers « Tables » et ses formats | Nom de l'univers |
| **2, créer et gérer** | **Modèles** (les 13 du lancement, puis les autres ; Paramètres → Modèles ; « Enregistrer comme modèle ») ; rendez-vous récurrents et dates ; formulaire par type ; lieu par date (secret par défaut, plusieurs lieux) ; fiches de lieux partenaires ; back-office « Aujourd'hui » | 1 |
| **3, parcours Tables** | Écran de réservation façon billet ; fermeture 12 h avant et minimum (choix autre date ou remboursement) ; révélation 5 h avant ; tables 1 h avant (table de 7 à valider) ; message au lieu ; check-in qui dévoile la table et les présents | 2 |
| **4, Carnet et Pass** | Offres, crédits, accès « abonnés d'abord / uniquement », garde-fous et absences, migration des abonnés actuels | 1 et 3 (absences) |
| **5, organisateurs** | Formulaire court, encaissement sur place, pointage, Statistiques ; suppression des reversements, des commissions, des propositions et des membres de confiance | 1 |
| **6, textes** | Accueil, Comment ça marche, FAQ, aide, blog, presse en FR / EN / AR ; CGU, CGV, contrat organisateur, conditions de vente des organisateurs, confidentialité, règles, sécurité ; relecture juridique | 1 à 5 |
| **7, Découvrir et agenda** | Agenda à l'accueil ; filtres (§ 12) ; format Café | 1 |
| **8, vitrine complète** | **Toutes les activités du site recréées de A à Z à partir des modèles validés**, avec leurs images, pour voir le rendu final (démonstration et site d'essai) | 1 à 7 |

**Mise en ligne en deux vagues** : le lot 0 tout de suite ; les lots 1 à 7 ensemble, une fois les textes juridiques validés.

---

## 16. Points encore ouverts

- **Modèles d'événements** : liste, style des titres, contenus et images à valider (docs/23 § 8).

---

## 17. Lot 0 livré (22 novembre)

| Correction | Ce qui change |
|---|---|
| **Lieu secret hors du public** | Nom, adresse, coordonnées, quartier et nom du partenaire ne sont plus écrits dans la fiche publique (`experiences/{id}`) ni dans le résumé des dates : ils sont rangés dans `experiences/{id}/private/venue` (équipe seulement, règles déjà en place). Le back-office et l'espace organisateur les relisent pour le formulaire ; la révélation des groupes les lit pour les communiquer aux participants. Filet de sécurité côté site : `publicExperience()` vide ces champs pour toute expérience à lieu secret (anciens documents, démonstration). |
| **Plus de quartier pour un lieu secret** | Fiche (infos clés et **titre de la page pour Google**), cartes, lignes, « Cette semaine », suggestions « Pour vous », page de réservation, espace membre (réservations à venir), rappels par e-mail (la ville seulement). La recherche ne retrouve plus une expérience secrète par son quartier. |
| **Fiche** | « Le lieu » n'affiche plus ni nom, ni adresse, ni carte quand le lieu est secret ; texte neutre : « Le lieu est gardé secret : il vous est communiqué avant l'expérience, directement dans votre réservation. » |
| **Billet à QR code** | Seulement avec une hôtesse (option de l'expérience) ou pour une activité d'organisateur. Une part à régler sur place ne donne plus de billet. E-mail de confirmation : « Voir ma réservation » et rappel du check-in au lieu de « Voir mon billet ». |
| **Questionnaire avant le paiement** | Dans le tunnel de réservation et dans la demande de participation, juste avant de payer ; **obligatoire** (sauf questions facultatives), vérifié par le serveur (`questionnaire_required`). Réponses modifiables ensuite depuis la réservation. Une place proposée par la liste d'attente garde le questionnaire après coup (cas rare, à revoir au lot 3). CGV art. 3, CGU art. 7, article d'aide et article de blog mis à jour (FR / EN / AR). |

**Action manuelle après mise en ligne** : lancer une fois `scripts/migrate-secret-venues.ts` (d'abord sans `--confirm` pour voir la liste) pour retirer le lieu des expériences secrètes déjà enregistrées. Sinon, chaque expérience est corrigée à son prochain enregistrement dans le back-office.

**Tests** : unitaires 152 (dont 6 nouveaux : lieu secret, billet, questionnaire) ; émulateurs 171 réussis. Les 9 échecs restants existent à l'identique sans ces changements : déclencheurs Authentification et Stockage non émulés dans cet environnement (inscription, e-mails de factures et de virement).
