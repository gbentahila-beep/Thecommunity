import json, math
from mklogo import build, instance
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
OUT = "/home/user/Thecommunity/docs/marque/logo/"
P = dict(wght=580, opsz=144, soft=100, tracking=-0.012, word=330, extra_kern={"Th": -30, "Ho": -12, "Cl": -12})
PLUM, PLUMLIGHT, CREAM, DOT_ON_PLUM = "#561A29", "#B0566A", "#F8EFE8", "#D99AA6"

def group(d, fill):
    return f'<g fill="{fill}">' + "".join(f'<path d="{p}"/>' for p in d["paths"]) + "</g>"

def write(name, w, h, vb_x, vb_y, inner, title="The Host Club"):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x:.0f} {vb_y:.0f} {w:.0f} {h:.0f}" role="img" aria-label="{title}">{inner}</svg>'
    open(OUT + name, "w").write(s); return s

res = {}
# Horizontal
d = build("The Host Club", P["wght"], P["opsz"], P["soft"], P["tracking"], P["word"], P["extra_kern"], True, 1.05)
cap = d["cap"]; pad = 0
asc_top = -1500; desc = 120
for variant, fill, dot in [("horizontal-prune", PLUM, PLUMLIGHT), ("horizontal-creme", CREAM, DOT_ON_PLUM), ("horizontal-encre", "#2A1D1F", "#2A1D1F")]:
    inner = group(d, fill) + d["dot"].replace('class="dot"', f'fill="{dot}"')
    res[variant] = write(f"the-host-club-{variant}.svg", d["width"] + 40, 1620, -20, asc_top, inner)
# Empilé : « The Host » / « Club. »
l1 = build("The Host", P["wght"], P["opsz"], P["soft"], P["tracking"], P["word"], P["extra_kern"], False)
l2 = build("Club", P["wght"], P["opsz"], P["soft"], P["tracking"], P["word"], P["extra_kern"], True, 1.05)
lead = 1520
w = max(l1["width"], l2["width"]) + 40
for variant, fill, dot in [("empile-prune", PLUM, PLUMLIGHT), ("empile-creme", CREAM, DOT_ON_PLUM)]:
    inner = group(l1, fill) + f'<g transform="translate(0 {lead})">' + group(l2, fill) + l2["dot"].replace('class="dot"', f'fill="{dot}"') + "</g>"
    res[variant] = write(f"the-host-club-{variant}.svg", w, 1500 + lead + 80, -20, asc_top, inner)

# Monogramme A : « h. »
f = instance(P["wght"], P["opsz"], P["soft"]); gs = f.getGlyphSet(); cmap = f.getBestCmap(); hm = f["hmtx"]
pen = SVGPathPen(gs); gs[cmap[ord("h")]].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))
bp = BoundsPen(gs); gs[cmap[ord("h")]].draw(bp); x0, y0, x1, y1 = bp.bounds
r = 118
hpath = pen.getCommands()
cx = x1 + r * 0.9; cy = -r
def mono_a(fg, dot):
    return f'<path d="{hpath}" fill="{fg}"/><circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r}" fill="{dot}"/>'
bw = cx + r - x0; bh = y1 - y0
res["mono-a"] = write("monogramme-a-h-point.svg", bw + 120, bh + 120, x0 - 60, -y1 - 60, mono_a(PLUM, PLUMLIGHT), "The Host Club — monogramme h.")
json.dump({"a": {"path": hpath, "cx": cx, "cy": cy, "r": r, "vb": [x0 - 60, -y1 - 60, bw + 120, bh + 120]}}, open("mono-a.json", "w"))

json.dump({k: v for k, v in res.items()}, open("svgs.json", "w"))
print("ok", list(res))
