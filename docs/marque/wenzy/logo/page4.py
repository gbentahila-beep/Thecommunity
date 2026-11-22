import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
def uri(f): return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()

P = [
 ("corail", "1", "Corail", "Indigo profond et corail, avec un lilas en accent. Vif le jour, élégant le soir : elle va aussi bien au brunch qu'au dîner.",
  [("Indigo", "#1F1B4D"), ("Corail", "#FF6B57"), ("Lilas", "#CBBEF5"), ("Lait", "#FBF7F2")]),
 ("sanguine", "2", "Sanguine", "Bordeaux et orange sanguine, avec un rose tendre. La plus chaleureuse : elle évoque les épices, le coucher de soleil et la table partagée.",
  [("Bordeaux", "#4A0D24"), ("Sanguine", "#FF5A36"), ("Rose", "#FFC2D1"), ("Crème", "#FFF8F3")]),
 ("sapin", "3", "Sapin", "Vert sapin et abricot, avec une menthe pâle. Fraîche et naturelle : bien-être, plein air, thé à la menthe. Le vert reste profond pour ne pas faire « bio ».",
  [("Sapin", "#0F4C3A"), ("Abricot", "#FF9F6B"), ("Menthe", "#CFEBDD"), ("Sable", "#FAF7F0")]),
 ("fuchsia", "4", "Fuchsia", "Noir d'encre et fuchsia, avec une pêche douce. La plus mode et la plus « soirée » : très graphique, elle se remarque dans un fil Instagram.",
  [("Encre", "#1A1423"), ("Fuchsia", "#E8336E"), ("Pêche", "#FFD3B8"), ("Nacre", "#FFF9F5")]),
]

cards = ""
for key, n, name, desc, sw in P:
    main, dot, acc, light = [c for _, c in sw]
    swh = "".join(f'<div class="sw"><i style="background:{c}"></i><b>{nm}</b><span>{c}</span></div>' for nm, c in sw)
    cards += f'''
<article class="pal" aria-labelledby="p{n}">
  <div class="logo-main" style="background:{light}"><img src="{uri(key+'-clair.svg')}" alt="Logo Wenzy, palette {name}"></div>
  <div class="row">
    <div class="dark" style="background:{main}"><img src="{uri(key+'-fonce.svg')}" alt="Sur fond {sw[0][0].lower()}"></div>
    <img class="ico" src="{uri(key+'-icone.svg')}" alt="Icône">
    <img class="ico" src="{uri(key+'-icone-accent.svg')}" alt="Icône, variante claire">
  </div>
  <div class="ui" style="background:{light}; color:{main}">
    <span class="chip" style="background:{acc}; color:{main}">Jeudi · 20 h</span>
    <p class="ui-t">Dîner entre inconnus</p>
    <p class="ui-m" style="color:{main}">Maarif · 6 personnes · 350 MAD</p>
    <span class="btn" style="background:{main}; color:{light}">Réserver ma place<i style="background:{dot}"></i></span>
  </div>
  <div class="meta">
    <p class="num">Palette {n}</p>
    <h2 id="p{n}">{name}</h2>
    <p class="desc">{desc}</p>
    <div class="sws">{swh}</div>
  </div>
</article>'''

html = f'''<title>Wenzy, nouvelles couleurs</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : quatre cartes identiques, même logo et même police ; seule la palette change. */
:root {{
  --bg: #f6f5f3; --panel: #ffffff; --fg: #17151c; --muted: #5f5c66; --line: #e4e1dc;
  --ui: "Inter", ui-sans-serif, system-ui, sans-serif; --display: "Outfit", "Inter", sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #121115; --panel: #1c1b20; --fg: #efedf2; --muted: #a7a3ad; --line: #302e36; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #121115; --panel: #1c1b20; --fg: #efedf2; --muted: #a7a3ad; --line: #302e36; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1120px; margin: 0 auto; display: grid; gap: 2.5rem }}
h1, h2 {{ margin: 0; text-wrap: balance; line-height: 1.15; font-family: var(--display); font-weight: 700 }}
p {{ margin: 0 }}
.eyebrow {{ font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600 }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2rem, 5.5vw, 3.2rem); letter-spacing: -.02em }}
.lede {{ max-width: 66ch; color: var(--muted); font-size: 1.05rem }}
.rules {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem }}
.rules div {{ background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.1rem; display: grid; gap: .25rem; align-content: start }}
.rules b {{ font-size: .95rem }}
.rules span {{ color: var(--muted); font-size: .9rem }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem }}
@media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr }} }}
.pal {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.25rem; display: grid; gap: .9rem; align-content: start }}
.logo-main {{ border-radius: 12px; padding: 2.2rem 1.5rem; display: grid; place-items: center; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .06) }}
.logo-main img {{ width: min(320px, 88%); height: auto }}
.row {{ display: grid; grid-template-columns: 1fr auto auto; gap: .6rem }}
.dark {{ border-radius: 12px; display: grid; place-items: center; padding: 1rem }}
.dark img {{ width: min(170px, 85%) }}
.ico {{ width: 76px; height: 76px; display: block }}
@media (max-width: 420px) {{ .row {{ grid-template-columns: 1fr 1fr }} .dark {{ grid-column: 1 / -1 }} .ico {{ justify-self: center }} }}
.ui {{ border-radius: 12px; padding: 1rem 1.1rem; display: grid; gap: .3rem; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .06) }}
.chip {{ justify-self: start; font: 600 .72rem/1 var(--ui); padding: .4rem .65rem; border-radius: 999px }}
.ui-t {{ font: 700 1.2rem/1.2 var(--display); margin-top: .25rem }}
.ui-m {{ font-size: .85rem; opacity: .75 }}
.btn {{ justify-self: start; margin-top: .45rem; font: 600 .85rem/1 var(--ui); padding: .7rem 1.05rem; border-radius: 999px; display: inline-flex; gap: .5rem; align-items: center }}
.btn i {{ width: 8px; height: 8px; border-radius: 50% }}
.meta {{ display: grid; gap: .4rem; padding: .25rem .25rem 0 }}
.num {{ font: 600 .72rem/1 var(--ui); letter-spacing: .12em; text-transform: uppercase; color: var(--muted) }}
.meta h2 {{ font-size: 1.45rem }}
.desc {{ color: var(--muted); font-size: .93rem }}
.sws {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; margin-top: .4rem }}
.sw {{ display: grid; gap: .2rem; font: 500 .72rem/1.3 var(--ui) }}
.sw i {{ display: block; height: 38px; border-radius: 8px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .08) }}
.sw span {{ color: var(--muted); font-variant-numeric: tabular-nums }}
.next {{ background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 1.5rem 1.75rem; display: grid; gap: .6rem; max-width: 760px }}
.next p {{ color: var(--muted) }}
.next strong {{ color: var(--fg) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · nouvelles couleurs</p>
  <h1>Quatre palettes, sans bleu ni jaune</h1>
  <p class="lede">Le bleu et le jaune, avec un W tout seul, rappelaient une grande enseigne marocaine. On retire les deux : nouvelles couleurs, et l'icône montre désormais le mot entier « wenzy » au lieu d'un W isolé. Le logo est ici en Outfit (police 1 de la page précédente), avec le point levé ; la police reste à confirmer.</p>
</header>
<div class="rules">
  <div><b>Plus de bleu + jaune</b><span>Aucune des quatre palettes n'utilise ce duo.</span></div>
  <div><b>Plus de W isolé</b><span>Icône d'application et avatar Instagram : le mot entier avec son point.</span></div>
  <div><b>À vérifier aussi</b><span>Les couleurs des grandes marques locales (télécoms, banques, supermarchés), pour ne ressembler à aucune.</span></div>
</div>
<div class="grid">{cards}
</div>
<section class="next" aria-labelledby="nx">
  <p class="eyebrow" id="nx">Ma recommandation et la suite</p>
  <p><strong>Palette 1, Corail</strong> : la plus polyvalente, de jour comme de soir, et elle ne ressemble à aucune grande marque marocaine que je connaisse. <strong>Palette 2, Sanguine</strong>, si vous voulez plus de chaleur.</p>
  <p>Dites-moi <strong>la palette</strong> et <strong>la police</strong> (Outfit ou une autre des six), et je finalise le logo, les icônes et les règles d'usage.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
