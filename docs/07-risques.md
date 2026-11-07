# 07 — Risques et dépendances

> Phase 1 · Document d'architecture · Statut : **validé**

Classés par impact sur le lancement. **P** = probabilité, **I** = impact (H = haut, M = moyen, B = bas).

| # | Risque | P | I | Parade |
|---|---|---|---|---|
| R1 | **Ouverture du contrat de paiement en ligne** (CMI ou autre) plus longue que le développement : société marocaine, compte bancaire, dossier, tests d'homologation | H | H | Lancer les démarches **dès maintenant** ; développer avec l'adaptateur de test ; architecture indépendante du prestataire |
| R2 | **Surréservation / doubles réservations** | M | H | Transactions Firestore, `seatLocks`, tests de concurrence automatisés |
| R3 | **Paiement confirmé après expiration du blocage** ou webhook perdu | M | H | Reprise de place ou remboursement automatique ; réconciliation planifiée ; alertes |
| R4 | **Conformité CNDP** et transfert de données hors du Maroc | M | H | Déclarations avant lancement, conseil juridique, minimisation des données |
| R5 | **Sécurité physique des participants** (rencontres entre inconnus) | M | H | Charte, signalement, suspension, lieux publics partenaires uniquement, infos minimales partagées, pas de messagerie privée au lancement |
| R6 | **Fuseau horaire marocain** (UTC+1, UTC+0 pendant le Ramadan) | H | M | Stockage UTC, affichage IANA `Africa/Casablanca`, tests sur les dates de bascule |
| R7 | **No-shows** sur les dîners (tables incomplètes) | H | M | Prépaiement obligatoire, politique d'annulation, rappels J-1/H-3, historique `noShows`, surbooking interdit |
| R8 | **Faible paiement par carte en ligne** au Maroc | M | M | Abstraction pour d'autres moyens plus tard ; parcours de paiement très court ; réassurance |
| R9 | **Arabe/RTL** : coût de double interface | M | M | Classes Tailwind logiques dès le premier composant ; arabe activé quand les contenus sont traduits |
| R10 | **Démarrage à froid** des functions (latence au paiement) | M | B | `minInstances: 1` sur réservation et webhook en production (coût de quelques dollars par mois) |
| R11 | **Coûts Firestore** liés au trafic public | B | M | Pages publiques en ISR (lectures mises en cache), agrégats statistiques précalculés |
| R12 | **Abus** : faux comptes, abus de codes promo, scripts | M | M | App Check, e-mail vérifié pour réserver, limites par utilisateur sur les promos, limitation de fréquence |
| R13 | **Matching perçu comme discriminant** (âge, genre) | B | M | Critères transparents dans la FAQ, genre facultatif, l'admin garde la main |
| R14 | **Recherche limitée** dans Firestore | B | B | Suffisant au lancement ; Algolia/Typesense ensuite |
| R15 | **Nom de marque** « The Community » : expression courante en anglais, donc plus difficile à protéger et à référencer seule | M | M | Vérifier la disponibilité à l'OMPIC (classes 41 et 43) et du nom de domaine ; travailler le SEO sur « The Community Casablanca » et les pages ville/catégorie |
| R16 | **Dépendance à Firebase** (verrouillage fournisseur) | B | B | Choix assumé ; logique métier isolée dans des packages purs ; paiement et e-mail derrière des interfaces |

## Dépendances externes à lancer en parallèle

1. Société marocaine exploitante + compte bancaire professionnel (pré-requis paiement).
2. Contrat avec un prestataire de paiement (choix après comparaison des offres réelles).
3. Compte Google Cloud / Firebase avec facturation (plan Blaze), au nom de la société.
4. Nom de domaine + adresse e-mail d'envoi (SPF, DKIM, DMARC pour la délivrabilité).
5. Compte du service e-mail transactionnel.
6. Conseil juridique : CGU, CGV, confidentialité, déclarations CNDP.
7. Photos réelles des lieux partenaires (les visuels de démonstration seront remplacés).
8. Premiers partenaires (restaurants, studios, escape games) pour le contenu de lancement.
