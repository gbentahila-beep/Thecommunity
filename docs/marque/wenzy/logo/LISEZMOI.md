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

## Révision du 21 novembre : pro, vivant, mémorable, autour de la rencontre

Lettrages fun jugés trop enfantins. Nouvelle demande : niveau des grandes applications sociales (référence citée : Timeleft, sans copier), professionnel, avec un élément qui évoque la rencontre et le lien. `rencontre/` : nom en Outfit minuscules, palette grenade `#E4473A`, aubergine `#2B1633`, abricot `#FFB37A`, pistache `#C9DB8A`, crème `#FFF7EE`, et trois symboles : `tablee-*` (six points en cercle, recommandé), `lien-*` (deux points et un sourire), `wdeux-*` (deux têtes dans les creux du w). Page `../etape-2f-rencontre.html`. Régénérer : `python3 mklien.py fonts rencontre` puis `python3 page7.py rencontre ../etape-2f-rencontre.html` (le script génère aussi une piste « duo » écartée, à supprimer).

## Révision du 21 novembre : trois directions complètes au niveau des références

Références fournies (à ne pas copier, pour le niveau) : `docs/maquettes/2026-11-21-wenzy/ref-*.png` (Timeleft, Socials, Sahbi). Page `../etape-2g-directions.html` : Coucher de soleil (wen + zy manuscrit, dégradé corail → violet, Instrument Serif), Menthe (tablée, vert + citron vert, Young Serif), Électrique (groupe de trois cercles, bleu électrique + lilas, Sora), chacune sur un écran de téléphone. Maquettes en HTML (`directions.src.html`, photos injectées depuis `apps/web/public`) ; le logo choisi sera ensuite redessiné en vectoriel.

## Révision du 21 novembre : retour aux couleurs Midi, logo en duo

Choix : couleurs Midi (cobalt `#1340A8`, safran `#F5C242`, chaux `#FBFAF6`, nuit `#10162B`, figue `#F28BA8`, capture `docs/maquettes/2026-11-21-wenzy/choix-couleurs-midi.png`) et logo « duo » : « wen » en Outfit 700, « zy » manuscrit. `duo/` : quatre écritures pour le « zy » (Kaushan Script recommandée, Caveat, Dancing Script, Yellowtail), sur cobalt, chaux, safran et nuit, plus l'icône « zy ». Page `../etape-2h-duo.html`. Régénérer : `python3 mkduo.py fonts duo` puis `python3 page8.py duo ../etape-2h-duo.html`.
