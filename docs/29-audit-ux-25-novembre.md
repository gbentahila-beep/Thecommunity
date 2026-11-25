# 29 — Audit UI/UX du 25 novembre 2026

Audit complet du site public (21 pages, mobile 390 px et ordinateur 1440 px), comparé à Timeleft et Socials by Detor (38 captures envoyées par Hamza). L'audit détaillé, avec captures, plan en phases et questions, est une page Artifact privée (lien dans la conversation du 25/11).

## Décisions de Hamza (25 novembre)

| Question | Décision |
| --- | --- |
| Accroche « Your people are out there. » | **On la garde** en anglais. |
| Mascottes (Babs) | **On les garde.** |
| Alignement des titres | « Comme les sites pro » : titres de contenu (listes, questions, pages de texte) **alignés à gauche** ; grandes phrases d'accroche, avis et appel final **centrés** (c'est ce que font Timeleft et Socials). À appliquer en phase 1. |
| Photos | **Changées plus tard** (pas de shooting pour l'instant). |
| Application | **Pas encore dans les stores** : annoncée « bientôt sur l'App Store et Google Play », sans lien. |
| Point médian (seul·e, prévenu·e…) | **Supprimé** : phrases reformulées (« en solo », « nous vous prévenons », « Premiers pas »…). |

Les autres questions de l'audit restent ouvertes ; en attendant, on suit les recommandations de l'audit.

## Phase 0 — fait le 25 novembre

- **Pied de page** : les informations légales ne s'affichent que si elles sont renseignées (plus aucun « à compléter » visible) ; sur mobile, liens sur deux colonnes (≈ 1 500 → 1 200 px).
- **Point médian** retiré de tous les textes visibles en français : site (`messages/fr.json`), blog, aide, pages légales, e-mails et notifications (`functions/src`).
- **Accueil** : bloc « Travaillons ensemble » retiré (il reste dans le pied de page, le centre d'aide et les pages dédiées) ; machine à écrire supprimée ; bloc application déplacé juste avant les questions, avec « Bientôt » sur l'App Store et Google Play.
- **Badges des cartes** : une seule apparence (encre), corail seulement pour « Dernières places ».
- **Étoiles** : même violet partout (la page Avis était en jaune).
- **Démo** : « Dîner entre inconnus » passe au mercredi (comme l'accueil) et « inclus » ne promet plus un menu payé.

Laissé en l'état : la double navigation mobile (☰ en haut + barre du bas), que Socials utilise aussi ; les « à compléter » dans le texte des CGU et de la confidentialité (phase 4, pages de confiance).

## Suite

Phase 1 (fondations : échelle de titres, espaces, deux largeurs, composants Section et Carte, lexique), puis accueil, Découvrir et fiche, pages secondaires, animations — voir l'audit.
