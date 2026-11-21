# Logo Wenzy (étape 2, 21 novembre 2026)

Piste retenue à l'étape 1 : **A « Midi »** (cobalt `#1340A8`, safran `#F5C242`, chaux `#FBFAF6`, nuit `#10162B`).

Logotype vectorisé à partir de **Bricolage Grotesque** (licence OFL, usage commercial libre), taille optique 96, graisse 800, minuscules, crénage resserré (−38/1000). Signature arabe **وينزي** en Readex Pro 600.

`propositions/` : trois variantes en attente de choix, chacune en cobalt, sur cobalt, une couleur (nuit) et monogramme :
- `soleil-*` : variante 1, point safran levé après le y (recommandée) ;
- `bras-*` : variante 2, point au-dessus du w (petit personnage) ;
- `point-*` : variante 3, point final sur la ligne de base.

Régénérer : `pip install fonttools uharfbuzz`, polices `bri-96-800.ttf` et `readex-600.ttf` (Google Fonts) dans un dossier `fonts/`, puis `python3 mklogo.py fonts propositions`. Page de présentation : `python3 page2.py propositions ../etape-2-logo.html`.

## Révision du 21 novembre : nouvelle police

Bricolage Grotesque refusée (« je n'aime pas la police »). `polices/` : le logo « Soleil levé » dans six polices OFL (Outfit, Fredoka, Unbounded, Sora, Plus Jakarta Sans, DM Serif Display), page `../etape-2b-polices.html`. Régénérer : `python3 mkfonts.py fonts polices` puis `python3 page3.py polices ../etape-2b-polices.html`.

## Révision du 21 novembre : plus de bleu + jaune, plus de W isolé

Le duo bleu/jaune et le W seul rappelaient une grande enseigne marocaine. `palettes/` : quatre palettes (Corail, Sanguine, Sapin, Fuchsia), logo en Outfit, icône avec le mot entier. Page `../etape-2c-couleurs.html`. Régénérer : `python3 mkpal.py fonts palettes` puis `python3 page4.py palettes ../etape-2c-couleurs.html`.

## Révision du 21 novembre : retour aux couleurs de la planche de référence

Référence fournie : `docs/maquettes/2026-11-21-wenzy/reference-couleurs.jpg` (terre cuite `#B9462A`, atlantique `#1D4466`, safran `#E3A23B`, sable `#F4EADB`, encre `#22201C` ; DM Serif Display, DM Sans, Tajawal). `terre-cuite/` : « wenzy » en minuscules avec un soleil à rayons à gauche, dans six polices, et le symbole « soleil dans une arche » (pas de W). Page `../etape-2d-terre-cuite.html`. Régénérer : `python3 mksoleil.py fonts terre-cuite` puis `python3 page5.py terre-cuite ../etape-2d-terre-cuite.html`.

## Révision du 21 novembre : lettrages « fun et jeune »

Demande : un logo fun et jeune, avec des changements de police, de taille ou de forme selon les lettres ou les syllabes. `lettrages/` : six lettrages composés lettre par lettre (Rebond, Duo, Autocollant, Grand Z, Mélange, Sourire), en palette fun (tomate, bonbon, lilas, pomme, crème, encre) et en terre cuite (`tc-*`). Polices OFL : Bagel Fat One, Pacifico, Caprasimo, Shrikhand, Dela Gothic One, Rubik, Fraunces. Page `../etape-2e-lettrages.html`. Régénérer : `python3 mkfun.py fonts lettrages` puis `python3 page6.py lettrages ../etape-2e-lettrages.html`.
