import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
P = "/home/user/Thecommunity/apps/web/public/"
def uri(f): return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()
def img(f): return "data:image/webp;base64," + base64.b64encode(open(P + f, "rb").read()).decode()
V = [
 ("serre", "A", "Serré", "Le « zy » vient se coller au « n », même ligne de base. La correction la plus simple : plus de vide entre les deux."),
 ("lie", "B", "Lié", "Le « z » mord légèrement sur le « n », comme une écriture qui enchaîne. Les deux parties ne font plus qu'un mot."),
 ("signature", "C", "Signature", "Un « zy » plus grand qui passe par-dessus la fin du « n », comme une signature au bas d'une invitation. Le plus expressif."),
 ("equilibre", "D", "Équilibré", "« wen » un peu moins gras, pour que son épaisseur réponde à celle du trait manuscrit. Plus fin, plus chic."),
 ("pinceau", "E", "Pinceau", "« wen » plus gras et « zy » au pinceau. Le plus énergique, avec un contraste fort entre les deux écritures."),
 ("fil", "F", "Le fil", "Un trait part sous « wen » et rejoint le « z » : le lien entre deux personnes, dessiné dans le logo."),
]
cards = "".join(f'''
<article class="v" aria-labelledby="v{n}">
  <div class="main"><img src="{uri(k+'-creme.svg')}" alt="Logo Wenzy, version {name}, sur crème"></div>
  <div class="row"><img class="dark" src="{uri(k+'-encre.svg')}" alt="Sur encre"><img class="ico" src="{uri(k+'-icone.svg')}" alt="Icône"></div>
  <div class="meta"><p class="num">Version {n}</p><h3 id="v{n}">{name}</h3><p class="desc">{d}</p></div>
</article>''' for k, n, name, d in V)
html = f'''<title>Wenzy, logo Coucher de soleil</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : grille de six versions du logo dans la direction Coucher de soleil, puis la version recommandée sur le site. */
:root {{
  --creme: #F6F1EA; --encre: #141414; --corail: #FF6A4D; --violet: #C25BE8;
  --bg: #F6F1EA; --panel: #ffffff; --fg: #141414; --muted: #66625c; --line: #e6ddd0;
  --serif: "Instrument Serif", Georgia, serif; --ui: "Inter", ui-sans-serif, system-ui, sans-serif;
  --grad: linear-gradient(100deg, #FF6A4D, #C25BE8);
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #141414; --panel: #1e1d1c; --fg: #F6F1EA; --muted: #aaa49b; --line: #33302c; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #141414; --panel: #1e1d1c; --fg: #F6F1EA; --muted: #aaa49b; --line: #33302c; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1120px; margin: 0 auto; display: grid; gap: 3rem }}
h1, h2, h3 {{ margin: 0; text-wrap: balance; line-height: 1; font-family: var(--serif); font-weight: 400 }}
p {{ margin: 0 }}
.eyebrow {{ font: 600 .75rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.6rem, 7vw, 4.6rem) }}
header h1 em {{ background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .05em }}
.lede {{ max-width: 66ch; color: var(--muted); font-size: 1.05rem }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem }}
@media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr }} }}
.v {{ background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 1rem; display: grid; gap: .7rem; align-content: start }}
.main img {{ width: 100%; border-radius: 14px; display: block; box-shadow: inset 0 0 0 1px #e6ddd0 }}
.row {{ display: grid; grid-template-columns: 1fr auto; gap: .7rem; align-items: center }}
.row .dark {{ width: 100%; border-radius: 12px; display: block }}
.row .ico {{ width: 84px; height: 84px }}
.meta {{ display: grid; gap: .25rem; padding: .2rem .3rem 0 }}
.num {{ font: 600 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
.meta h3 {{ font-size: 2rem }}
.desc {{ color: var(--muted); font-size: .93rem }}
.sit {{ display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start }}
@media (max-width: 820px) {{ .sit {{ grid-template-columns: 1fr }} }}
.phone {{ background: #0d0d0d; border-radius: 42px; padding: 9px; max-width: 320px; width: 100% }}
.screen {{ border-radius: 34px; overflow: hidden; background: #F6F1EA; color: #141414 }}
.hero {{ position: relative; height: 440px }}
.hero > img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }}
.nav {{ position: absolute; top: 14px; left: 10px; right: 10px; background: #fff; border-radius: 999px; display: flex; align-items: center; justify-content: space-between; padding: .35rem .5rem .35rem .9rem; box-shadow: 0 6px 20px -8px rgb(0 0 0 / .3) }}
.nav img {{ height: 34px }}
.nav .r {{ display: flex; align-items: center; gap: .5rem }}
.nav .s {{ font: 600 .78rem/1 var(--ui); padding: .55rem .9rem; border-radius: 999px; background: var(--grad); color: #fff }}
.burger {{ width: 18px; height: 10px; border-top: 2px solid #141414; border-bottom: 2px solid #141414; margin-right: .35rem }}
.card {{ position: absolute; left: 10px; right: 10px; bottom: 12px; background: #F6F1EA; border-radius: 24px; padding: 1.1rem; display: grid; gap: .7rem }}
.city {{ font: 600 .78rem/1 var(--ui); display: flex; gap: .35rem; align-items: center }}
.city::before {{ content: ""; width: 8px; height: 8px; border-radius: 50%; background: #FF6A4D }}
.h {{ font: 400 2.1rem/.98 var(--serif) }}
.h span {{ background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent }}
.cta {{ text-align: center; font: 600 .9rem/1 var(--ui); padding: .9rem; border-radius: 999px; background: var(--grad); color: #fff }}
.list {{ padding: 1rem 1.1rem 1.3rem; display: grid; gap: .8rem }}
.list .lt {{ font: 400 1.5rem/1 var(--serif) }}
.item {{ display: grid; grid-template-columns: 52px 1fr auto; gap: .7rem; align-items: center; border-top: 1px solid #e6ddd0; padding-top: .8rem }}
.item img {{ width: 52px; height: 52px; border-radius: 12px; object-fit: cover }}
.item b {{ font-size: .9rem; display: block }}
.item small {{ font-size: .74rem; color: #66625c; display: block }}
.pill {{ display: inline-block; font: 600 .66rem/1 var(--ui); padding: .28rem .5rem; border-radius: 999px; background: #F7DCD3; color: #A83A22; margin: .2rem 0 }}
.book {{ font: 600 .75rem/1 var(--ui); padding: .5rem .8rem; border-radius: 999px; border: 1.5px solid #141414 }}
.side {{ display: grid; gap: 1.25rem }}
.post {{ display: grid; grid-template-columns: 1fr 1fr; border-radius: 22px; overflow: hidden; background: #141414; min-height: 300px }}
@media (max-width: 520px) {{ .post {{ grid-template-columns: 1fr }} .post img {{ aspect-ratio: 4 / 3 }} }}
.post .txt {{ padding: 1.5rem; display: grid; align-content: space-between; gap: 1rem; color: #F6F1EA }}
.post .t {{ font: 400 clamp(1.8rem, 3.4vw, 2.5rem)/1 var(--serif) }}
.post .t em {{ background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent }}
.post .s {{ font-size: .85rem; opacity: .75 }}
.post img {{ width: 100%; height: 100%; object-fit: cover; display: block }}
.gradcard {{ border-radius: 22px; padding: 1.5rem; background: var(--grad); color: #fff; display: grid; gap: .4rem }}
.gradcard .k {{ font: 600 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; opacity: .85 }}
.gradcard .b {{ font: 400 2rem/1 var(--serif) }}
.reco {{ background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 1.6rem 1.8rem; display: grid; gap: .7rem; max-width: 800px }}
.reco h2 {{ font-size: 2.2rem }}
.reco p {{ color: var(--muted) }}
.reco strong {{ color: var(--fg) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · direction Coucher de soleil</p>
  <h1>Six façons de souder <em>wen</em> et <em>zy</em></h1>
  <p class="lede">Direction retenue : crème, encre, dégradé corail → violet, titres en Instrument Serif. Le logo garde ses deux écritures, mais « wen » et « zy » ne doivent plus paraître décollés. Voici six versions, du simple rapprochement à la signature. Choisissez celle qui vous convient.</p>
</header>
<div class="grid">{cards}
</div>
<section style="display:grid;gap:1.25rem" aria-labelledby="sit">
  <h2 id="sit" style="font-size:clamp(2rem,4.5vw,2.8rem)">En situation, avec la version B</h2>
  <div class="sit">
    <div class="phone"><div class="screen">
      <div class="hero"><img src="{img('images/photos/univers-sorties-soiree.webp')}" alt="">
        <div class="nav"><img src="{uri('lie-transparent.svg')}" alt="Wenzy"><span class="r"><span class="s">S'inscrire</span><span class="burger"></span></span></div>
        <div class="card"><span class="city">Casablanca</span><p class="h">Your people are <span>out there.</span></p><span class="cta">Réserver ma place</span></div>
      </div>
      <div class="list"><p class="lt">Cette semaine</p>
        <div class="item"><img src="{img('images/photos/rencontre-groupe-diner.webp')}" alt=""><div><b>Dîner entre inconnus</b><span class="pill">Table de 6</span><small>Jeu. 20 h · Maarif</small></div><span class="book">Réserver</span></div>
      </div>
    </div></div>
    <div class="side">
      <div class="post"><div class="txt"><p class="t">Six inconnus. Une table. <em>De nouveaux amis.</em></p><p class="s">Post Instagram · @wenzy</p></div><img src="{img('images/photos/rencontre-groupe-sport.webp')}" alt=""></div>
      <div class="gradcard"><p class="k">Panneau</p><p class="b">Your people are out there.</p></div>
    </div>
  </div>
</section>
<section class="reco" aria-labelledby="reco">
  <p class="eyebrow">Mon avis</p>
  <h2 id="reco">B, Lié</h2>
  <p><strong>C'est celle qui règle le mieux le décollement</strong> sans changer l'esprit du logo : le « z » enchaîne directement sur le « n », on lit un seul mot. A est plus sage, C plus spectaculaire, F ajoute le lien en dessin.</p>
  <p>Dites-moi la lettre qui vous plaît, ou un mélange (par exemple B avec le trait de F). Je finalise ensuite le logo et je prépare tous les fichiers.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
