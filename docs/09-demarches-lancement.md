# 09 — Démarches administratives avant le lancement commercial

> Feuille de route non technique, à mener **en parallèle** du développement.
> Ce document est un cadrage pratique, pas un avis juridique ni fiscal : chaque étape est à valider avec un expert-comptable et, pour la CNDP, un conseil spécialisé.

## Pourquoi c'est le chemin critique

Le développement des phases 2 à 4 n'a besoin de rien de tout cela : on travaille avec un **adaptateur de paiement de test**. En revanche, **on ne peut pas encaisser un vrai dirham** sans :

```
Société marocaine → Compte bancaire pro → Contrat de paiement en ligne → Homologation du site → Paiements réels
                 ↘ Déclarations CNDP (traitements + transfert vers l'UE) ↗
```

Chaque maillon peut prendre plusieurs semaines. Commencer maintenant permet que tout soit prêt quand la plateforme l'est.

## Étape 1 — La structure juridique

| Option | Pour | Contre |
|---|---|---|
| **A. Nouvelle SARL (ou SARL AU)** dédiée à The Community | Activité isolée (risques, comptes, valorisation), facile à présenter à des investisseurs, capital ouvrable à des associés | Création à prévoir (quelques semaines avec un comptable) |
| B. Ajouter l'activité à une société marocaine existante (ex. celle du centre d'appels ou de la distribution de films), par modification de l'objet social | Plus rapide si la société et son compte bancaire existent déjà | Mélange des activités et des risques ; moins lisible pour des investisseurs ; à revoir plus tard |
| C. Auto-entrepreneur | Création très rapide | **Déconseillé** : plafonds de chiffre d'affaires, encaissements pour le compte de partenaires, image auprès des banques et prestataires |
| D. Encaisser via une société française (ex. Stripe France) | Rapide techniquement | **Déconseillé** : service rendu au Maroc à des clients marocains, réglementation des changes, cartes marocaines limitées pour les paiements internationaux |

**Recommandation : option A**, avec option B comme raccourci si une société existante peut porter l'activité sans difficulté (à voir avec votre comptable).

Points à faire préciser par le comptable :
1. **Objet social** : organisation d'événements et d'activités de loisirs, vente de billets/places, intermédiation avec des partenaires (restaurants, studios…), édition de plateforme numérique.
2. **Modèle d'encaissement** : la société vend-elle l'expérience en son nom (elle achète la prestation au partenaire et revend la place) ou encaisse-t-elle pour le compte du partenaire contre commission ? Le premier modèle est le plus simple au départ ; le second peut relever d'une réglementation spécifique sur l'encaissement pour compte de tiers. La plateforme gère les deux (champ `economics.model`), mais le choix juridique doit être fait.
3. **TVA** applicable aux places vendues et aux commissions, et mentions obligatoires sur les reçus.
4. **Activités réglementées** : randonnées, food tours ou excursions peuvent relever de règles propres au tourisme (guides, agences). À vérifier avant de les proposer.
5. **Associés** : qui détient la société (vous seul, avec Gérald, avec d'autres) ?

## Étape 2 — Compte bancaire professionnel

Dès l'immatriculation (RC, IF, ICE), ouvrir le compte professionnel. **Choisir la banque en fonction de son offre de paiement en ligne** : demander dès le premier rendez-vous les conditions du contrat e-commerce (CMI), les commissions, le délai de mise en place et la gestion des remboursements.

## Étape 3 — Prestataire de paiement en ligne

Faire au moins **trois demandes en parallèle** et comparer :

| Question à poser à chaque prestataire | Pourquoi |
|---|---|
| Pièces exigées et délai d'activation | Planning |
| Commission par transaction (cartes marocaines / étrangères), frais fixes, frais d'installation | Marge |
| Remboursements partiels via API ? | Politique d'annulation |
| Notification serveur signée (webhook / callback) ? | Sécurité de la confirmation |
| Environnement de test (sandbox) ? | Développement de la phase 5 |
| Délai de versement des fonds | Trésorerie |
| Paiement en 3D Secure, cartes internationales, Apple Pay / Google Pay | Conversion |

Candidats : **CMI** (via votre banque), **Payzone**, **YouCan Pay**. Aucun n'a été validé techniquement à ce stade.

Les prestataires vérifient en général le site avant activation : CGV, mentions légales, politique de remboursement, contact, prix en dirhams. La phase 2 produira ces pages, ce qui facilitera le dossier.

## Étape 4 — CNDP (loi 09-08)

Deux démarches, au nom de la société créée à l'étape 1 :

1. **Déclaration des traitements** : gestion des comptes clients et des réservations, prospection commerciale, etc.
2. **Transfert de données hors du Maroc** : les données seront hébergées chez Google Cloud en Belgique. Selon les sources consultées, les pays de l'Union européenne figurent généralement parmi ceux considérés comme offrant une protection adéquate, ce qui facilite la démarche ; une demande reste nécessaire. Une source de cabinet de conseil indique un délai d'instruction de 30 jours, **à confirmer sur cndp.ma**.

Risque en cas d'oubli : sanctions pénales et amendes prévues par la loi pour un transfert non autorisé. À régler **avant l'ouverture au public**, pas avant le développement.

## Étape 5 — Le reste

- Dépôt de la marque **The Community** à l'OMPIC (vérifier d'abord la disponibilité, classes 41 et 43 notamment).
- Nom de domaine (ex. `thecommunity.ma`, `thecommunity-app.com`… à vérifier).
- Compte Google Cloud / Firebase au nom de la société, avec moyen de paiement.
- Assurance responsabilité civile organisateur d'événements.
- Conventions avec les premiers partenaires (prix, commission, annulation, responsabilités).

## Calendrier indicatif

| Semaine | Démarches | Développement |
|---|---|---|
| 1–3 | Rendez-vous comptable, création de la société, demande de domaine | Phase 2 : design et pages |
| 3–6 | Compte bancaire, demandes aux prestataires de paiement, dépôt de marque | Phase 3–4 : Firebase et réservations (paiement de test) |
| 6–10 | Signature du contrat de paiement, déclarations CNDP | Phase 5 : intégration du prestataire en mode test |
| 10+ | Homologation, autorisation CNDP reçue | Phase 6–8 : matching, notifications, tests, lancement |

Les délais réels dépendent des administrations, de la banque et du prestataire.

## Sources consultées (novembre 2026)

- [Transfert international de données personnelles au Maroc — Upsilon Consulting](https://upsilon-consulting.com/transfert-international-donnees-personnelles-maroc/)
- [Déclarations et autorisations CNDP : guide pratique — Upsilon Consulting](https://upsilon-consulting.com/declarations-autorisations-cndp-guide-pratique/)
- [Flash info Maroc : protection des données personnelles, loi 09-08 — CMS](https://cms.law/fr/mar/legal-updates/flash-info-maroc-etat-des-lieux-de-la-protection-des-donnees-a-caractere-personnel-au-maroc-loi-n-09-08)
- [Délibération CNDP D-02-2023](https://www.cndp.ma/wp-content/uploads/2025/04/CNDP-Deliberation-D-02-2023-20230227.pdf)
- [Office 365 : une procédure accélérée pour les clients marocains — Médias24](https://medias24.com/2022/04/06/office-365-une-procedure-acceleree-pour-les-clients-marocains/)
- [Le CMI lance le paiement multidevises sur les sites e-commerce marocains — SNRT News](https://snrtnews.com/fr/article/le-cmi-lance-le-service-de-paiement-multidevises-sur-les-sites-e-commerce-marocains-113535)
