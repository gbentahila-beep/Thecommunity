"""Wenzy, direction « Coucher de soleil » : variantes du duo wen + zy, mieux soudées.
Usage : python3 mkd1.py fonts sortie"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, "mkduo.py")).read().split("\nfor key in DUOS:")[0])

CREME, ENCRE, CORAIL, VIOLET = "#F6F1EA", "#141414", "#FF6A4D", "#C25BE8"

# clé : (police wen, police zy, taille zy, angle, décalage vertical, espace n→zy, crénage wen, trait de liaison)
V = {
    "serre":     ("outfit", "caveat", 1.32, -5, -6, -18, -18, False),
    "lie":       ("outfit", "caveat", 1.40, -6, -14, -62, -18, False),
    "signature": ("outfit", "caveat", 1.75, -9, -40, -120, -18, False),
    "equilibre": ("outfit600", "caveat", 1.30, -5, -6, -14, -12, False),
    "pinceau":   ("outfit800", "kaushan", 1.12, -4, -6, -22, -24, False),
    "fil":       ("outfit", "caveat", 1.32, -5, -6, -18, -18, True),
}


def build(key, wen_c, bg=None, pad=150, gid="g"):
    fw, fz, s, rot, dy, gap, tr, fil = V[key]
    items = place([seg("wen", fw, wen_c, 520, track=tr), seg("zy", fz, f"url(#{gid})", 520 * s, rot=rot, dy=dy)], [gap])
    zb = items[1]["box"]; wb = items[0]["box"]
    zl = (zb[0] - items[1]["shift"], zb[2] - items[1]["shift"])  # repère local du tracé (avant décalage)
    grad = (f'<defs><linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{zl[0]:.0f}" y1="0" x2="{zl[1]:.0f}" y2="0">'
            f'<stop offset="0" stop-color="{CORAIL}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient>'
            f'<linearGradient id="{gid}f" gradientUnits="userSpaceOnUse" x1="{wb[0]:.0f}" y1="0" x2="{zb[2]:.0f}" y2="0">'
            f'<stop offset="0" stop-color="{CORAIL}" stop-opacity="0"/><stop offset=".35" stop-color="{CORAIL}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient></defs>')
    extra = ""
    if fil:  # un trait qui part sous « wen » et rejoint le z : le lien
        y = -95; extra = (f'<path d="M{wb[0]+40:.0f} {y} C{wb[2]-200:.0f} {y-40} {zb[0]-60:.0f} {y-30} {zb[0]+30:.0f} 10" '
                          f'fill="none" stroke="url(#{gid}f)" stroke-width="44" stroke-linecap="round"/>')
    xs, ys = [], []
    for it in items:
        x0, y0, x1, y1 = it["box"]; m = 30 + abs(it["rot"]) * 6
        xs += [x0 - m, x1 + m]; ys += [y0 - m, y1 + m]
    if fil: ys.append(-140)
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    W, H = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad; vx, vy = x0 - pad, -(y1 + pad)
    body = "".join(f'<g transform="rotate({-it["rot"]} {it["cx"]:.1f} {it["cy"]:.1f})"><path d="{it["d"]}" fill="{it["c"]}" transform="{it["tf"]}"/></g>' for it in items)
    bgr = f'<rect x="{vx:.0f}" y="{vy:.0f}" width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.0f} {vy:.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{grad}{bgr}'
            f'<g transform="scale(1,-1)">{extra}{body}</g></svg>')


def icon(key, size=1000):
    fw, fz, s, rot, dy, gap, tr, fil = V[key]
    it = place([seg("zy", fz, "#fff", 520 * s, rot=rot)], [])
    x0, y0, x1, y1 = it[0]["box"]; w, h = x1 - x0, y1 - y0; k = size * 0.6 / max(w, h)
    tx = size / 2 - (x0 + w / 2) * k; ty = size / 2 + (y0 + h / 2) * k
    p = it[0]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Wenzy"><title>Wenzy</title>'
            f'<defs><linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{CORAIL}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient></defs>'
            f'<rect width="{size}" height="{size}" rx="220" fill="url(#ig)"/><g transform="translate({tx:.1f},{ty:.1f}) scale({k:.4f},{-k:.4f})">'
            f'<g transform="rotate({-p["rot"]} {p["cx"]:.1f} {p["cy"]:.1f})"><path d="{p["d"]}" fill="#fff" transform="{p["tf"]}"/></g></g></svg>')


for k in V:
    open(f"{OUT}/{k}-creme.svg", "w").write(build(k, ENCRE, CREME, gid=f"g{k}c"))
    open(f"{OUT}/{k}-encre.svg", "w").write(build(k, CREME, ENCRE, gid=f"g{k}e"))
    open(f"{OUT}/{k}-transparent.svg", "w").write(build(k, ENCRE, None, pad=20, gid=f"g{k}t"))
    open(f"{OUT}/{k}-icone.svg", "w").write(icon(k))
print("ok")
