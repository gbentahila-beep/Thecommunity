import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
F = "/tmp/claude-0/-home-user-Thecommunity/701c16c0-2d4b-54e8-89f0-b585b9bf9f9a/scratchpad/final/"
def uri(p): return "data:image/svg+xml;base64," + base64.b64encode(open(p, "rb").read()).decode()
M = [
 ("tables", "1", "Les tables", "Des cercles de six points : six personnes autour d'une table. Dans chaque cercle, un point en dégradé, c'est vous qui arrivez.", "200px"),
 ("ciel", "2", "Le ciel de 19 h", "Pas de dessin : de grandes taches de couleur floues, comme le ciel au coucher du soleil. Très moderne, idéal en fond d'écran et de story.", "cover"),
 ("arcs", "3", "Les arcs du couchant", "Des demi-cercles concentriques : le soleil qui se couche sur l'océan. Graphique et facile à reconnaître, un clin d'œil aux arches marocaines.", "180px"),
 ("paires", "4", "La grille et les paires", "Une grille de points discrète, et ici et là deux points qui se relient. Une rencontre dans la foule. Le plus sobre et le plus « design ».", "320px"),
 ("zellige", "5", "Zellige au trait", "L'étoile à huit branches du zellige, dessinée en filet fin et en dégradé. La touche marocaine, version contemporaine.", "120px"),
 ("vagues", "6", "Les vagues", "Des lignes ondulées qui circulent, comme une conversation qui s'anime autour de la table. Doux et fluide.", "240px"),
]
cards = ""
for k, n, name, d, size in M:
    e, c = uri(f"{L}/{k}-encre.svg"), uri(f"{L}/{k}-creme.svg")
    cards += f'''
<article class="m" aria-labelledby="m{n}">
  <div class="big" style="background-image:url({e});background-size:{size}" role="img" aria-label="Motif {name} sur fond encre"></div>
  <div class="row">
    <div class="light" style="background-image:url({c});background-size:{size}" role="img" aria-label="Sur fond crème"></div>
    <div class="story" style="background-image:url({e});background-size:{size}"><div class="card"><p class="k">Ce jeudi</p><p class="t">Le dîner du jeudi</p><span>Réserver</span></div></div>
  </div>
  <div class="meta"><p class="num">Motif {n}</p><h2 id="m{n}">{name}</h2><p class="desc">{d}</p></div>
</article>'''
html = f'''<title>Wenzy, choix du motif</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : six motifs en grille, chacun en grand sur encre, en bande sur crème et en story. Thème unique, celui de la marque. */
:root {{ --creme: #F6F1EA; --encre: #141414; --taupe: #66625C; --ligne: #E3D9CB; --grad: linear-gradient(100deg, #FF6A4D, #C25BE8);
  --serif: "Instrument Serif", Georgia, serif; --ui: "Inter", ui-sans-serif, system-ui, sans-serif; color-scheme: light }}
* {{ box-sizing: border-box }}
body {{ background: var(--creme); color: var(--encre); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1120px; margin: 0 auto; display: grid; gap: 2.5rem }}
h1, h2 {{ margin: 0; font-family: var(--serif); font-weight: 400; line-height: 1; text-wrap: balance }}
p {{ margin: 0 }}
.g {{ background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .05em }}
.eyebrow {{ font: 600 .75rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--taupe) }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.6rem, 7vw, 4.4rem) }}
.lede {{ max-width: 64ch; color: var(--taupe); font-size: 1.05rem }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem }}
@media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr }} }}
.m {{ background: #fff; border-radius: 22px; padding: 1rem; display: grid; gap: .7rem; align-content: start; box-shadow: 0 0 0 1px var(--ligne) }}
.big {{ height: 230px; border-radius: 14px; background-repeat: repeat; background-position: center }}
.row {{ display: grid; grid-template-columns: 1fr 104px; gap: .7rem }}
.light {{ border-radius: 12px; min-height: 184px; background-repeat: repeat; box-shadow: inset 0 0 0 1px var(--ligne) }}
.story {{ aspect-ratio: 9 / 16; border-radius: 12px; background-repeat: repeat; background-position: center; display: grid; align-content: end; padding: .45rem }}
.story .card {{ background: var(--creme); border-radius: 8px; padding: .45rem; display: grid; gap: .2rem }}
.story .k {{ font: 600 .48rem/1 var(--ui); letter-spacing: .1em; text-transform: uppercase; color: var(--taupe) }}
.story .t {{ font: 400 .85rem/1 var(--serif) }}
.story span {{ background: var(--grad); color: var(--encre); text-align: center; font: 600 .5rem/1 var(--ui); padding: .32rem; border-radius: 999px }}
.meta {{ display: grid; gap: .25rem; padding: .2rem .3rem 0 }}
.num {{ font: 600 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--taupe) }}
.meta h2 {{ font-size: 2rem }}
.desc {{ color: var(--taupe); font-size: .93rem }}
.next {{ background: #fff; border-radius: 22px; padding: 1.5rem 1.7rem; display: grid; gap: .6rem; max-width: 780px; box-shadow: 0 0 0 1px var(--ligne) }}
.next p {{ color: var(--taupe) }}
.next strong {{ color: var(--encre) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · planche 06 · le motif</p>
  <h1>Six motifs, <span class="g">à vous de choisir</span></h1>
  <p class="lede">Le motif habille les fonds de section, les stories, les sacs et les cartes cadeaux. Chaque proposition est montrée en grand sur encre, sur crème, et en story Instagram.</p>
</header>
<div class="grid">{cards}
</div>
<section class="next" aria-label="La suite">
  <p class="eyebrow">Mon avis</p>
  <p><strong>Les tables (1)</strong> raconte le mieux Wenzy. <strong>La grille et les paires (4)</strong> est la plus élégante et la plus discrète. <strong>Le ciel de 19 h (2)</strong> est le plus moderne, parfait pour Instagram, et peut s'ajouter à un des autres.</p>
  <p>Dites-moi le numéro, ou deux numéros à combiner, et je mets le brand book à jour.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
