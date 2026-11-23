import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
P = "/home/user/Thecommunity/apps/web/public/"
def uri(f): return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()
def img(f): return "data:image/webp;base64," + base64.b64encode(open(P + f, "rb").read()).decode()

F = [
 ("dm", "1", "DM Serif Display", "Chic, avec empattements", "'DM Serif Display'", 400, "Celle de votre planche. Élégante et chaleureuse, façon magazine. Avec la terre cuite et le soleil, c'est la plus « riad contemporain »."),
 ("outfit", "2", "Outfit", "Ronde et géométrique", "'Outfit'", 700, "Plus moderne et plus simple. Lisible partout, même en tout petit. Le soleil apporte la chaleur que la police n'a pas."),
 ("fredoka", "3", "Fredoka", "Douce et amicale", "'Fredoka'", 600, "Terminaisons arrondies, très accueillante. La plus complice des six, à condition de rester sobre sur le reste."),
 ("jakarta", "4", "Plus Jakarta Sans", "Élégante et neutre", "'Plus Jakarta Sans'", 800, "Une sans-serif fine et premium, qui laisse parler les couleurs et les photos."),
 ("sora", "5", "Sora", "Nette et contemporaine", "'Sora'", 700, "Droite et précise, côté application bien faite. Contraste intéressant avec les couleurs artisanales."),
 ("unbounded", "6", "Unbounded", "Large et affirmée", "'Unbounded'", 700, "Des lettres larges, très visibles sur une affiche. Énergique, un peu festival."),
]

cards = ""
for key, n, name, mood, fam, wt, desc in F:
    cards += f'''
<article class="font" aria-labelledby="f{n}">
  <div class="t-terre"><img src="{uri(key+'-sur-terre.svg')}" alt="Logo Wenzy en {name}, sur terre cuite"></div>
  <div class="t-sable"><img src="{uri(key+'-atlantique.svg')}" alt="Logo Wenzy en {name}, sur sable"></div>
  <div class="meta">
    <p class="num">Police {n} · {mood}</p>
    <h3 id="f{n}">{name}</h3>
    <p class="sample" style="font-family:{fam}, serif; font-weight:{wt}">Your people are <span>out there.</span></p>
    <p class="desc">{desc}</p>
  </div>
</article>'''

html = f'''<title>Wenzy, terre cuite et soleil</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Tajawal:wght@500;700&family=Outfit:wght@700&family=Fredoka:wght@600&family=Unbounded:wght@700&family=Sora:wght@700&family=Plus+Jakarta+Sans:wght@800&display=swap">
<style>
/* Layout : la planche de référence comme fil conducteur ; palette, symbole, six polices, puis mise en situation. */
:root {{
  --terre: #B9462A; --atlantique: #1D4466; --safran: #E3A23B; --sable: #F4EADB; --encre: #22201C;
  --bg: #F4EADB; --panel: #ffffff; --fg: #22201C; --muted: #6b6258; --line: #e6dccb; --title: #1D4466;
  --display: "DM Serif Display", Georgia, serif; --ui: "DM Sans", ui-sans-serif, system-ui, sans-serif; --ar: "Tajawal", sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #1b1916; --panel: #25221e; --fg: #f1e9dc; --muted: #b3a999; --line: #3a352e; --title: #F4EADB; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #1b1916; --panel: #25221e; --fg: #f1e9dc; --muted: #b3a999; --line: #3a352e; --title: #F4EADB; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1120px; margin: 0 auto; display: grid; gap: 3rem }}
h1, h2, h3 {{ margin: 0; text-wrap: balance; line-height: 1.1; font-family: var(--display); font-weight: 400; color: var(--title) }}
p {{ margin: 0 }}
.eyebrow {{ font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: var(--terre); font-weight: 700 }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) .eyebrow {{ color: var(--safran) }} }}
:root[data-theme="dark"] .eyebrow {{ color: var(--safran) }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.3rem, 6vw, 3.8rem) }}
header h1 em {{ color: var(--terre) }}
.lede {{ max-width: 64ch; color: var(--muted); font-size: 1.05rem }}
section {{ display: grid; gap: 1.25rem }}
section > h2 {{ font-size: clamp(1.6rem, 4vw, 2.2rem) }}
.sec-lede {{ color: var(--muted); max-width: 64ch }}
.swatches {{ display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .75rem }}
@media (max-width: 620px) {{ .swatches {{ grid-template-columns: repeat(2, minmax(0, 1fr)) }} }}
.sw {{ display: grid; gap: .3rem }}
.sw i {{ display: block; height: 96px; border-radius: 14px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .07) }}
.sw b {{ font-weight: 700 }}
.sw span {{ color: var(--muted); font-size: .85rem; font-variant-numeric: tabular-nums }}
.symbol {{ display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.5rem }}
@media (max-width: 620px) {{ .symbol {{ grid-template-columns: 1fr }} }}
.icons {{ display: flex; gap: .75rem; flex-wrap: wrap }}
.icons img {{ width: 104px; height: 104px; display: block }}
.symbol p {{ color: var(--muted); max-width: 52ch }}
.symbol strong {{ color: var(--fg) }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem }}
@media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr }} }}
.font {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.1rem; display: grid; gap: .7rem; align-content: start }}
.t-terre, .t-sable {{ border-radius: 12px; display: grid; place-items: center }}
.t-terre {{ background: var(--terre); padding: 2rem 1.25rem }}
.t-sable {{ background: var(--sable); padding: 1.1rem; box-shadow: inset 0 0 0 1px #e6dccb }}
.t-terre img {{ width: min(330px, 88%) }}
.t-sable img {{ width: min(210px, 70%) }}
.meta {{ display: grid; gap: .35rem; padding: .3rem .3rem 0 }}
.num {{ font: 700 .7rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
.meta h3 {{ font-family: var(--ui); font-weight: 700; font-size: 1.1rem; color: var(--fg) }}
.sample {{ font-size: 1.65rem; line-height: 1.1; color: var(--title); margin-top: .2rem }}
.sample span {{ color: var(--terre) }}
.desc {{ color: var(--muted); font-size: .92rem }}
/* mise en situation */
.scene {{ display: grid; grid-template-columns: 330px 1fr; gap: 1.25rem; align-items: start }}
@media (max-width: 820px) {{ .scene {{ grid-template-columns: 1fr }} }}
.phone {{ background: var(--encre); border-radius: 36px; padding: 10px; max-width: 330px; width: 100% }}
.ph-in {{ background: var(--sable); border-radius: 28px; overflow: hidden; display: grid }}
.ph-top {{ display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 1.2rem .6rem }}
.ph-top img {{ height: 26px }}
.ph-top i {{ width: 30px; height: 30px; border-radius: 50%; background: var(--atlantique) }}
.archphoto {{ margin: 0 1.2rem; border-radius: 999px 999px 18px 18px; overflow: hidden; aspect-ratio: 4 / 4.4 }}
.archphoto img {{ width: 100%; height: 100%; object-fit: cover; display: block }}
.ph-body {{ padding: 1rem 1.2rem 1.2rem; display: grid; gap: .3rem }}
.pill {{ justify-self: start; background: var(--safran); color: var(--encre); font: 700 .72rem/1 var(--ui); padding: .4rem .7rem; border-radius: 999px }}
.ph-body .t {{ font: 400 1.65rem/1.1 var(--display); color: var(--atlantique) }}
.ph-body .m {{ font-size: .85rem; color: #6b6258 }}
.ph-bar {{ background: #fff; display: flex; justify-content: space-between; align-items: center; padding: .9rem 1.2rem }}
.ph-bar b {{ color: var(--encre); font-size: 1.05rem }}
.ph-bar span {{ background: var(--terre); color: #fff; font-weight: 700; font-size: .9rem; padding: .6rem 1.1rem; border-radius: 999px }}
.side {{ display: grid; gap: 1.25rem }}
.post {{ display: grid; grid-template-columns: 1fr 1fr; border-radius: 20px; overflow: hidden; background: var(--atlantique); min-height: 330px }}
@media (max-width: 520px) {{ .post {{ grid-template-columns: 1fr }} .post img {{ aspect-ratio: 4 / 3 }} }}
.post .txt {{ padding: 1.6rem; display: grid; align-content: space-between; gap: 1rem }}
.post .h {{ font: 400 clamp(1.7rem, 3.4vw, 2.4rem)/1.05 var(--display); color: var(--sable) }}
.post .h em {{ color: var(--safran) }}
.post .handle {{ font-weight: 700; color: var(--safran); font-size: .85rem }}
.post img {{ width: 100%; height: 100%; object-fit: cover; display: block }}
.duo {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem }}
@media (max-width: 520px) {{ .duo {{ grid-template-columns: 1fr }} }}
.place {{ background: #fff; border: 1.5px dashed #d6c9b4; border-radius: 18px; padding: 1.4rem; display: grid; gap: .4rem; place-items: center; text-align: center }}
.place .k {{ font: 700 .7rem/1 var(--ui); letter-spacing: .16em; text-transform: uppercase; color: var(--terre) }}
.place .n {{ font: 400 2.3rem/1 var(--display); color: var(--atlantique) }}
.ar-card {{ background: var(--safran); border-radius: 18px; padding: 1.4rem; display: grid; gap: .5rem; color: var(--encre) }}
.ar-card .k {{ font: 700 .7rem/1 var(--ui); letter-spacing: .16em; text-transform: uppercase }}
.ar-card .a {{ font: 700 1.9rem/1.3 var(--ar); direction: rtl; text-align: right }}
.ar-card .s {{ font-size: .85rem }}
.reco {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.6rem 1.8rem; display: grid; gap: .7rem; max-width: 780px }}
.reco h2 {{ font-size: 1.8rem }}
.reco p {{ color: var(--muted) }}
.reco strong {{ color: var(--fg) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · vos couleurs</p>
  <h1>Terre cuite, atlantique <em>et un soleil</em></h1>
  <p class="lede">On repart de votre planche : ses cinq couleurs, le soleil à côté du nom, les arches pour les photos et les pastilles safran pour les univers. Le nom s'écrit en minuscules, pour éviter un grand W. Le symbole est un soleil dans une arche, sans lettre. Il reste à choisir la police du logo parmi les six ci-dessous.</p>
</header>

<section aria-labelledby="pal">
  <h2 id="pal">Les couleurs</h2>
  <div class="swatches">
    <div class="sw"><i style="background:#B9462A"></i><b>Terre cuite</b><span>#B9462A · principale</span></div>
    <div class="sw"><i style="background:#1D4466"></i><b>Atlantique</b><span>#1D4466 · titres</span></div>
    <div class="sw"><i style="background:#E3A23B"></i><b>Safran</b><span>#E3A23B · accents</span></div>
    <div class="sw"><i style="background:#F4EADB"></i><b>Sable</b><span>#F4EADB · fond</span></div>
    <div class="sw"><i style="background:#22201C"></i><b>Encre</b><span>#22201C · texte</span></div>
  </div>
</section>

<section aria-labelledby="sym">
  <h2 id="sym">Le symbole</h2>
  <div class="symbol">
    <div class="icons">
      <img src="{uri('arche-atlantique.svg')}" alt="Icône : soleil dans une arche, fond atlantique">
      <img src="{uri('arche-terre.svg')}" alt="Icône : soleil dans une arche, fond terre cuite">
      <img src="{uri('arche-sable.svg')}" alt="Icône : soleil dans une arche, fond sable">
    </div>
    <p><strong>Un soleil dans une arche</strong> : la porte d'un riad qui s'ouvre sur une journée ensoleillée. Il remplace le W, sert d'icône d'application, d'avatar Instagram et de favicon, et se décline dans les trois couleurs de fond.</p>
  </div>
</section>

<section aria-labelledby="pol">
  <h2 id="pol">Six polices pour le logo</h2>
  <p class="sec-lede">Même soleil, mêmes couleurs : seule l'écriture change. En haut sur terre cuite (le logo principal), en dessous sur sable.</p>
  <div class="grid">{cards}
  </div>
</section>

<section aria-labelledby="sit">
  <h2 id="sit">En situation, avec la police 1</h2>
  <div class="scene">
    <div class="phone"><div class="ph-in">
      <div class="ph-top"><img src="{uri('dm-terre.svg')}" alt="Wenzy"><i></i></div>
      <div class="archphoto"><img src="{img('images/photos/rencontre-groupe-diner.webp')}" alt="Table partagée"></div>
      <div class="ph-body"><span class="pill">Dîners</span><p class="t">Dîner entre inconnus</p><p class="m">Jeu. 19 h 30 · Gauthier · 6 places</p></div>
      <div class="ph-bar"><b>169 DH</b><span>Réserver</span></div>
    </div></div>
    <div class="side">
      <div class="post"><div class="txt"><p class="h">Une table. Six inconnus. <em>De nouveaux amis.</em></p><p class="handle">Post Instagram · @wenzy</p></div><img src="{img('images/photos/univers-sorties-soiree.webp')}" alt="Soirée entre amis"></div>
      <div class="duo">
        <div class="place"><p class="k">Marque-place · table 3</p><p class="n">Yasmine</p></div>
        <div class="ar-card"><p class="k">Signature arabe</p><p class="a" lang="ar">وينزي</p><p class="s" lang="ar" dir="rtl">غرباء اليوم، أصدقاء الغد</p></div>
      </div>
    </div>
  </div>
</section>

<section class="reco" aria-labelledby="reco">
  <p class="eyebrow">Ma recommandation</p>
  <h2 id="reco">Police 1, DM Serif Display</h2>
  <p>C'est la police de votre planche, et <strong>c'est elle qui va le mieux avec la terre cuite, le sable et les arches</strong> : chaleureuse, élégante, marocaine sans folklore. Le texte courant reste en DM Sans et l'arabe en Tajawal, comme sur votre planche. Si vous voulez quelque chose de plus moderne, prenez <strong>Outfit (2)</strong>.</p>
  <p>Dites-moi le numéro, et je finalise le logo, le symbole, les icônes et les règles d'usage.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
