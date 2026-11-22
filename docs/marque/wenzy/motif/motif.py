"""Motif Wenzy « les liens » : des groupes de points (des personnes) reliés par des traits en dégradé.
Raccordable : tuile carrée, les éléments qui débordent sont répétés de l'autre côté."""
import random, math

def motif(size=600, dot="#F6F1EA", seed=7, grad_id="lg", line_w=3.2, r=7.5, bg=None, opacity=1):
    rnd = random.Random(seed)
    groups = []
    G = 4
    for gx in range(G):
        for gy in range(G):
            cx = (gx + .5) * size / G + rnd.uniform(-28, 28)
            cy = (gy + .5) * size / G + rnd.uniform(-28, 28)
            n = rnd.choice([1, 2, 2, 3, 3, 4, 5])
            pts = [(cx, cy)]
            for i in range(n - 1):  # une chaîne qui part dans une direction, avec des angles libres
                a = rnd.uniform(0, math.tau); L = rnd.uniform(30, 62)
                px, py = pts[-1]; pts.append((px + L * math.cos(a), py + L * math.sin(a)))
            groups.append(pts)
    out = []
    for pts in groups:
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                P = [(x + dx, y + dy) for x, y in pts]
                if all(x < -60 or x > size + 60 for x, _ in P) or all(y < -60 or y > size + 60 for _, y in P):
                    continue
                # traits courbes entre voisins
                for i in range(len(P) - 1):
                    (x1, y1), (x2, y2) = P[i], P[i + 1]
                    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
                    k = .35 if i % 2 == 0 else -.35; nx, ny = -(y2 - y1) * k, (x2 - x1) * k
                    out.append(f'<path d="M{x1:.1f} {y1:.1f} Q{mx+nx:.1f} {my+ny:.1f} {x2:.1f} {y2:.1f}" fill="none" stroke="url(#{grad_id})" stroke-width="{line_w}" stroke-linecap="round"/>')
                for j, (x, y) in enumerate(P):
                    out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * (1.25 if j == 0 else 1):.1f}" fill="{dot}"/>')
    bgr = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<defs><linearGradient id="{grad_id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{size}" y2="{size}">'
            f'<stop offset="0" stop-color="#FF6A4D"/><stop offset="1" stop-color="#C25BE8"/></linearGradient></defs>'
            f'{bgr}<g opacity="{opacity}">{"".join(out)}</g></svg>')

if __name__ == "__main__":
    import sys
    open(sys.argv[1] + "/motif-encre.svg", "w").write(motif(bg="#141414"))
    open(sys.argv[1] + "/motif-creme.svg", "w").write(motif(dot="#141414", bg="#F6F1EA", grad_id="lg2"))
    open(sys.argv[1] + "/motif-encre-tuile.svg", "w").write(motif())
    print("ok")
