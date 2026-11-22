"""Wenzy : logos « rencontre et lien », style pro. Usage : python3 mklien.py fonts sortie"""
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
FD_, OUT_ = sys.argv[1], sys.argv[2]
sys.argv = sys.argv[:1] + [FD_, "/tmp/_unused"]
exec(open(os.path.join(HERE, "mkfonts.py")).read().split("for k in FONTS")[0])
FD, OUT = FD_, OUT_
os.makedirs(OUT, exist_ok=True)

GRENADE, ABRICOT, PISTACHE, CREME, AUBERGINE = "#E4473A", "#FFB37A", "#C9DB8A", "#FFF7EE", "#2B1633"
WM_FONT, WM_TRACK = "outfit.ttf", -22


def word_paths(text="wenzy"):
    path = os.path.join(FD, WM_FONT)
    gs, glyphs, adv = shape(path, text, WM_TRACK)
    per = []
    for name, x, y in glyphs:
        bp = BoundsPen(gs); gs[name].draw(bp)
        per.append((name, x, contours(gs, name, x, y), bp.bounds))
    return per, adv, xheight(path)


def wm_svg_group(fg, skip_first=False):
    per, adv, xh = word_paths()
    cs = [c for i, (n, x, c, b) in enumerate(per) if not (skip_first and i == 0) for c in c]
    right = per[-1][1] + per[-1][3][2]
    return f'<path d="{to_d(cs)}" fill="{fg}"/>', right, xh, per


# ---------- symboles (coordonnées écran, carré 0..100) ----------
def sym_tablee(main, accent, cx=50, cy=50, R=31, r=12):
    out = ""
    for i in range(6):
        a = -math.pi / 2 + i * math.pi / 3
        out += f'<circle cx="{cx + R*math.cos(a):.2f}" cy="{cy + R*math.sin(a):.2f}" r="{r}" fill="{accent if i == 0 else main}"/>'
    return out


def sym_lien(main, accent, cx=50, cy=50):
    return (f'<circle cx="{cx-19}" cy="{cy-12}" r="10" fill="{main}"/><circle cx="{cx+19}" cy="{cy-12}" r="10" fill="{accent}"/>'
            f'<path d="M{cx-31} {cy+8} Q{cx} {cy+38} {cx+31} {cy+8}" fill="none" stroke="{main}" stroke-width="9" stroke-linecap="round"/>')


def sym_duo(main, accent, mix, cx=50, cy=50):
    # deux silhouettes (tête + buste en arche) qui se chevauchent ; la zone commune prend la 3e couleur
    def person(x):
        return (f'<circle cx="{x}" cy="{cy-17}" r="11"/>'
                f'<path d="M{x-19} {cy+28} V{cy+12} A19 19 0 0 1 {x+19} {cy+12} V{cy+28} Z"/>')
    a, b = cx - 12, cx + 12
    return (f'<defs><clipPath id="cpA"><g>{person(a)}</g></clipPath></defs>'
            f'<g fill="{main}">{person(a)}</g><g fill="{accent}">{person(b)}</g>'
            f'<g fill="{mix}" clip-path="url(#cpA)">{person(b)}</g>')


def lockup(sym, fg, s_main, s_acc, s_mix=None, bg=None, pad=70):
    g, right, xh, per = wm_svg_group(fg)
    size = xh * 1.75  # hauteur du symbole
    k = size / 100
    gap = xh * 0.42
    sx = -(size + gap)
    sy = -(xh / 2 + size / 2)  # centré sur la hauteur d'x (repère écran, y vers le bas)
    inner = {"tablee": sym_tablee(s_main, s_acc), "lien": sym_lien(s_main, s_acc), "duo": sym_duo(s_main, s_acc, s_mix)}[sym]
    x0 = sx - pad; top = max(xh / 2 + size / 2, 760); bottom = -230
    W = right - sx + 2 * pad; H = top - bottom + 2 * pad
    bgr = f'<rect x="{x0:.0f}" y="{-(top+pad):.0f}" width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.0f} {-(top+pad):.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{bgr}'
            f'<g transform="scale(1,-1)">{g}</g><g transform="translate({sx:.1f},{sy:.1f}) scale({k:.3f})">{inner}</g></svg>')


def w_a_deux(fg, d1, d2, bg=None, pad=70):
    """Le w devient deux personnes bras levés qui se tiennent la main : un point au-dessus de chaque creux du w."""
    g, right, xh, per = wm_svg_group(fg)
    name, x, cs, b = per[0]
    wx0, wx1 = x + b[0], x + b[2]
    w = wx1 - wx0; r = xh * 0.14
    c1, c2 = wx0 + w * 0.306, wx0 + w * 0.694
    cy = xh + r * 0.6
    top = cy + r
    x0 = -pad; bottom = -230
    W = right + 2 * pad; H = max(top, 760) - bottom + 2 * pad
    bgr = f'<rect x="{x0}" y="{-(max(top,760)+pad):.0f}" width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {-(max(top,760)+pad):.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{bgr}'
            f'<g transform="scale(1,-1)">{g}<circle cx="{c1:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{d1}"/><circle cx="{c2:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{d2}"/></g></svg>')


def icon(sym, bg, s_main, s_acc, s_mix=None, size=1000):
    inner = {"tablee": sym_tablee(s_main, s_acc), "lien": sym_lien(s_main, s_acc), "duo": sym_duo(s_main, s_acc, s_mix)}[sym]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Wenzy"><title>Wenzy</title>'
            f'<rect width="100" height="100" rx="22" fill="{bg}"/><g transform="translate(14,14) scale(.72)">{inner}</g></svg>')


def icon_wdeux(bg, fg, d1, d2):
    per, adv, xh = word_paths("w")
    name, x, cs, b = per[0]
    w = b[2] - b[0]; s = 56 / w
    r = xh * 0.14; c1, c2 = b[0] + w * 0.306, b[0] + w * 0.694; cy = xh + r * 0.6
    tot = (cy + r) * s
    tx = 50 - (b[0] + w / 2) * s; ty = 50 + tot / 2
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Wenzy"><title>Wenzy</title>'
            f'<rect width="100" height="100" rx="22" fill="{bg}"/><g transform="translate({tx:.2f},{ty:.2f}) scale({s:.4f},{-s:.4f})">'
            f'<path d="{to_d(cs)}" fill="{fg}"/><circle cx="{c1:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{d1}"/><circle cx="{c2:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{d2}"/></g></svg>')


W_ = lambda n, s: open(f"{OUT}/{n}.svg", "w").write(s)
for sym in ("tablee", "lien", "duo"):
    W_(f"{sym}-creme", lockup(sym, AUBERGINE, AUBERGINE, GRENADE, GRENADE, bg=CREME))
    W_(f"{sym}-grenade", lockup(sym, CREME, CREME, ABRICOT, AUBERGINE, bg=GRENADE))
    W_(f"{sym}-aubergine", lockup(sym, CREME, CREME, GRENADE, ABRICOT, bg=AUBERGINE))
W_("duo-creme", lockup("duo", AUBERGINE, GRENADE, ABRICOT, AUBERGINE, bg=CREME))
W_("duo-grenade", lockup("duo", CREME, CREME, ABRICOT, AUBERGINE, bg=GRENADE))
W_("duo-aubergine", lockup("duo", CREME, GRENADE, ABRICOT, CREME, bg=AUBERGINE))
W_("wdeux-creme", w_a_deux(AUBERGINE, GRENADE, ABRICOT, bg=CREME))
W_("wdeux-grenade", w_a_deux(CREME, AUBERGINE, ABRICOT, bg=GRENADE))
W_("wdeux-aubergine", w_a_deux(CREME, GRENADE, ABRICOT, bg=AUBERGINE))
W_("icone-tablee", icon("tablee", GRENADE, CREME, AUBERGINE))
W_("icone-lien", icon("lien", GRENADE, CREME, AUBERGINE))
W_("icone-duo", icon("duo", CREME, GRENADE, ABRICOT, AUBERGINE))
W_("icone-wdeux", icon_wdeux(AUBERGINE, CREME, GRENADE, ABRICOT))
print("ok")
