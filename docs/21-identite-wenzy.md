# 21 — Nouvelle identité : The Host Club devient Wenzy (21 novembre 2026)

Remplace la partie visuelle de `docs/18-identite-de-marque.md`. L'ancien brand book (`docs/marque/brand-book.html`) reste dans le dépôt pour mémoire.

## Décisions (21 novembre)

- **Nouveau nom : Wenzy.** Domaines, marque et réseaux sociaux : disponibles (vérifiés par Hamza).
- **Identité visuelle : on repart de zéro.** Prune et crème, logotype Fraunces, monogramme « h. » et motif « le fil » sont abandonnés.
- **Nom en arabe : وينزي**, en signature sur les supports arabes (orthographe à faire relire avant impression).
- **Accroche conservée : « Your people are out there. »**
- **Ce qui ne change pas** : la promesse, la personnalité, la voix, les textes du site. Seul le nom change dans les textes.

## Plan en 5 étapes

1. **Stratégie et pistes créatives** : livrée, `docs/marque/wenzy/etape-1-pistes.html`. Trois pistes : A « Midi » (cobalt, safran, chaux, Bricolage Grotesque), B « Menthe » (vert menthe, ambre, étoile du zellige, Syne), C « Soirée » (indigo, corail, lilas, Instrument Serif italique). **Choix : A « Midi »** (21 novembre). Couleurs finalement remplacées à l’étape 2.
2. **Logo** : **livré et validé.** Direction Coucher de soleil (crème `#F6F1EA`, encre `#141414`, dégradé corail `#FF6A4D` → violet `#C25BE8`, titres Instrument Serif, texte Inter). Logo duo version A « Serré » : « wen » en Outfit, « zy » manuscrit en dégradé ; icône avec le mot entier. Fichiers : `docs/marque/wenzy/logo/final/`, présentation et règles : `docs/marque/wenzy/etape-2-logo-final.html`. Historique des pistes : `docs/marque/wenzy/logo/LISEZMOI.md`.
3. **Brand book complet** : **livré**, `docs/marque/wenzy/brand-book.html` (version 1). Douze planches : ton et ambiance, typographie, couleurs, logo, icône et favicon, motif « le ciel de 19 h » (choisi parmi six propositions), papeterie, à table, affichage, réseaux sociaux, objets, composants du site, plus règles d’or et fichiers. Source : `brandbook.src.html`, assemblée par `buildbb.py` (logos, motif et photos injectés).
4. **Passage du site à Wenzy** : **fait.** Nom remplacé partout (FR/EN/AR, blog, aide, mentions légales, e-mails, factures, back-office, tests), liens des articles et de l’aide renommés (`wenzy-guide-complet`, `comment-fonctionne-wenzy`, thème `wenzy`), adresses `@wenzy.ma`. Couleurs : échelle `brand` (encre, violet profond, lilas), corail et violet, bouton principal en dégradé avec texte encre, fond `bg-ciel`. Polices : Instrument Serif, Inter, Amiri, IBM Plex Sans Arabic. Logos, icônes, favicon, image de partage, en-tête des e-mails et logo des factures PDF remplacés ; kit presse mis à jour. Vérifié : tests unitaires, types, lint, compilation et tests de bout en bout du mode démo.
5. **Hors code** : domaine, dépôt de marque, comptes sociaux, adresse e-mail, documents juridiques.
