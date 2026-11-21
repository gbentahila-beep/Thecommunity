"""Wenzy : nouvelles palettes (sans bleu/jaune) et icône sans W isolé. Usage : python3 mkpal.py fonts sortie"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
FD_, OUT_ = sys.argv[1], sys.argv[2]
sys.argv = sys.argv[:1] + [FD_, "/tmp/_unused"]
exec(open(os.path.join(HERE, "mkfonts.py")).read().split("for k in FONTS")[0])
FD, OUT = FD_, OUT_
os.makedirs(OUT, exist_ok=True)

PAL = {  # clé: (fond clair, couleur du logo, point, accent)
    "corail": ("#FBF7F2", "#1F1B4D", "#FF6B57", "#CBBEF5"),
    "sanguine": ("#FFF8F3", "#4A0D24", "#FF5A36", "#FFC2D1"),
    "sapin": ("#FAF7F0", "#0F4C3A", "#FF9F6B", "#CFEBDD"),
    "fuchsia": ("#FFF9F5", "#1A1423", "#E8336E", "#FFD3B8"),
}
FONT = "outfit"


def icon(fg, dot, bg, size=1000):
    """Icône carrée : le mot entier « wenzy » et son point, centré (pas de W seul)."""
    svg = wordmark(FONT, fg, dot, pad=0)
    vb = [float(v) for v in svg.split('viewBox="')[1].split('"')[0].split()]
    inner = svg.split("</title>")[1].rsplit("</svg>", 1)[0]
    w = size * 0.74; s = w / vb[2]; h = vb[3] * s
    tx = (size - w) / 2 - vb[0] * s; ty = (size - h) / 2 - vb[1] * s + size * 0.02
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Wenzy"><title>Wenzy</title>'
            f'<rect width="{size}" height="{size}" rx="220" fill="{bg}"/><g transform="translate({tx:.1f},{ty:.1f}) scale({s:.4f})">{inner}</g></svg>')


for k, (light, main, dot, acc) in PAL.items():
    open(f"{OUT}/{k}-clair.svg", "w").write(wordmark(FONT, main, dot))
    open(f"{OUT}/{k}-fonce.svg", "w").write(wordmark(FONT, light, dot, bg=main))
    open(f"{OUT}/{k}-icone.svg", "w").write(icon(light, dot, main))
    open(f"{OUT}/{k}-icone-accent.svg", "w").write(icon(main, dot, acc))
print("ok")
