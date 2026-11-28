import base64, sys
L = sys.argv[1]; OUT = sys.argv[2]
def uri(f):
    return "data:image/svg+xml;base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()

V = [
 ("soleil", "1", "Soleil levé",
  "Le point safran se lève au-dessus de la fin du nom. C'est la piste que vous avez choisie, telle quelle : le soleil de midi, ou la personne qu'on va rencontrer. Le logo est un peu plus haut que les lettres, ce qui lui donne de l'élan.",
  "Le point se perd un peu sous 24 px de haut : en très petit (favicon), on utilise le monogramme."),
 ("bras", "2", "Bras levés",
  "Le point safran se pose au-dessus du w, qui devient un petit personnage les bras en l'air. C'est le plus joyeux des trois, et le monogramme raconte une histoire à lui seul : quelqu'un content d'être là.",
  "Certains pourraient lire « iwenzy » au premier coup d'œil. À tester auprès de quelques personnes."),
 ("point", "3", "Point final",
  "Le point safran ferme le nom comme une phrase : « wenzy. » C'est le point de rendez-vous. La version la plus sobre, la plus lisible en petit, et le monogramme « w. » est très net sur une icône.",
  "Proche de l'ancien logo « The Host Club. », qui avait déjà un point final. Moins de surprise."),
]

cards = ""
for key, n, name, desc, risk in V:
    cards += f'''
<article class="var" aria-labelledby="v{n}">
  <div class="var-head"><span class="num">Variante {n}</span><h2 id="v{n}">{name}</h2><p>{desc}</p></div>
  <div class="hero-logo"><img src="{uri(key+'-cobalt.svg')}" alt="Logo Wenzy, variante {name}"></div>
  <div class="row3">
    <div class="tile cobalt"><img src="{uri(key+'-sur-cobalt.svg')}" alt="Sur fond cobalt"></div>
    <div class="tile chaux"><img src="{uri(key+'-nuit.svg')}" alt="Une couleur"></div>
    <div class="tile chaux lockup"><img src="{uri(key+'-cobalt.svg')}" alt="Logo"><img class="arsig" src="{uri('arabe-nuit.svg')}" alt="وينزي"></div>
  </div>
  <p class="cap">Sur cobalt · une seule couleur (impression) · version bilingue avec la signature arabe</p>
  <div class="mock-row">
    <div class="m-phone"><div class="screen">
      <div class="app"><img src="{uri(key+'-monogramme.svg')}" alt="Icône de l'application"><span>Wenzy</span></div>
      <div class="app ghost"></div><div class="app ghost"></div><div class="app ghost"></div>
    </div><p class="cap">Écran d'accueil du téléphone</p></div>
    <div class="m-insta"><div class="avatar"><img src="{uri(key+'-monogramme.svg')}" alt="Avatar Instagram"></div>
      <div class="ig-txt"><b>wenzy.ma</b><span>Expériences de groupe · Casablanca</span><span class="ig-btn">Suivre</span></div>
      <p class="cap">Profil Instagram</p></div>
    <div class="m-tab"><div class="tab"><img src="{uri(key+'-monogramme.svg')}" alt=""><span>Wenzy · Dîner entre inconnus</span></div>
      <div class="sizes"><img src="{uri(key+'-cobalt.svg')}" style="height:40px" alt=""><img src="{uri(key+'-cobalt.svg')}" style="height:24px" alt=""><img src="{uri(key+'-cobalt.svg')}" style="height:16px" alt=""></div>
      <p class="cap">Onglet du navigateur · logo à 40, 24 et 16 px</p></div>
    <div class="m-card"><div class="bcard"><img src="{uri(key+'-sur-cobalt.svg')}" alt="Carte de visite"></div><p class="cap">Carte de visite, recto</p></div>
  </div>
  <p class="risk"><b>À surveiller :</b> {risk}</p>
</article>'''

html = f'''<title>Wenzy, le logo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : mur clair de la piste Midi ; une colonne par variante, logo en grand puis mises en situation. */
:root {{
  --bg: #fbfaf6; --panel: #ffffff; --fg: #10162b; --muted: #5a6072; --line: #e7e3d6;
  --cobalt: #1340a8; --safran: #f5c242; --chaux: #fbfaf6; --nuit: #10162b;
  --display: "Bricolage Grotesque", "Inter", sans-serif; --ui: "Inter", ui-sans-serif, system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #0c1122; --panel: #141a30; --fg: #eef0f6; --muted: #a3a9bd; --line: #262d48; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #0c1122; --panel: #141a30; --fg: #eef0f6; --muted: #a3a9bd; --line: #262d48; color-scheme: dark }}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 16px/1.6 var(--ui);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 4rem }}
.wrap {{ max-width: 1080px; margin: 0 auto; display: grid; gap: 3rem }}
h1, h2 {{ margin: 0; text-wrap: balance; line-height: 1.1; font-family: var(--display); font-weight: 800; letter-spacing: -.02em }}
p {{ margin: 0 }}
.eyebrow {{ font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600 }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.2rem, 6vw, 3.4rem) }}
.lede {{ max-width: 64ch; color: var(--muted); font-size: 1.05rem }}
.var {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: clamp(1.25rem, 3vw, 2.25rem); display: grid; gap: 1.25rem }}
.var-head {{ display: grid; gap: .5rem }}
.num {{ font: 600 .75rem/1 var(--ui); letter-spacing: .12em; text-transform: uppercase; color: var(--cobalt) }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) .num {{ color: var(--safran) }} }}
:root[data-theme="dark"] .num {{ color: var(--safran) }}
.var-head h2 {{ font-size: clamp(1.7rem, 4vw, 2.3rem) }}
.var-head p {{ color: var(--muted); max-width: 64ch }}
.hero-logo {{ background: var(--chaux); border-radius: 14px; padding: clamp(1.5rem, 5vw, 3.5rem); display: grid; place-items: center }}
.hero-logo img {{ width: min(560px, 100%); height: auto }}
.row3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem }}
@media (max-width: 700px) {{ .row3 {{ grid-template-columns: 1fr }} }}
.tile {{ border-radius: 12px; padding: 1.4rem; display: grid; place-items: center; min-height: 120px }}
.tile img {{ width: 80%; max-width: 220px; height: auto }}
.tile.cobalt {{ background: var(--cobalt) }}
.tile.chaux {{ background: var(--chaux); box-shadow: inset 0 0 0 1px #e7e3d6 }}
.lockup {{ gap: .3rem; align-content: center }}
.lockup img {{ width: 62% }} .lockup .arsig {{ width: 30% }}
.cap {{ font-size: .8rem; color: var(--muted) }}
.mock-row {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; align-items: start }}
@media (max-width: 860px) {{ .mock-row {{ grid-template-columns: repeat(2, minmax(0, 1fr)) }} }}
@media (max-width: 460px) {{ .mock-row {{ grid-template-columns: 1fr }} }}
.mock-row > div {{ display: grid; gap: .5rem; min-width: 0 }}
.screen {{ background: linear-gradient(160deg, #f6c873, #e9866b 55%, #6c5ba8); border-radius: 18px; padding: 1.1rem; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; align-content: start; min-height: 150px }}
.app {{ display: grid; justify-items: center; gap: .25rem; font: 500 .62rem/1 var(--ui); color: #fff }}
.app img {{ width: 44px; border-radius: 12px; display: block }}
.app.ghost::before {{ content: ""; width: 44px; aspect-ratio: 1; border-radius: 12px; background: rgb(255 255 255 / .35) }}
.m-insta {{ background: var(--chaux); border-radius: 14px; padding: 1rem; box-shadow: inset 0 0 0 1px #e7e3d6; color: #10162b }}
.m-insta .cap {{ color: #5a6072 }}
.avatar {{ width: 72px; height: 72px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 3px #fbfaf6, 0 0 0 5px #f5c242 }}
.avatar img {{ width: 100%; height: 100%; display: block }}
.ig-txt {{ display: grid; gap: .15rem; font-size: .82rem }}
.ig-txt span {{ color: #5a6072 }}
.ig-btn {{ justify-self: start; margin-top: .35rem; background: #1340a8; color: #fff !important; font-weight: 600; padding: .3rem .9rem; border-radius: 8px }}
.tab {{ background: #e9e6dc; border-radius: 10px 10px 0 0; padding: .55rem .7rem; display: flex; gap: .45rem; align-items: center; font: 500 .74rem/1.2 var(--ui); color: #10162b; min-width: 0 }}
.tab img {{ width: 16px; height: 16px; border-radius: 4px; flex: none }}
.tab span {{ overflow: hidden; text-overflow: ellipsis; white-space: nowrap }}
.sizes {{ background: var(--chaux); border-radius: 0 0 10px 10px; box-shadow: inset 0 0 0 1px #e7e3d6; padding: .9rem; display: grid; gap: .7rem; justify-items: start }}
.sizes img {{ width: auto; max-width: 100% }}
.bcard {{ background: var(--cobalt); border-radius: 8px; aspect-ratio: 85 / 55; display: grid; place-items: center; box-shadow: 0 10px 24px -14px rgb(16 22 43 / .6) }}
.bcard img {{ width: 58% }}
.risk {{ font-size: .9rem; color: var(--muted); border-top: 1px solid var(--line); padding-top: 1rem }}
.risk b {{ color: var(--fg) }}
.reco {{ display: grid; gap: .75rem; max-width: 68ch }}
.reco h2 {{ font-size: 1.7rem }}
.reco p {{ color: var(--muted) }}
.reco strong {{ color: var(--fg) }}
.next {{ background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 1.5rem 1.75rem; display: grid; gap: .6rem }}
.next ul {{ margin: 0; padding-left: 1.2rem; color: var(--muted) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 sur 5 · le logo</p>
  <h1>Trois façons de poser le soleil</h1>
  <p class="lede">Le logo de la piste Midi, dessiné pour de bon en vectoriel : Bricolage Grotesque très gras, en minuscules, avec un crénage resserré. Les lettres sont les mêmes dans les trois variantes ; seule change la place du point safran. Chaque variante a son monogramme, montré en icône, sur Instagram, dans un onglet et sur une carte de visite.</p>
</header>
{cards}
<section class="reco" aria-labelledby="reco">
  <p class="eyebrow">Ma recommandation</p>
  <h2 id="reco">Variante 1, Soleil levé</h2>
  <p>C'est le logo que vous avez choisi à l'étape 1, et c'est celui qui porte le mieux l'idée de la piste Midi. <strong>Le point levé donne de l'élan et ne ressemble à aucun autre logo de sortie au Maroc.</strong> En très petit (favicon), le monogramme prend le relais. Si vous aimez l'histoire du petit personnage, la variante 2 est une belle alternative, mais il faut la tester avant.</p>
</section>
<section class="next" aria-labelledby="nx">
  <p class="eyebrow" id="nx">Dès que vous avez choisi</p>
  <ul>
    <li>Fichiers définitifs : SVG et PNG, versions cobalt, sur cobalt, une couleur, bilingue, empilée.</li>
    <li>Icônes : favicon, icônes d'application 192 et 512 px, icône Apple, image de partage (réseaux sociaux), logo et bandeau des e-mails.</li>
    <li>Règles : zone de protection, taille minimale, ce qu'on ne fait pas avec le logo.</li>
    <li>Puis l'étape 3, le brand book complet.</li>
  </ul>
</section>
</div>
'''
open(OUT, "w").write(html)
print(len(html))
