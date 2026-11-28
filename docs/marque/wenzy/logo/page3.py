import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
def uri(f): return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()

F = [
 ("outfit", "1", "Outfit", "Ronde et géométrique", "'Outfit'", 700, "Des formes rondes et simples, très lisibles. Moderne sans être froide : la plus « facile » des six, elle plaît à tout le monde."),
 ("fredoka", "2", "Fredoka", "Douce et amicale", "'Fredoka'", 600, "Les terminaisons sont arrondies, comme du caramel. Chaleureuse et joyeuse, elle donne un côté complice. Attention à ne pas paraître trop enfantine."),
 ("unbounded", "3", "Unbounded", "Large et affirmée", "'Unbounded'", 700, "Des lettres larges qui prennent de la place. Énergique, très visible sur une affiche ou un panneau, avec un côté festival."),
 ("sora", "4", "Sora", "Nette et contemporaine", "'Sora'", 700, "Droite, précise, un peu technologique. Fait penser à une application moderne et bien faite."),
 ("jakarta", "5", "Plus Jakarta Sans", "Élégante et neutre", "'Plus Jakarta Sans'", 800, "Une sans-serif fine dans ses détails, sobre et premium. Elle laisse toute la place au point safran et aux photos."),
 ("dm", "6", "DM Serif Display", "Chic, avec empattements", "'DM Serif Display'", 400, "La seule avec empattements : plus élégante et éditoriale, façon magazine. Un contraste fort avec le côté solaire du cobalt et du safran."),
]

cards = ""
for key, n, name, mood, fam, wt, desc in F:
    cards += f'''
<article class="font" aria-labelledby="f{n}">
  <div class="logo-main"><img src="{uri(key+'-cobalt.svg')}" alt="Logo Wenzy en {name}"></div>
  <div class="duo">
    <div class="on-cobalt"><img src="{uri(key+'-sur-cobalt.svg')}" alt="Sur fond cobalt"></div>
    <img class="mono" src="{uri(key+'-monogramme.svg')}" alt="Icône">
  </div>
  <div class="meta">
    <p class="num">Police {n} · {mood}</p>
    <h2 id="f{n}">{name}</h2>
    <p class="sample" style="font-family:{fam}, sans-serif; font-weight:{wt}">Your people are out there.</p>
    <p class="desc">{desc}</p>
  </div>
</article>'''

html = f'''<title>Wenzy, choix de la police</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@700&family=Fredoka:wght@600&family=Unbounded:wght@700&family=Sora:wght@700&family=Plus+Jakarta+Sans:wght@800&family=DM+Serif+Display&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : grille de six cartes identiques, même logo, seule la police change. */
:root {{
  --bg: #fbfaf6; --panel: #ffffff; --fg: #10162b; --muted: #5a6072; --line: #e7e3d6;
  --cobalt: #1340a8; --safran: #f5c242; --chaux: #fbfaf6;
  --ui: "Inter", ui-sans-serif, system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #0c1122; --panel: #141a30; --fg: #eef0f6; --muted: #a3a9bd; --line: #262d48; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #0c1122; --panel: #141a30; --fg: #eef0f6; --muted: #a3a9bd; --line: #262d48; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1120px; margin: 0 auto; display: grid; gap: 2.5rem }}
h1, h2 {{ margin: 0; text-wrap: balance; line-height: 1.15 }}
p {{ margin: 0 }}
.eyebrow {{ font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600 }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2rem, 5.5vw, 3.2rem); font-weight: 600; letter-spacing: -.02em }}
.lede {{ max-width: 64ch; color: var(--muted); font-size: 1.05rem }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem }}
@media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr }} }}
.font {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.25rem; display: grid; gap: 1rem; align-content: start }}
.logo-main {{ background: var(--chaux); box-shadow: inset 0 0 0 1px #e7e3d6; border-radius: 12px; padding: 2.2rem 1.5rem; display: grid; place-items: center; min-height: 170px }}
.logo-main img {{ width: min(340px, 90%); height: auto }}
.duo {{ display: grid; grid-template-columns: 1fr auto; gap: .75rem }}
.on-cobalt {{ background: var(--cobalt); border-radius: 12px; display: grid; place-items: center; padding: 1rem }}
.on-cobalt img {{ width: min(190px, 80%) }}
.mono {{ width: 92px; height: 92px; display: block }}
.meta {{ display: grid; gap: .4rem; padding: .25rem .25rem 0 }}
.num {{ font: 600 .72rem/1 var(--ui); letter-spacing: .12em; text-transform: uppercase; color: var(--muted) }}
.meta h2 {{ font-size: 1.25rem; font-weight: 600 }}
.sample {{ font-size: 1.6rem; line-height: 1.15; color: var(--cobalt); margin-top: .25rem }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) .sample {{ color: var(--safran) }} }}
:root[data-theme="dark"] .sample {{ color: var(--safran) }}
.desc {{ color: var(--muted); font-size: .92rem }}
.next {{ background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 1.5rem 1.75rem; display: grid; gap: .6rem; max-width: 760px }}
.next p {{ color: var(--muted) }}
.next strong {{ color: var(--fg) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · nouvelle police</p>
  <h1>Six polices pour le logo</h1>
  <p class="lede">Même nom, mêmes couleurs, même point safran levé : seule la police change. Elle servira aussi pour tous les titres du site et des supports. Les six sont gratuites et utilisables sans restriction commerciale.</p>
</header>
<div class="grid">{cards}
</div>
<section class="next" aria-labelledby="nx">
  <p class="eyebrow" id="nx">Pour la suite</p>
  <p>Dites-moi <strong>le numéro qui vous plaît</strong>. Si aucune ne vous convient, dites-moi ce qui vous gêne (trop ronde, trop sage, trop large…) ou envoyez-moi un logo dont vous aimez l'écriture : je chercherai dans cette direction.</p>
  <p>La place du point (levé, au-dessus du w, ou point final) se règle ensuite, une fois la police choisie.</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
