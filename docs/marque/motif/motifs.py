"""Motifs de marque The Host Club (étape 10c). Tuiles SVG raccordables (se répètent sans couture)."""
import math, json, os

_A = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "mono-a.json")))["a"]  # tracé du monogramme retenu « h. »

def h_mark(x, y, size, fill, dot):
    """Le monogramme « h. » centré en (x, y), hauteur ≈ size px."""
    vx, vy, vw, vh = _A["vb"]
    k = size / vh
    tx, ty = x - (vx + vw / 2) * k, y - (vy + vh / 2) * k
    return (f'<g transform="translate({tx:.1f} {ty:.1f}) scale({k:.4f})"><path d="{_A["path"]}" fill="{fill}"/>'
            f'<circle cx="{_A["cx"]:.0f}" cy="{_A["cy"]:.0f}" r="{_A["r"]}" fill="{dot}"/></g>')

PLUM, PLUM_LIGHT, DOT, CREAM, SAND = "#561A29", "#8E3A4C", "#B0566A", "#F8EFE8", "#EEDFD3"
W, H = 640, 420  # tuile

def fil(bg, line, dots, accent, stroke=15, opacity=1.0):
    """« Le fil » : une ligne qui ondule et fait une boucle ronde par tuile (trochoïde), des points posés dessus (les convives)."""
    def pt(t, row):
        ph = 0.5 * (row % 2)
        th = 2 * math.pi * (t + ph)
        x = W * t + 185 * math.sin(th)
        y = (H / 2) * row + H / 4 + 105 * math.cos(th) + 22 * math.sin(2 * th)
        return x, y
    parts = []
    for row in (-1, 0, 1, 2):
        for dx in (-W, 0, W):
            pts = [pt(i / 600, row) for i in range(601)]
            d = "M" + " L".join(f"{x + dx:.1f},{y:.1f}" for x, y in pts)
            parts.append(f'<path d="{d}" fill="none" stroke="{line}" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round" opacity="{opacity}"/>')
            for i, t in enumerate((0.08, 0.36, 0.62, 0.86)):
                x, y = pt(t, row)
                c = accent if (i + row % 2) % 4 == 1 else dots
                parts.append(f'<circle cx="{x + dx:.1f}" cy="{y:.1f}" r="{stroke * 1.3:.1f}" fill="{c}"/>')
    return tile(bg, "".join(parts))

def convives(bg, dot, accent, mark):
    """« Les convives » : une trame de points en quinconce ; ici et là, un point d'accent et un petit « h. ». Raccord parfait."""
    parts = []
    sx, sy = 64, 35  # 10 colonnes × 12 rangées dans la tuile 640 × 420
    special = {(2, 1): "dot", (7, 4): "h", (4, 7): "dot", (9, 9): "h", (0, 10): "dot", (5, 2): "h", (8, 6): "dot"}
    for j in range(-2, 14):
        for i in range(-1, 11):
            x = i * sx + (sx / 2 if j % 2 else 0); y = j * sy
            kind = special.get((i % 10, j % 12))
            if kind == "dot":
                parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="{accent}"/>')
            elif kind == "h":
                parts.append(h_mark(x, y, 34, mark, accent))
            else:
                parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{dot}"/>')
    return tile(bg, "".join(parts))

def zellige(bg, line, accent, stroke=5):
    """« Zellige doux » : étoiles à huit branches au trait, reliées en treillis ; un point au centre de certaines."""
    s = 140  # module carré, la tuile fait 4 × 3 modules (560 × 420) ; on redimensionne la tuile à cette taille
    parts = []
    for gy in range(-1, 4):
        for gx in range(-1, 5):
            cx, cy = gx * s + s / 2, gy * s + s / 2
            r = s * 0.36
            sq1 = [(cx - r, cy - r), (cx + r, cy - r), (cx + r, cy + r), (cx - r, cy + r)]
            rr = r * math.sqrt(2)
            sq2 = [(cx, cy - rr), (cx + rr, cy), (cx, cy + rr), (cx - rr, cy)]
            for sq in (sq1, sq2):
                parts.append('<polygon points="' + " ".join(f"{x:.1f},{y:.1f}" for x, y in sq) + f'" fill="none" stroke="{line}" stroke-width="{stroke}" stroke-linejoin="round"/>')
            parts.append(f'<line x1="{cx + rr:.1f}" y1="{cy:.1f}" x2="{cx + s - rr:.1f}" y2="{cy:.1f}" stroke="{line}" stroke-width="{stroke}"/>')
            parts.append(f'<line x1="{cx:.1f}" y1="{cy + rr:.1f}" x2="{cx:.1f}" y2="{cy + s - rr:.1f}" stroke="{line}" stroke-width="{stroke}"/>')
            if (gx % 4, gy % 3) in {(0, 0), (2, 1), (1, 2), (3, 2)}:
                parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{stroke * 2.2:.1f}" fill="{accent}"/>')
    return tile(bg, "".join(parts), 560, 420)

def tile(bg, inner, w=W, h=H):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="{bg}"/>{inner}</svg>'

if __name__ == "__main__":
    out = {
        "fil-prune": fil(PLUM, PLUM_LIGHT, "#C98A97", CREAM),
        "fil-creme": fil(CREAM, "#E2C7CC", PLUM_LIGHT, PLUM),
        "convives-prune": convives(PLUM, "#7A3344", "#D99AA6", "#8E3A4C"),
        "convives-creme": convives(CREAM, "#E2C7CC", DOT, "#C98A97"),
        "zellige-prune": zellige(PLUM, "#74303F", "#D99AA6"),
        "zellige-creme": zellige(CREAM, "#E8D2CF", DOT),
    }
    for k, v in out.items():
        open(f"motif-{k}.svg", "w").write(v)
    json.dump(out, open("/tmp/claude-0/-home-user-Thecommunity/20ed1818-1c28-5a1d-9a99-789750d585f2/scratchpad/motifs.json", "w"))
    print("ok", list(out))
