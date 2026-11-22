"""Wenzy : palette terre cuite / atlantique / safran / sable / encre, soleil à rayons à gauche du nom,
monogramme en arche avec le soleil (pas de W). Usage : python3 mksoleil.py fonts sortie"""
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
FD_, OUT_ = sys.argv[1], sys.argv[2]
sys.argv = sys.argv[:1] + [FD_, "/tmp/_unused"]
exec(open(os.path.join(HERE, "mkfonts.py")).read().split("for k in FONTS")[0])
FD, OUT = FD_, OUT_
os.makedirs(OUT, exist_ok=True)

TERRE, ATLANTIQUE, SAFRAN_, SABLE, ENCRE = "#B9462A", "#1D4466", "#E3A23B", "#F4EADB", "#22201C"


def sun(cx, cy, R, color, ray_color=None):
    rc = ray_color or color
    sw = R * 0.36; r0, r1 = R * 1.55, R * 2.25
    rays = "".join(
        f'<line x1="{cx + r0*math.cos(a):.1f}" y1="{cy + r0*math.sin(a):.1f}" x2="{cx + r1*math.cos(a):.1f}" y2="{cy + r1*math.sin(a):.1f}"/>'
        for a in [i * math.pi / 4 for i in range(8)])
    return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R:.1f}" fill="{color}"/>'
            f'<g stroke="{rc}" stroke-width="{sw:.1f}" stroke-linecap="round">{rays}</g>')


def logo(key, fg, sun_c, bg=None, pad=70):
    f, tr = FONTS[key]; path = os.path.join(FD, f)
    gs, glyphs, adv = shape(path, "wenzy", tr)
    body = []; bottom = 0
    for name, x, y in glyphs:
        body += contours(gs, name, x, y)
        bp = BoundsPen(gs); gs[name].draw(bp)
        if bp.bounds: bottom = min(bottom, bp.bounds[1])
    bp = BoundsPen(gs); gs[glyphs[-1][0]].draw(bp); right = glyphs[-1][1] + bp.bounds[2]
    xh = xheight(path)
    R = xh * 0.2; cx = -(R * 2.25 + xh * 0.32); cy = xh * 0.5
    left = cx - R * 2.25 - R * 0.2; top = max(cy + R * 2.25 + R * 0.2, xh * 1.35)
    x0, y0 = left - pad, -(top + pad); W, H = right - left + 2 * pad, (top - bottom) + 2 * pad
    bgr = f'<rect x="{x0:.0f}" y="{y0:.0f}" width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ""
    # le soleil est dessiné hors du groupe inversé : y écran = -y police
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.0f} {y0:.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{bgr}'
            f'<g transform="scale(1,-1)"><path d="{to_d(body)}" fill="{fg}"/></g>{sun(cx, -cy, R, sun_c)}</svg>')


def arche(size=1000, bg=ATLANTIQUE, arch=SABLE, sun_c=TERRE, ray=SAFRAN_, rx=200):
    a0, a1, top, bot = 270, 730, 210, 800
    r = (a1 - a0) / 2
    d = f"M{a0} {bot - 24} V{top + r} A{r} {r} 0 0 1 {a1} {top + r} V{bot - 24} Q{a1} {bot} {a1 - 24} {bot} H{a0 + 24} Q{a0} {bot} {a0} {bot - 24} Z"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Wenzy"><title>Wenzy</title>'
            f'<rect width="{size}" height="{size}" rx="{rx}" fill="{bg}"/><path d="{d}" fill="{arch}"/>{sun(500, 560, 74, sun_c, ray)}</svg>')


for k in FONTS:
    open(f"{OUT}/{k}-sur-terre.svg", "w").write(logo(k, SABLE, SAFRAN_, bg=TERRE))
    open(f"{OUT}/{k}-terre.svg", "w").write(logo(k, TERRE, SAFRAN_))
    open(f"{OUT}/{k}-atlantique.svg", "w").write(logo(k, ATLANTIQUE, SAFRAN_))
open(f"{OUT}/arche-atlantique.svg", "w").write(arche())
open(f"{OUT}/arche-terre.svg", "w").write(arche(bg=TERRE, sun_c=TERRE))
open(f"{OUT}/arche-sable.svg", "w").write(arche(bg=SABLE, arch=ATLANTIQUE, sun_c=SAFRAN_, ray=SAFRAN_))
print("ok")
