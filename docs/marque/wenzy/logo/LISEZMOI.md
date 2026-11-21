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
