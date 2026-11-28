"""Wenzy : six propositions de motif (tuiles SVG raccordables). Usage : python3 motifs2.py sortie"""
import math, random, sys, os
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
CORAIL, VIOLET, CREME, ENCRE = "#FF6A4D", "#C25BE8", "#F6F1EA", "#141414"


def svg(size, inner, bg, gid, extra_defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<defs><linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{size}" y2="{size}">'
            f'<stop offset="0" stop-color="{CORAIL}"/><stop offset="1" stop-color="{VIOLET}"/></linearGradient>{extra_defs}</defs>'
            f'<rect width="{size}" height="{size}" fill="{bg}"/>{inner}</svg>')


def wrap(size, draw):
    """répète un dessin aux 9 positions pour une tuile sans couture"""
    return "".join(draw(dx, dy) for dx in (-size, 0, size) for dy in (-size, 0, size))


# 1. Les tables : des cercles de six points, un point en dégradé
def tables(fg, bg, gid):
    S = 480; rnd = random.Random(4); out = []
    pos = [(80, 90), (260, 60), (420, 150), (150, 250), (330, 300), (60, 400), (230, 430), (420, 400)]
    def one(cx, cy, k, a0):
        R, r = 30, 7
        s = ""
        for i in range(6):
            a = a0 + i * math.pi / 3
            col = f"url(#{gid})" if i == k else fg
            s += f'<circle cx="{cx + R*math.cos(a):.1f}" cy="{cy + R*math.sin(a):.1f}" r="{r}" fill="{col}"/>'
        return s
    params = [(x, y, rnd.randrange(6), rnd.uniform(0, 1)) for x, y in pos]
    inner = wrap(S, lambda dx, dy: "".join(one(x + dx, y + dy, k, a) for x, y, k, a in params))
    return svg(S, inner, bg, gid)


# 2. Le ciel de 19 h : grandes taches de couleur floues (pas de tuile : fond)
def ciel(fg, bg, gid):
    S = 800
    blobs = [(180, 220, 260, CORAIL, .85), (560, 160, 230, VIOLET, .75), (420, 560, 300, "#FF9A6B", .6), (120, 640, 200, VIOLET, .5), (700, 620, 220, CORAIL, .55)]
    inner = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity="{o}"/>' for x, y, r, c, o in blobs)
    defs = '<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="90"/></filter>'
    return svg(S, f'<g filter="url(#b)">{inner}</g>', bg, gid, defs)


# 3. Les arcs du couchant : demi-cercles concentriques, un soleil qui se couche, en quinconce
def arcs(fg, bg, gid):
    S = 240
    def one(cx, cy):
        s = ""
        for i, r in enumerate((26, 46, 66, 86)):
            col = f"url(#{gid})" if i < 2 else fg
            s += f'<path d="M{cx-r} {cy} A{r} {r} 0 0 1 {cx+r} {cy}" fill="none" stroke="{col}" stroke-width="7" stroke-linecap="round"/>'
        return s
    inner = wrap(S, lambda dx, dy: one(60 + dx, 110 + dy) + one(180 + dx, 230 + dy))
    return svg(S, inner, bg, gid)


# 4. La grille et les paires : une grille de points, certains se relient deux par deux
def paires(fg, bg, gid):
    S, step = 480, 40; rnd = random.Random(11)
    dots = ""; links = ""
    used = set()
    for gx in range(S // step):
        for gy in range(S // step):
            x, y = gx * step + step / 2, gy * step + step / 2
            dots += f'<circle cx="{x}" cy="{y}" r="3.2" fill="{fg}" opacity=".55"/>'
    for _ in range(16):
        gx, gy = rnd.randrange(S // step), rnd.randrange(S // step)
        d = rnd.choice([(1, 0), (0, 1), (1, 1), (2, 1)])
        a, b = (gx, gy), ((gx + d[0]) % (S // step), (gy + d[1]) % (S // step))
        if a in used or b in used or b[0] < a[0] or b[1] < a[1]: continue
        used |= {a, b}
        x1, y1 = a[0] * step + step / 2, a[1] * step + step / 2
        x2, y2 = b[0] * step + step / 2, b[1] * step + step / 2
        links += (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="url(#{gid})" stroke-width="6" stroke-linecap="round"/>'
                  f'<circle cx="{x1}" cy="{y1}" r="7" fill="url(#{gid})"/><circle cx="{x2}" cy="{y2}" r="7" fill="url(#{gid})"/>')
    return svg(S, dots + links, bg, gid)


# 5. Zellige au trait : étoiles à huit branches reliées, en filet fin
def zellige(fg, bg, gid):
    S = 140
    def star(cx, cy, R=50, col=None):
        pts = []
        for i in range(16):
            a = i * math.pi / 8 - math.pi / 2
            r = R if i % 2 == 0 else R * .62
            pts.append(f"{cx + r*math.cos(a):.1f},{cy + r*math.sin(a):.1f}")
        return f'<polygon points="{" ".join(pts)}" fill="none" stroke="{col}" stroke-width="2.4" stroke-linejoin="round"/>'
    def one(dx, dy):
        return (star(70 + dx, 70 + dy, col=f"url(#{gid})") + star(dx, dy, R=24, col=fg).replace('stroke-width="2.4"', 'stroke-width="2.4" opacity=".45"')
                + f'<line x1="{70+dx}" y1="{20+dy}" x2="{70+dx}" y2="{-20+dy}" stroke="{fg}" stroke-width="2.4" opacity=".45"/>'
                + f'<line x1="{20+dx}" y1="{70+dy}" x2="{-20+dx}" y2="{70+dy}" stroke="{fg}" stroke-width="2.4" opacity=".45"/>')
    return svg(S, wrap(S, one), bg, gid)


# 6. Les vagues : lignes ondulées parallèles, comme une conversation qui circule
def vagues(fg, bg, gid):
    S = 320; out = ""
    for i in range(8):
        y = 20 + i * 40
        col = f"url(#{gid})" if i % 3 == 0 else fg
        op = 1 if i % 3 == 0 else .35
        d = f"M-40 {y}"
        for k in range(6):
            x0 = -40 + k * 80
            d += f" C{x0+20} {y-18} {x0+60} {y+18} {x0+80} {y}"
        out += f'<path d="{d}" fill="none" stroke="{col}" stroke-width="5" stroke-linecap="round" opacity="{op}"/>'
    return svg(S, out, bg, gid)


M = {"tables": tables, "ciel": ciel, "arcs": arcs, "paires": paires, "zellige": zellige, "vagues": vagues}
for k, f in M.items():
    open(f"{OUT}/{k}-encre.svg", "w").write(f(CREME, ENCRE, f"g{k}e"))
    open(f"{OUT}/{k}-creme.svg", "w").write(f(ENCRE, CREME, f"g{k}c"))
print("ok")
