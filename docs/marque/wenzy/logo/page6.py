import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
def uri(f): return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()

C = [
 ("rebond", "1", "Rebond", "Chaque lettre danse sur la ligne, chacune dans sa couleur. Comme une bande d'amis sur une photo : personne n'est aligné, et c'est ce qui la rend vivante.", "#1E1433"),
 ("duo", "2", "Duo", "« wen » en bulle bien grasse, « zy » écrit à la main. Deux écritures qui se rencontrent, comme deux inconnus à la même table.", "#1E1433"),
 ("sticker", "3", "Autocollant", "Lettres gonflées, contour noir et ombre tomate, mot penché. Il a l'air collé sur un téléphone ou une bouteille, parfait pour Instagram et les goodies.", "#FF5533"),
 ("grandz", "4", "Grand Z", "Un mot bien sage, et un Z géant qui part en biais au milieu. Le Z devient la signature : une pastille, une icône, un clin d'œil.", "#A98BFF"),
 ("melange", "5", "Mélange", "Une police différente pour chaque lettre, à la même hauteur. Cinq personnalités, un seul mot : exactement le principe d'un dîner Wenzy.", "#1E1433"),
 ("sourire", "6", "Sourire", "Écriture liée, souple, avec un trait en sourire dessous. Le plus doux des six, facile à reconnaître même en tout petit.", "#FFF3E3"),
]

cards = ""
for key, n, name, desc, ibg in C:
    cards += f'''
<article class="cpt" aria-labelledby="c{n}">
  <div class="big"><img src="{uri('fun-'+key+'.svg')}" alt="Lettrage Wenzy, concept {name}"></div>
  <div class="meta">
    <div class="ico" style="background:{ibg}"><img src="{uri('fun-'+key+'-transparent.svg')}" alt=""></div>
    <div class="txt"><p class="num">Lettrage {n}</p><h3 id="c{n}">{name}</h3><p class="desc">{desc}</p></div>
  </div>
</article>'''

tc = "".join(f'<figure><img src="{uri("tc-"+k+".svg")}" alt="Lettrage {name} en terre cuite"><figcaption>{n} · {name}</figcaption></figure>' for k, n, name, _, _ in C)

html = f'''<title>Wenzy, lettrages fun</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caprasimo&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
<style>
/* Layout : un mur crème façon carnet de croquis ; six lettrages en grand, puis la même série en terre cuite. */
:root {{
  --tomate: #FF5533; --bonbon: #FF9EC7; --lilas: #A98BFF; --pomme: #7ED957; --creme: #FFF3E3; --encre: #1E1433;
  --bg: #FFF3E3; --panel: #ffffff; --fg: #1E1433; --muted: #6a6077; --line: #f0e2cf;
  --display: "Caprasimo", Georgia, serif; --ui: "DM Sans", ui-sans-serif, system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #1E1433; --panel: #2a1f42; --fg: #FFF3E3; --muted: #c4b8d6; --line: #3b2f55; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #1E1433; --panel: #2a1f42; --fg: #FFF3E3; --muted: #c4b8d6; --line: #3b2f55; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1120px; margin: 0 auto; display: grid; gap: 3rem }}
h1, h2, h3 {{ margin: 0; text-wrap: balance; line-height: 1.05; font-family: var(--display); font-weight: 400 }}
p {{ margin: 0 }}
.eyebrow {{ font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: var(--tomate); font-weight: 700 }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.4rem, 7vw, 4.4rem) }}
header h1 span {{ color: var(--tomate); display: inline-block; transform: rotate(-4deg) }}
header h1 span + span {{ color: var(--lilas); transform: rotate(5deg) }}
.lede {{ max-width: 64ch; color: var(--muted); font-size: 1.05rem }}
.palette {{ display: flex; flex-wrap: wrap; gap: .6rem }}
.chip {{ display: flex; align-items: center; gap: .55rem; background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: .35rem .9rem .35rem .35rem; font-size: .85rem }}
.chip i {{ width: 30px; height: 30px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1) }}
.chip span {{ color: var(--muted); font-variant-numeric: tabular-nums }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem }}
@media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr }} }}
.cpt {{ background: var(--panel); border: 1px solid var(--line); border-radius: 24px; padding: 1rem; display: grid; gap: 1rem; align-content: start }}
.big {{ border-radius: 16px; overflow: hidden }}
.big img {{ width: 100%; height: auto; display: block }}
.meta {{ display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start; padding: 0 .3rem .3rem }}
.ico {{ box-shadow: inset 0 0 0 1px rgb(0 0 0 / .08); width: 76px; height: 76px; border-radius: 18px; display: grid; place-items: center; padding: 8px }}
.ico img {{ width: 100%; height: auto }}
.txt {{ display: grid; gap: .25rem; min-width: 0 }}
.num {{ font: 700 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
.txt h3 {{ font-size: 1.6rem }}
.desc {{ color: var(--muted); font-size: .93rem }}
section {{ display: grid; gap: 1rem }}
section > h2 {{ font-size: clamp(1.7rem, 4vw, 2.4rem) }}
.sec-lede {{ color: var(--muted); max-width: 64ch }}
.tc {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .9rem }}
@media (max-width: 760px) {{ .tc {{ grid-template-columns: repeat(2, minmax(0, 1fr)) }} }}
.tc figure {{ margin: 0; display: grid; gap: .4rem }}
.tc img {{ width: 100%; border-radius: 14px; display: block }}
.tc figcaption {{ font-size: .82rem; color: var(--muted) }}
.reco {{ background: var(--panel); border: 1px solid var(--line); border-radius: 24px; padding: 1.6rem 1.8rem; display: grid; gap: .7rem; max-width: 780px }}
.reco h2 {{ font-size: 1.9rem }}
.reco p {{ color: var(--muted) }}
.reco strong {{ color: var(--fg) }}
@media (prefers-reduced-motion: no-preference) {{
  header h1 span {{ transition: transform .3s }}
  header h1:hover span {{ transform: rotate(0) }}
}}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · lettrages</p>
  <h1>Un mot qui a <span>envie</span> de <span>sortir</span></h1>
  <p class="lede">On ne choisit plus une police, on dessine le mot. Selon les pistes, les lettres changent de forme, de taille, de couleur ou d'angle, à la lettre ou à la syllabe. Six lettrages, avec une palette jeune et vitaminée. Plus bas, la même série en terre cuite, si vous préférez garder ces couleurs.</p>
  <div class="palette" aria-label="Palette fun">
    <span class="chip"><i style="background:#FF5533"></i><b>Tomate</b><span>#FF5533</span></span>
    <span class="chip"><i style="background:#FF9EC7"></i><b>Bonbon</b><span>#FF9EC7</span></span>
    <span class="chip"><i style="background:#A98BFF"></i><b>Lilas</b><span>#A98BFF</span></span>
    <span class="chip"><i style="background:#7ED957"></i><b>Pomme</b><span>#7ED957</span></span>
    <span class="chip"><i style="background:#FFF3E3"></i><b>Crème</b><span>#FFF3E3</span></span>
    <span class="chip"><i style="background:#1E1433"></i><b>Encre</b><span>#1E1433</span></span>
  </div>
</header>
<div class="grid">{cards}
</div>
<section aria-labelledby="tc">
  <h2 id="tc">Les mêmes, en terre cuite</h2>
  <p class="sec-lede">Si vous voulez garder la palette de votre planche (terre cuite, atlantique, safran, sable), voici les six lettrages dans ces couleurs.</p>
  <div class="tc">{tc}</div>
</section>
<section class="reco" aria-labelledby="reco">
  <p class="eyebrow">Ma recommandation</p>
  <h2 id="reco">Rebond, en palette fun</h2>
  <p><strong>Le plus joyeux, et il raconte l'idée de Wenzy</strong> : des personnes différentes qui se retrouvent ensemble. Il marche en grand sur une affiche et se décline facilement : chaque lettre peut devenir une pastille d'univers. <strong>Autocollant (3)</strong> est l'autre favori pour Instagram et les goodies.</p>
  <p>Dites-moi le lettrage (1 à 6) et la palette (fun ou terre cuite). Je peux aussi mélanger deux idées, par exemple le Rebond avec le contour de l'Autocollant.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
