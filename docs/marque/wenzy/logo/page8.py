import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
P = "/home/user/Thecommunity/apps/web/public/"
def uri(f): return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()
def img(f): return "data:image/webp;base64," + base64.b64encode(open(P + f, "rb").read()).decode()
V = [
 ("kaushan", "1", "Pinceau", "Kaushan Script", "Un « zy » tracé d'un coup de pinceau, avec de l'élan. Le plus dynamique : il donne de l'énergie au nom sans le rendre enfantin."),
 ("caveat", "2", "Feutre", "Caveat", "Comme un mot écrit au feutre sur un carton d'invitation. Le plus chaleureux et le plus spontané."),
 ("dancing", "3", "Plume", "Dancing Script", "Une écriture liée et élégante, à la plume. Le plus chic des quatre, un peu plus classique."),
 ("yellowtail", "4", "Rétro", "Yellowtail", "Une écriture penchée façon enseigne des années 60. Du caractère, un côté café-terrasse."),
]
cards = ""
for k, n, name, fnt, desc in V:
    cards += f'''
<article class="v" aria-labelledby="v{n}">
  <div class="main"><img src="{uri(k+'-cobalt.svg')}" alt="Logo Wenzy duo {name}, sur cobalt"></div>
  <div class="row"><img src="{uri(k+'-chaux.svg')}" alt="Sur chaux"><img src="{uri(k+'-safran.svg')}" alt="Sur safran"><img src="{uri(k+'-nuit.svg')}" alt="Sur nuit"></div>
  <div class="meta"><img class="ico" src="{uri(k+'-icone.svg')}" alt="Icône"><div><p class="num">Duo {n} · {fnt}</p><h3 id="v{n}">{name}</h3><p class="desc">{desc}</p></div></div>
</article>'''
html = f'''<title>Wenzy, logo duo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Kaushan+Script&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : quatre duos en grille, puis le duo recommandé sur le site ; tout dans la palette Midi. */
:root {{
  --cobalt: #1340A8; --safran: #F5C242; --chaux: #FBFAF6; --nuit: #10162B; --figue: #F28BA8;
  --bg: #FBFAF6; --panel: #ffffff; --fg: #10162B; --muted: #5a6072; --line: #e7e3d6;
  --display: "Outfit", "Inter", sans-serif; --ui: "Inter", ui-sans-serif, system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #0c1122; --panel: #141a30; --fg: #eef0f6; --muted: #a3a9bd; --line: #262d48; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #0c1122; --panel: #141a30; --fg: #eef0f6; --muted: #a3a9bd; --line: #262d48; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1120px; margin: 0 auto; display: grid; gap: 3rem }}
h1, h2, h3 {{ margin: 0; text-wrap: balance; line-height: 1.05; font-family: var(--display); font-weight: 800; letter-spacing: -.03em }}
p {{ margin: 0 }}
.eyebrow {{ font: 600 .75rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.4rem, 6.5vw, 4rem) }}
header h1 em {{ font: 400 1.15em/1 "Kaushan Script", cursive; color: var(--cobalt); letter-spacing: 0 }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) header h1 em {{ color: var(--safran) }} }}
:root[data-theme="dark"] header h1 em {{ color: var(--safran) }}
.lede {{ max-width: 66ch; color: var(--muted); font-size: 1.05rem }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem }}
@media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr }} }}
.v {{ background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 1rem; display: grid; gap: .7rem; align-content: start }}
.main img {{ width: 100%; border-radius: 14px; display: block }}
.row {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem }}
.row img {{ width: 100%; border-radius: 10px; display: block; box-shadow: inset 0 0 0 1px #e7e3d6 }}
.meta {{ display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start; padding: .3rem .3rem 0 }}
.ico {{ width: 72px; height: 72px }}
.num {{ font: 600 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
.meta h3 {{ font-size: 1.45rem; margin-top: .25rem }}
.desc {{ color: var(--muted); font-size: .92rem; margin-top: .2rem }}
.sit {{ display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start }}
@media (max-width: 820px) {{ .sit {{ grid-template-columns: 1fr }} }}
.phone {{ background: #0d0d0d; border-radius: 42px; padding: 9px; max-width: 320px; width: 100% }}
.screen {{ border-radius: 34px; overflow: hidden; background: #FBFAF6; color: #10162B }}
.hero {{ position: relative; height: 440px }}
.hero > img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }}
.nav {{ position: absolute; top: 14px; left: 10px; right: 10px; background: #fff; border-radius: 999px; display: flex; align-items: center; justify-content: space-between; padding: .4rem .5rem .4rem .9rem; box-shadow: 0 6px 20px -8px rgb(0 0 0 / .3) }}
.nav img {{ height: 30px }}
.nav .r {{ display: flex; align-items: center; gap: .5rem }}
.nav .s {{ font: 600 .78rem/1 var(--ui); padding: .55rem .9rem; border-radius: 999px; background: #1340A8; color: #fff }}
.burger {{ width: 18px; height: 10px; border-top: 2px solid #10162B; border-bottom: 2px solid #10162B; margin-right: .35rem }}
.card {{ position: absolute; left: 10px; right: 10px; bottom: 12px; background: #FBFAF6; border-radius: 24px; padding: 1.1rem; display: grid; gap: .7rem }}
.city {{ font: 600 .78rem/1 var(--ui); display: flex; gap: .35rem; align-items: center }}
.city::before {{ content: ""; width: 8px; height: 8px; border-radius: 50%; background: #F5C242 }}
.h {{ font: 800 1.85rem/1.02 var(--display); letter-spacing: -.035em }}
.h em {{ font: 400 1.12em/1 "Kaushan Script", cursive; color: #1340A8; letter-spacing: 0 }}
.cta {{ text-align: center; font: 600 .9rem/1 var(--ui); padding: .9rem; border-radius: 999px; background: #1340A8; color: #fff }}
.list {{ padding: 1rem 1.1rem 1.3rem; display: grid; gap: .8rem }}
.list .lt {{ font: 800 1.3rem/1 var(--display); letter-spacing: -.03em }}
.item {{ display: grid; grid-template-columns: 52px 1fr auto; gap: .7rem; align-items: center; border-top: 1px solid #ebe7dc; padding-top: .8rem }}
.item img {{ width: 52px; height: 52px; border-radius: 12px; object-fit: cover }}
.item b {{ font-size: .9rem; display: block }}
.item small {{ font-size: .74rem; color: #5a6072; display: block }}
.pill {{ display: inline-block; font: 600 .66rem/1 var(--ui); padding: .28rem .5rem; border-radius: 999px; background: #F5C242; color: #10162B; margin: .2rem 0 }}
.book {{ font: 600 .75rem/1 var(--ui); padding: .5rem .8rem; border-radius: 999px; border: 1.5px solid #10162B }}
.side {{ display: grid; gap: 1.25rem }}
.post {{ display: grid; grid-template-columns: 1fr 1fr; border-radius: 22px; overflow: hidden; background: #1340A8; min-height: 300px }}
@media (max-width: 520px) {{ .post {{ grid-template-columns: 1fr }} .post img {{ aspect-ratio: 4 / 3 }} }}
.post .txt {{ padding: 1.5rem; display: grid; align-content: space-between; gap: 1rem; color: #FBFAF6 }}
.post .t {{ font: 800 clamp(1.6rem, 3.2vw, 2.2rem)/1.02 var(--display); letter-spacing: -.035em }}
.post .t em {{ font: 400 1.12em/1 "Kaushan Script", cursive; color: #F5C242; letter-spacing: 0 }}
.post .s {{ font-size: .85rem; opacity: .8 }}
.post img {{ width: 100%; height: 100%; object-fit: cover; display: block }}
.duo2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem }}
@media (max-width: 520px) {{ .duo2 {{ grid-template-columns: 1fr }} }}
.tile {{ border-radius: 22px; padding: 1.4rem; display: grid; gap: .5rem; align-content: center; min-height: 150px }}
.tile .k {{ font: 600 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; opacity: .75 }}
.tile.s {{ background: #F5C242; color: #10162B }} .tile.f {{ background: #F28BA8; color: #10162B }}
.tile .b {{ font: 800 1.5rem/1.1 var(--display); letter-spacing: -.03em }}
.reco {{ background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 1.6rem 1.8rem; display: grid; gap: .7rem; max-width: 800px }}
.reco h2 {{ font-size: 1.8rem }}
.reco p {{ color: var(--muted) }}
.reco strong {{ color: var(--fg) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · le duo, couleurs Midi</p>
  <h1>Deux écritures qui se <em>rencontrent</em></h1>
  <p class="lede">On garde les couleurs Midi (cobalt, safran, chaux, nuit, figue) et on améliore le logo en duo : « wen » en lettres nettes et solides, « zy » écrit à la main. Deux personnalités dans un seul mot, comme deux inconnus à la même table. Le w n'est plus jamais seul : l'icône montre le « zy ». Quatre écritures pour le « zy », chacune sur cobalt (le logo principal), chaux, safran et nuit.</p>
</header>
<div class="grid">{cards}
</div>
<section style="display:grid;gap:1.25rem" aria-labelledby="sit">
  <h2 id="sit" style="font-size:clamp(1.6rem,4vw,2.2rem)">En situation, avec le duo 1</h2>
  <div class="sit">
    <div class="phone"><div class="screen">
      <div class="hero"><img src="{img('images/photos/univers-sorties-soiree.webp')}" alt="">
        <div class="nav"><img src="{uri('kaushan-chaux-transparent.svg')}" alt="Wenzy"><span class="r"><span class="s">S'inscrire</span><span class="burger"></span></span></div>
        <div class="card"><span class="city">Casablanca</span><p class="h">Your people are <em>out there.</em></p><span class="cta">Réserver ma place</span></div>
      </div>
      <div class="list"><p class="lt">Cette semaine</p>
        <div class="item"><img src="{img('images/photos/rencontre-groupe-diner.webp')}" alt=""><div><b>Dîner entre inconnus</b><span class="pill">Table de 6</span><small>Jeu. 20 h · Maarif</small></div><span class="book">Réserver</span></div>
      </div>
    </div></div>
    <div class="side">
      <div class="post"><div class="txt"><p class="t">Six inconnus. Une table. <em>De nouveaux amis.</em></p><p class="s">Post Instagram · @wenzy</p></div><img src="{img('images/photos/rencontre-groupe-sport.webp')}" alt=""></div>
      <div class="duo2">
        <div class="tile s"><p class="k">Pastille d'univers</p><p class="b">Dîners · Sport · Ateliers</p></div>
        <div class="tile f"><p class="k">Accent figue</p><p class="b">Soirées entre filles</p></div>
      </div>
    </div>
  </div>
</section>
<section class="reco" aria-labelledby="reco">
  <p class="eyebrow">Ma recommandation</p>
  <h2 id="reco">Duo 1, Pinceau</h2>
  <p><strong>Le meilleur équilibre entre énergie et sérieux.</strong> Le coup de pinceau donne du mouvement, il reste lisible en petit, et le safran sur cobalt claque sans faire penser à une enseigne : le nom n'est plus un W isolé, et l'écriture manuscrite change complètement la lecture. Le « zy » seul fait une icône immédiatement reconnaissable.</p>
  <p>Dites-moi le duo qui vous plaît. Je le redessine ensuite au détail près (liaison entre « n » et « z », épaisseurs, crénage), puis je prépare tous les fichiers et le brand book.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
