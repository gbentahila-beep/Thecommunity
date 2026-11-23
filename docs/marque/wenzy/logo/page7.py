import base64, sys, math
L, OUT = sys.argv[1], sys.argv[2]
P = "/home/user/Thecommunity/apps/web/public/"
def uri(f): return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()
def img(f): return "data:image/webp;base64," + base64.b64encode(open(P + f, "rb").read()).decode()

def seats(taken, total=6, size=64, on="#E4473A", off="#E9DCCF", me=None):
    R, r, c = size * .34, size * .12, size / 2
    out = ""
    for i in range(total):
        a = -math.pi / 2 + i * 2 * math.pi / total
        col = on if i < taken else off
        out += f'<circle cx="{c + R*math.cos(a):.1f}" cy="{c + R*math.sin(a):.1f}" r="{r:.1f}" fill="{col}"/>'
    return f'<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" aria-hidden="true">{out}</svg>'

C = [
 ("tablee", "1", "La tablée",
  "Six points en cercle : six personnes autour d'une table, vues d'en haut. Le point rouge, c'est vous qui arrivez. Le symbole raconte exactement ce que fait Wenzy, et il devient un élément du site : les places prises à un dîner se remplissent point par point.",
  "Simple, pro, et unique dans votre secteur. Fonctionne en tout petit (favicon) comme sur une façade."),
 ("lien", "2", "Le sourire",
  "Deux points de couleurs différentes, deux personnes, reliés par un trait qui forme un sourire. C'est la rencontre et ce qu'elle produit, en trois traits.",
  "Très mémorable, mais proche de l'univers des émojis : à garder sobre, sans jamais l'animer en clin d'œil."),
 ("wdeux", "3", "Le w à deux",
  "Le w du nom devient deux personnes côte à côte, bras levés, qui se tiennent la main au milieu. Le symbole est dans le mot, rien à ajouter.",
  "Le plus intégré. En petit, les deux têtes peuvent se lire comme un tréma (ẅ) : à tester avant de choisir."),
]

cards = ""
for key, n, name, desc, note in C:
    extra = ""
    if key == "tablee":
        extra = f'''<div class="system"><p class="k">Le symbole devient un repère sur le site</p>
<div class="seatrow"><div>{seats(2)}<span>2 / 6 · places libres</span></div><div>{seats(5)}<span>5 / 6 · dernière place</span></div><div>{seats(6, on="#2B1633")}<span>Complet</span></div></div></div>'''
    cards += f'''
<article class="cpt" aria-labelledby="c{n}">
  <div class="head"><p class="num">Piste {n}</p><h2 id="c{n}">{name}</h2><p class="desc">{desc}</p></div>
  <div class="hero"><img src="{uri(key+'-creme.svg')}" alt="Logo Wenzy, piste {name}, sur crème"></div>
  <div class="row">
    <div class="tile"><img src="{uri(key+'-grenade.svg')}" alt="Sur grenade"></div>
    <div class="tile"><img src="{uri(key+'-aubergine.svg')}" alt="Sur aubergine"></div>
    <div class="icon-wrap"><img class="icon" src="{uri('icone-'+key+'.svg')}" alt="Icône d'application"><span>Icône</span></div>
  </div>
  {extra}
  <p class="note"><b>À savoir :</b> {note}</p>
</article>'''

html = f'''<title>Wenzy, rencontre et lien</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : présentation d'agence ; une piste par bloc pleine largeur, puis la piste recommandée en situation. */
:root {{
  --grenade: #E4473A; --abricot: #FFB37A; --pistache: #C9DB8A; --creme: #FFF7EE; --aubergine: #2B1633;
  --bg: #FFF7EE; --panel: #ffffff; --fg: #2B1633; --muted: #6d5f6f; --line: #f0e4d6;
  --display: "Outfit", "Inter", sans-serif; --ui: "Inter", ui-sans-serif, system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #1d0f23; --panel: #2a1832; --fg: #FFF7EE; --muted: #c7b6c4; --line: #3c2745; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #1d0f23; --panel: #2a1832; --fg: #FFF7EE; --muted: #c7b6c4; --line: #3c2745; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1080px; margin: 0 auto; display: grid; gap: 3rem }}
h1, h2, h3 {{ margin: 0; text-wrap: balance; line-height: 1.1; font-family: var(--display); font-weight: 700; letter-spacing: -.02em }}
p {{ margin: 0 }}
.eyebrow {{ font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: var(--grenade); font-weight: 600 }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.3rem, 6vw, 3.8rem) }}
.lede {{ max-width: 66ch; color: var(--muted); font-size: 1.05rem }}
.palette {{ display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .6rem; max-width: 760px }}
@media (max-width: 560px) {{ .palette {{ grid-template-columns: repeat(3, minmax(0, 1fr)) }} }}
.sw {{ display: grid; gap: .2rem; font-size: .8rem }}
.sw i {{ height: 56px; border-radius: 12px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .07) }}
.sw span {{ color: var(--muted); font-variant-numeric: tabular-nums }}
.cpt {{ background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: clamp(1.1rem, 3vw, 2rem); display: grid; gap: 1.1rem }}
.head {{ display: grid; gap: .4rem }}
.num {{ font: 600 .72rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
.head h2 {{ font-size: clamp(1.7rem, 4vw, 2.3rem) }}
.desc {{ color: var(--muted); max-width: 70ch }}
.hero img {{ width: 100%; border-radius: 16px; display: block }}
.row {{ display: grid; grid-template-columns: 1fr 1fr auto; gap: .75rem; align-items: stretch }}
@media (max-width: 640px) {{ .row {{ grid-template-columns: 1fr 1fr }} .icon-wrap {{ grid-column: 1 / -1 }} }}
.tile img {{ width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block }}
.icon-wrap {{ display: grid; justify-items: center; align-content: center; gap: .3rem; font-size: .78rem; color: var(--muted); padding: 0 .5rem }}
.icon {{ width: 84px; height: 84px; display: block }}
.system {{ background: var(--creme); border-radius: 14px; padding: 1rem 1.2rem; display: grid; gap: .7rem; box-shadow: inset 0 0 0 1px #f0e4d6 }}
.system .k {{ font: 600 .72rem/1 var(--ui); letter-spacing: .12em; text-transform: uppercase; color: #6d5f6f }}
.seatrow {{ display: flex; flex-wrap: wrap; gap: 1.5rem }}
.seatrow div {{ display: flex; align-items: center; gap: .6rem; font-size: .85rem; color: #2B1633 }}
.note {{ font-size: .9rem; color: var(--muted); border-top: 1px solid var(--line); padding-top: .9rem }}
.note b {{ color: var(--fg) }}
.scene {{ display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; align-items: start }}
@media (max-width: 820px) {{ .scene {{ grid-template-columns: 1fr }} }}
.phone {{ background: #2B1633; border-radius: 36px; padding: 10px; width: 100%; max-width: 320px }}
.ph {{ background: #FFF7EE; border-radius: 28px; overflow: hidden; display: grid; color: #2B1633 }}
.ph-top {{ padding: 1rem 1.1rem .6rem; display: flex; justify-content: space-between; align-items: center }}
.ph-top img {{ height: 30px }}
.ph-top span {{ font-size: .8rem; color: #6d5f6f }}
.ph-photo {{ margin: 0 1.1rem; border-radius: 20px; overflow: hidden; aspect-ratio: 4 / 3.4 }}
.ph-photo img {{ width: 100%; height: 100%; object-fit: cover; display: block }}
.ph-body {{ padding: 1rem 1.1rem 1.1rem; display: grid; gap: .35rem }}
.ph-tag {{ justify-self: start; background: #C9DB8A; font: 600 .72rem/1 var(--ui); padding: .4rem .7rem; border-radius: 999px }}
.ph-body .t {{ font: 700 1.45rem/1.1 var(--display) }}
.ph-body .m {{ font-size: .85rem; color: #6d5f6f }}
.ph-seats {{ display: flex; align-items: center; gap: .6rem; font-size: .85rem; margin-top: .3rem }}
.ph-bar {{ background: #fff; display: flex; justify-content: space-between; align-items: center; padding: .9rem 1.1rem }}
.ph-bar b {{ font-size: 1.05rem }}
.ph-bar span {{ background: #E4473A; color: #fff; font-weight: 600; font-size: .9rem; padding: .65rem 1.15rem; border-radius: 999px }}
.side {{ display: grid; gap: 1.25rem }}
.post {{ display: grid; grid-template-columns: 1fr 1fr; border-radius: 20px; overflow: hidden; background: #E4473A; min-height: 300px }}
@media (max-width: 520px) {{ .post {{ grid-template-columns: 1fr }} .post img {{ aspect-ratio: 4 / 3 }} }}
.post .txt {{ padding: 1.5rem; display: grid; align-content: space-between; gap: 1rem; color: #FFF7EE }}
.post .h {{ font: 700 clamp(1.6rem, 3.2vw, 2.2rem)/1.05 var(--display); letter-spacing: -.02em }}
.post .s {{ font-size: .85rem; opacity: .85 }}
.post img {{ width: 100%; height: 100%; object-fit: cover; display: block }}
.duo {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem }}
@media (max-width: 520px) {{ .duo {{ grid-template-columns: 1fr }} }}
.card {{ border-radius: 20px; padding: 1.4rem; display: grid; gap: .5rem; align-content: center; min-height: 150px }}
.card.au {{ background: #2B1633; color: #FFF7EE }}
.card.pi {{ background: #C9DB8A; color: #2B1633 }}
.card .k {{ font: 600 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; opacity: .8 }}
.card .big {{ font: 700 1.6rem/1.1 var(--display) }}
.reco {{ background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 1.6rem 1.8rem; display: grid; gap: .7rem; max-width: 780px }}
.reco h2 {{ font-size: 1.8rem }}
.reco p {{ color: var(--muted) }}
.reco strong {{ color: var(--fg) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · rencontre et lien</p>
  <h1>Un symbole pour la rencontre</h1>
  <p class="lede">Retour à un style professionnel, au niveau des grandes applications sociales : un nom net en minuscules, une palette chaude et franche, et un symbole qui raconte la rencontre. Trois pistes : des points autour d'une table, deux personnes reliées par un sourire, et deux petits personnages cachés dans le w.</p>
  <div class="palette" aria-label="Palette">
    <div class="sw"><i style="background:#E4473A"></i><b>Grenade</b><span>#E4473A</span></div>
    <div class="sw"><i style="background:#2B1633"></i><b>Aubergine</b><span>#2B1633</span></div>
    <div class="sw"><i style="background:#FFB37A"></i><b>Abricot</b><span>#FFB37A</span></div>
    <div class="sw"><i style="background:#C9DB8A"></i><b>Pistache</b><span>#C9DB8A</span></div>
    <div class="sw"><i style="background:#FFF7EE"></i><b>Crème</b><span>#FFF7EE</span></div>
  </div>
</header>
{cards}
<section style="display:grid;gap:1.25rem" aria-labelledby="sit">
  <h2 id="sit" style="font-size:clamp(1.6rem,4vw,2.2rem)">En situation, avec la tablée</h2>
  <div class="scene">
    <div class="phone"><div class="ph">
      <div class="ph-top"><img src="{uri('tablee-creme.svg')}" alt="Wenzy"><span>Casablanca</span></div>
      <div class="ph-photo"><img src="{img('images/photos/rencontre-groupe-diner.webp')}" alt="Table partagée"></div>
      <div class="ph-body"><span class="ph-tag">Dîners</span><p class="t">Le dîner du jeudi</p><p class="m">Jeu. 20 h · Maarif · restaurant surprise</p>
        <div class="ph-seats">{seats(4, size=40)}<span>4 personnes inscrites, 2 places</span></div></div>
      <div class="ph-bar"><b>350 DH</b><span>Réserver ma place</span></div>
    </div></div>
    <div class="side">
      <div class="post"><div class="txt"><p class="h">Six chaises. Cinq inconnus. Et vous.</p><p class="s">Post Instagram · @wenzy</p></div><img src="{img('images/photos/univers-sorties-soiree.webp')}" alt="Soirée entre amis"></div>
      <div class="duo">
        <div class="card au"><p class="k">Panneau</p><p class="big">Your people are out there.</p></div>
        <div class="card pi"><p class="k">Signature arabe</p><p class="big" lang="ar" dir="rtl" style="font-family:Tahoma, sans-serif">وينزي</p></div>
      </div>
    </div>
  </div>
</section>
<section class="reco" aria-labelledby="reco">
  <p class="eyebrow">Ma recommandation</p>
  <h2 id="reco">Piste 1, la tablée</h2>
  <p><strong>C'est la plus professionnelle et celle qui a le plus de sens</strong> : six personnes autour d'une table, c'est littéralement un dîner Wenzy. Elle ne ressemble à aucune marque connue, ne rappelle ni les enfants ni les émojis, et devient un vrai outil sur le site (les places qui se remplissent), dans les stories et sur les supports imprimés.</p>
  <p>Dites-moi la piste qui vous parle, ou ce qui vous gêne. Le nom est en Outfit, net et chaleureux ; la palette peut encore bouger une fois le symbole choisi.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
