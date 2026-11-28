"""Wenzy, logo final (version A « Serré », direction Coucher de soleil) : toutes les versions SVG.
Usage : python3 mkfinal.py fonts sortie"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, "mkd1.py")).read().split("\nfor k in V:")[0])

KEY = "serre"


def items_for(wen_c, zy_c):
    fw, fz, s, rot, dy, gap, tr, fil = V[KEY]
    return place([seg("wen", fw, wen_c, 520, track=tr), seg("zy", fz, zy_c, 520 * s, rot=rot, dy=dy)], [gap])


def grad_defs(items, gid):
    zb = items[1]["box"]; zl = (zb[0] - items[1]["shift"], zb[2] - items[1]["shift"])
    return (f'<defs><linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{zl[0]:.0f}" y1="0" x2="{zl[1]:.0f}" y2="0">'
            f'<stop offset="0" stop-color="{CORAIL}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient></defs>')


def bounds(items):
    xs, ys = [], []
    for it in items:
        x0, y0, x1, y1 = it["box"]; m = 10 + abs(it["rot"]) * 4
        xs += [x0 - m, x1 + m]; ys += [y0 - m, y1 + m]
    return min(xs), min(ys), max(xs), max(ys)


def body(items):
    return "".join(f'<g transform="rotate({-it["rot"]} {it["cx"]:.1f} {it["cy"]:.1f})"><path d="{it["d"]}" fill="{it["c"]}" transform="{it["tf"]}"/></g>' for it in items)


def logo(wen_c, zy="grad", bg=None, pad=60, gid="wz"):
    it = items_for(wen_c, f"url(#{gid})" if zy == "grad" else zy)
    x0, y0, x1, y1 = bounds(it)
    W, H = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad; vx, vy = x0 - pad, -(y1 + pad)
    bgr = f'<rect x="{vx:.0f}" y="{vy:.0f}" width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ""
    defs = grad_defs(it, gid) if zy == "grad" else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.0f} {vy:.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{defs}{bgr}'
            f'<g transform="scale(1,-1)">{body(it)}</g></svg>')


def icon(bg, wen_c, zy="grad", width=0.80, size=1000, rx=220, gid="iz"):
    it = items_for(wen_c, f"url(#{gid})" if zy == "grad" else zy)
    x0, y0, x1, y1 = bounds(it)
    w, h = x1 - x0, y1 - y0; k = size * width / w
    # centrage optique sur la hauteur d'x (le jambage du y descend)
    tx = size / 2 - (x0 + w / 2) * k; ty = size / 2 + (520 / 2) * k - 0.04 * size
    defs = grad_defs(it, gid) if zy == "grad" else ""
    if bg == "grad":
        defs += (f'<defs><linearGradient id="{gid}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{CORAIL}"/>'
                 f'<stop offset="1" stop-color="{VIOLET}"/></linearGradient></defs>'); fill = f"url(#{gid}b)"
    else:
        fill = bg
    rect = f'<rect width="{size}" height="{size}" rx="{rx}" fill="{fill}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Wenzy"><title>Wenzy</title>{defs}{rect}'
            f'<g transform="translate({tx:.1f},{ty:.1f}) scale({k:.4f},{-k:.4f})">{body(it)}</g></svg>')


if __name__ == "__main__" or True:
    F = {
        "wenzy-logo-encre.svg": logo(ENCRE),                         # sur fond clair (principal)
        "wenzy-logo-creme.svg": logo(CREME, gid="wz2"),             # sur fond sombre
        "wenzy-logo-blanc.svg": logo("#FFFFFF", "#FFFFFF", gid="wz3"),  # une couleur, sur photo ou dégradé
        "wenzy-logo-noir.svg": logo(ENCRE, ENCRE, gid="wz4"),       # une couleur, impression
        "wenzy-logo-fond-creme.svg": logo(ENCRE, bg=CREME, pad=200, gid="wz5"),
        "wenzy-logo-fond-encre.svg": logo(CREME, bg=ENCRE, pad=200, gid="wz6"),
        "wenzy-icone-encre.svg": icon(ENCRE, CREME, gid="i1"),       # icône principale
        "wenzy-icone-creme.svg": icon(CREME, ENCRE, gid="i2"),
        "wenzy-icone-degrade.svg": icon("grad", "#FFFFFF", "#FFFFFF", gid="i3"),
        "wenzy-favicon.svg": icon(ENCRE, CREME, width=0.9, rx=200, gid="i4"),
    }
    for n, s in F.items():
        open(os.path.join(OUT, n), "w").write(s)
    print("ok", len(F))
