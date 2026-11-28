import base64, sys
L, OUT = sys.argv[1], sys.argv[2]
def uri(f, t="image/svg+xml"): return f"data:{t};base64," + base64.b64encode(open(f"{L}/{f}", "rb").read()).decode()

html = f'''<title>Wenzy, logo final</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap">
<style>
/* Layout : fiche logo d'agence ; le logo en grand, ses versions, ses icônes, l'image de partage, puis les règles. */
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
.wrap {{ max-width: 1080px; margin: 0 auto; display: grid; gap: 3rem }}
h1, h2, h3 {{ margin: 0; text-wrap: balance; line-height: 1; font-family: var(--serif); font-weight: 400 }}
p {{ margin: 0 }}
.eyebrow {{ font: 600 .75rem/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--muted) }}
header {{ padding-top: 3rem; display: grid; gap: 1rem }}
header h1 {{ font-size: clamp(2.6rem, 7vw, 4.6rem) }}
header h1 em {{ background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .05em }}
.lede {{ max-width: 64ch; color: var(--muted); font-size: 1.05rem }}
.hero {{ background: #F6F1EA; border-radius: 26px; padding: clamp(2.5rem, 8vw, 6rem) 1.5rem; display: grid; place-items: center; box-shadow: inset 0 0 0 1px #e6ddd0 }}
.hero img {{ width: min(620px, 92%) }}
section {{ display: grid; gap: 1rem }}
section > h2 {{ font-size: clamp(2rem, 4.5vw, 2.8rem) }}
.sec-lede {{ color: var(--muted); max-width: 64ch }}
.versions {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem }}
@media (max-width: 680px) {{ .versions {{ grid-template-columns: 1fr }} }}
.ver {{ display: grid; gap: .45rem }}
.ver .box {{ border-radius: 16px; padding: 2.2rem 1.5rem; display: grid; place-items: center; min-height: 170px }}
.ver .box img {{ width: min(300px, 80%) }}
.ver p {{ font-size: .88rem; color: var(--muted) }}
.ver b {{ color: var(--fg) }}
.icons {{ display: grid; grid-template-columns: repeat(3, auto) 1fr; gap: 1.2rem; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 1.4rem }}
@media (max-width: 680px) {{ .icons {{ grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 1rem; gap: .8rem }} .icons img.i {{ width: 100%; max-width: 84px; height: auto }} .icons .phone-row {{ grid-column: 1 / -1 }} }}
.icons figure {{ margin: 0; display: grid; gap: .4rem; justify-items: center; font-size: .8rem; color: var(--muted) }}
.icons img.i {{ width: 96px; height: 96px; display: block }}
.phone-row {{ background: linear-gradient(160deg, #f7c59f, #e98a73 50%, #7d5ba6); border-radius: 18px; padding: 1rem; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; justify-items: center }}
.app {{ display: grid; justify-items: center; gap: .25rem; font: 500 .66rem/1 var(--ui); color: #fff }}
.app img, .app i {{ width: 52px; height: 52px; border-radius: 12px; display: block }}
.app i {{ background: rgb(255 255 255 / .35) }}
.tabbar {{ background: var(--panel); border: 1px solid var(--line); border-radius: 16px; overflow: hidden }}
.tab {{ display: inline-flex; align-items: center; gap: .5rem; background: #ece6dc; padding: .55rem .9rem; border-radius: 12px 12px 0 0; margin: .6rem 0 0 .6rem; font-size: .8rem; color: #141414; max-width: calc(100% - 1.2rem) }}
.tab img {{ width: 16px; height: 16px; border-radius: 3px; flex: none }}
.tab span {{ overflow: hidden; text-overflow: ellipsis; white-space: nowrap }}
.og img {{ width: 100%; border-radius: 18px; display: block; box-shadow: 0 0 0 1px var(--line) }}
.rules {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem }}
.rule {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.2rem; display: grid; gap: .6rem; align-content: start }}
.rule h3 {{ font-size: 1.6rem }}
.rule p, .rule li {{ color: var(--muted); font-size: .9rem }}
.rule ul {{ margin: 0; padding-left: 1.1rem; display: grid; gap: .25rem }}
.clear {{ background: #F6F1EA; border-radius: 12px; padding: 1.4rem; display: grid; place-items: center; box-shadow: inset 0 0 0 1px #e6ddd0 }}
.clear div {{ outline: 1.5px dashed #C25BE8; outline-offset: 0; padding: 22px }}
.clear img {{ width: 170px; display: block }}
.files {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.2rem 1.4rem; overflow-x: auto }}
.files table {{ border-collapse: collapse; width: 100%; min-width: 560px; font-size: .88rem }}
.files td, .files th {{ text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--line) }}
.files th {{ font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted) }}
.files td:first-child {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem }}
.files td:last-child {{ color: var(--muted) }}
.next {{ background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.5rem 1.7rem; display: grid; gap: .6rem; max-width: 780px }}
.next p {{ color: var(--muted) }}
.next strong {{ color: var(--fg) }}
</style>
<div class="wrap">
<header>
  <p class="eyebrow">Wenzy · brand book · étape 2 · logo final</p>
  <h1>Le logo, <em>version finale</em></h1>
  <p class="lede">Version A « Serré », direction Coucher de soleil : « wen » net et solide, « zy » écrit à la main dans le dégradé corail → violet, collé au « n ». Le mot entier sert partout, y compris dans l'icône de l'application.</p>
</header>
<div class="hero"><img src="{uri('wenzy-logo-encre.svg')}" alt="Logo Wenzy"></div>

<section aria-labelledby="ver">
  <h2 id="ver">Les versions</h2>
  <div class="versions">
    <div class="ver"><div class="box" style="background:#F6F1EA;box-shadow:inset 0 0 0 1px #e6ddd0"><img src="{uri('wenzy-logo-encre.svg')}" alt="Sur crème"></div><p><b>Principale</b> · sur fond clair</p></div>
    <div class="ver"><div class="box" style="background:#141414"><img src="{uri('wenzy-logo-creme.svg')}" alt="Sur encre"></div><p><b>Inversée</b> · sur fond sombre</p></div>
    <div class="ver"><div class="box" style="background:linear-gradient(100deg,#FF6A4D,#C25BE8)"><img src="{uri('wenzy-logo-blanc.svg')}" alt="Blanc sur dégradé"></div><p><b>Blanche</b> · sur le dégradé ou sur une photo</p></div>
    <div class="ver"><div class="box" style="background:#fff;box-shadow:inset 0 0 0 1px #e6ddd0"><img src="{uri('wenzy-logo-noir.svg')}" alt="Noir"></div><p><b>Une couleur</b> · impression en noir, tampon, gravure</p></div>
  </div>
</section>

<section aria-labelledby="ico">
  <h2 id="ico">Les icônes</h2>
  <p class="sec-lede">Le mot entier, dans un carré arrondi. L'icône principale est sur fond encre : c'est elle qui se voit le mieux sur un écran de téléphone.</p>
  <div class="icons">
    <figure><img class="i" src="{uri('wenzy-icone-encre.svg')}" alt="Icône encre"><figcaption>Principale</figcaption></figure>
    <figure><img class="i" src="{uri('wenzy-icone-creme.svg')}" alt="Icône crème" style="box-shadow:0 0 0 1px #e6ddd0;border-radius:22px"><figcaption>Crème</figcaption></figure>
    <figure><img class="i" src="{uri('wenzy-icone-degrade.svg')}" alt="Icône dégradé"><figcaption>Dégradé</figcaption></figure>
    <div class="phone-row"><div class="app"><img src="{uri('wenzy-icone-encre.svg')}" alt=""><span>Wenzy</span></div><div class="app"><i></i><span>&nbsp;</span></div><div class="app"><i></i><span>&nbsp;</span></div><div class="app"><i></i><span>&nbsp;</span></div></div>
  </div>
  <div class="tabbar"><span class="tab"><img src="{uri('wenzy-favicon-32.png', 'image/png')}" alt=""><span>Wenzy · Dîners entre inconnus à Casablanca</span></span></div>
</section>

<section aria-labelledby="og">
  <h2 id="og">L'image de partage</h2>
  <p class="sec-lede">Ce qui s'affiche quand quelqu'un partage le site sur WhatsApp, Instagram, Facebook ou LinkedIn.</p>
  <div class="og"><img src="{uri('wenzy-og-1200x630.png', 'image/png')}" alt="Image de partage Wenzy"></div>
</section>

<section aria-labelledby="rg">
  <h2 id="rg">Les règles</h2>
  <div class="rules">
    <div class="rule"><h3>Zone de protection</h3><div class="clear"><div><img src="{uri('wenzy-logo-encre.svg')}" alt=""></div></div><p>Toujours laisser autour du logo un espace libre au moins égal à la hauteur du « n ».</p></div>
    <div class="rule"><h3>Taille minimale</h3><p>Écran : 80 px de large pour le logo, 16 px pour le favicon. Impression : 25 mm de large.</p><p>En dessous, utiliser l'icône.</p></div>
    <div class="rule"><h3>À ne jamais faire</h3><ul><li>Écarter « wen » et « zy », ou les séparer.</li><li>Changer les couleurs du dégradé ou l'inverser.</li><li>Déformer, incliner ou ajouter une ombre.</li><li>Poser la version en couleur sur une photo chargée : prendre la version blanche.</li><li>Réécrire le logo avec une police.</li></ul></div>
  </div>
</section>

<section aria-labelledby="fi">
  <h2 id="fi">Les fichiers</h2>
  <p class="sec-lede">Rangés dans le projet, dossier <code>docs/marque/wenzy/logo/final/</code>.</p>
  <div class="files"><table>
    <thead><tr><th>Fichier</th><th>Usage</th></tr></thead>
    <tbody>
      <tr><td>wenzy-logo-encre.svg / -1600.png</td><td>Logo principal, fond clair</td></tr>
      <tr><td>wenzy-logo-creme.svg / -1600.png</td><td>Logo inversé, fond sombre</td></tr>
      <tr><td>wenzy-logo-blanc.svg · wenzy-logo-noir.svg</td><td>Une couleur (photo, dégradé, impression)</td></tr>
      <tr><td>wenzy-logo-fond-creme.svg · -fond-encre.svg</td><td>Logo avec son fond, pour les présentations</td></tr>
      <tr><td>wenzy-icone-encre / -creme / -degrade.svg</td><td>Icônes vectorielles</td></tr>
      <tr><td>wenzy-icone-1024 / 512 / 192.png</td><td>Icônes d'application et du site</td></tr>
      <tr><td>wenzy-apple-touch-icon-180.png</td><td>Icône iPhone (écran d'accueil)</td></tr>
      <tr><td>favicon.ico · wenzy-favicon.svg / -32.png</td><td>Onglet du navigateur</td></tr>
      <tr><td>wenzy-og-1200x630.png</td><td>Image de partage (réseaux sociaux)</td></tr>
      <tr><td>wenzy-logo-email-600.png</td><td>En-tête des e-mails</td></tr>
    </tbody>
  </table></div>
</section>

<section class="next" aria-labelledby="nx">
  <p class="eyebrow" id="nx">La suite</p>
  <p><strong>Étape 3 : le brand book complet</strong>, dans cette direction : ton, typographie (Instrument Serif et Inter), couleurs et dégradé, photos, papeterie, à table, affichage, objets, réseaux sociaux.</p>
  <p>Puis <strong>étape 4 : le site passe à Wenzy</strong> (nom, couleurs, polices, logos, icônes, e-mails, factures).</p>
</section>
</div>
'''
open(OUT, "w").write(html); print(len(html))
