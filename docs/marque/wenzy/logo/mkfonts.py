"""Wenzy : le même logo « Soleil levé » décliné dans six polices (OFL). Usage : python3 mkfonts.py fonts sortie"""
import sys, os
sys.argv, ARGS = sys.argv[:1] + ["fonts", "/tmp/_unused"], sys.argv[1:]
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "mklogo.py")).read().split("if __name__")[0])
FD, OUT = ARGS
os.makedirs(OUT, exist_ok=True)

FONTS = {  # clé: (fichier, crénage, texte)
    "outfit": ("outfit.ttf", -30),
    "unbounded": ("unbounded.ttf", -20),
    "sora": ("sora.ttf", -35),
    "jakarta": ("jakarta.ttf", -40),
    "dm": ("dm.ttf", -10),
    "fredoka": ("fredoka.ttf", -15),
}


def xheight(path):
    return TTFont(path)["OS/2"].sxHeight


def wordmark(key, fg, dot, bg=None, pad=60):
    f, tr = FONTS[key]; path = os.path.join(FD, f)
    gs, glyphs, adv = shape(path, "wenzy", tr)
    body = []
    bottom = 0
    for name, x, y in glyphs:
        body += contours(gs, name, x, y)
        bp = BoundsPen(gs); gs[name].draw(bp)
        if bp.bounds: bottom = min(bottom, bp.bounds[1])
    # bord droit réel du y
    bp = BoundsPen(gs); gs[glyphs[-1][0]].draw(bp); right = glyphs[-1][1] + bp.bounds[2]
    xh = xheight(path)
    r = xh * 0.16; cx = right + r * 0.55; cy = xh + r * 1.75
    top = cy + r; w = cx + r
    x0, y0 = -pad, -(top + pad); W, H = w + 2 * pad, (top - bottom) + 2 * pad
    bgr = f'<rect x="{x0}" y="{y0}" width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.0f} {y0:.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{bgr}'
           f'<g transform="scale(1,-1)"><path d="{to_d(body)}" fill="{fg}"/><circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{dot}"/></g></svg>')
    return svg


def monogram(key, size=1000):
    f, _ = FONTS[key]; path = os.path.join(FD, f)
    gs, glyphs, adv = shape(path, "w")
    bp = BoundsPen(gs); gs["w"].draw(bp); x0, y0, x1, y1 = bp.bounds
    xh = xheight(path)
    s = 560 / (x1 - x0)
    gw, gh = (x1 - x0) * s, (y1 - y0) * s
    r = xh * 0.16 * s
    tx = (size - gw - r * 1.2) / 2 - x0 * s
    ty = size / 2 + gh / 2 + 40 - y0 * s
    cx = tx + x1 * s + r * 0.55; cy = ty - (xh * s + r * 1.75)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Wenzy"><title>Wenzy</title>'
            f'<rect width="{size}" height="{size}" rx="220" fill="{COBALT}"/>'
            f'<path transform="translate({tx:.1f},{ty:.1f}) scale({s:.4f},{-s:.4f})" d="{to_d(contours(gs, "w", 0, 0))}" fill="{CHAUX}"/>'
            f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{SAFRAN}"/></svg>')


for k in FONTS:
    open(f"{OUT}/{k}-cobalt.svg", "w").write(wordmark(k, COBALT, SAFRAN))
    open(f"{OUT}/{k}-sur-cobalt.svg", "w").write(wordmark(k, CHAUX, SAFRAN, bg=COBALT))
    open(f"{OUT}/{k}-monogramme.svg", "w").write(monogram(k))
print("ok")
