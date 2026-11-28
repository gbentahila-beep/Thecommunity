"""Wenzy : lettrages « fun » composés lettre par lettre (polices OFL vectorisées).
Chaque lettre a sa police, sa taille, sa couleur, son angle et son décalage.
Usage : python3 mkfun.py fonts sortie"""
import sys, os, math
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FD, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
_cache = {}


def font(key):
    if key not in _cache:
        p = os.path.join(FD, key + ".ttf"); tt = TTFont(p)
        blob = hb.Blob.from_file_path(p); f = hb.Font(hb.Face(blob))
        xh = tt["OS/2"].sxHeight if getattr(tt["OS/2"], "sxHeight", 0) else 500
        _cache[key] = (tt, tt.getGlyphSet(), f, tt["head"].unitsPerEm, xh)
    return _cache[key]


def glyph(key, ch):
    tt, gs, f, upem, xh = font(key)
    buf = hb.Buffer(); buf.add_str(ch); buf.guess_segment_properties(); hb.shape(f, buf, {})
    name = tt.getGlyphOrder()[buf.glyph_infos[0].codepoint]
    return gs, name, buf.glyph_positions[0].x_advance, upem, xh


def compose(letters, track=0, xh_norm=True):
    """letters : liste de dict(ch, f, s=1, c, rot=0, dy=0, dx=0). s = taille relative (1 = hauteur d'x commune)."""
    TX = 520  # hauteur d'x cible commune
    items, x = [], 0.0
    for L in letters:
        gs, name, adv, upem, xh = glyph(L["f"], L["ch"])
        k = (TX / xh if xh_norm else 1000 / upem) * L.get("s", 1)
        bp = BoundsPen(gs); gs[name].draw(bp); b = bp.bounds or (0, 0, adv, xh)
        x += L.get("dx", 0)
        ox = x - b[0] * k  # cale le bord gauche de l'encre sur x
        w = (b[2] - b[0]) * k
        cx, cy = ox + (b[0] + b[2]) / 2 * k, (b[1] + b[3]) / 2 * k + L.get("dy", 0)
        rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
        pen = SVGPathPen(None)
        rec.replay(TransformPen(pen, (k, 0, 0, k, ox, L.get("dy", 0))))
        items.append(dict(d=pen.getCommands(), c=L["c"], rot=L.get("rot", 0), cx=cx, cy=cy,
                          box=(ox + b[0] * k, b[1] * k + L.get("dy", 0), ox + b[2] * k, b[3] * k + L.get("dy", 0))))
        x += w + track + L.get("after", 0)
    return items


def bbox(items, extra=0):
    xs, ys = [], []
    for it in items:
        x0, y0, x1, y1 = it["box"]
        # marge pour la rotation
        r = math.radians(abs(it["rot"])); h = (y1 - y0); w = (x1 - x0)
        m = (h * math.sin(r) + w * (1 - math.cos(r))) / 2 + 10
        xs += [x0 - m, x1 + m]; ys += [y0 - m, y1 + m]
    return min(xs) - extra, min(ys) - extra, max(xs) + extra, max(ys) + extra


def svg(items, bg=None, pad=70, outline=None, ow=0, shadow=None, sh=(0, 0), tilt=0, extras_back="", extras_front="", extra_box=0):
    x0, y0, x1, y1 = bbox(items, ow + max(abs(sh[0]), abs(sh[1])) + extra_box)
    W, H = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    vx, vy = x0 - pad, -(y1 + pad)
    def layer(fill, stroke=None, swd=0, off=(0, 0)):
        out = ""
        for it in items:
            st = f' stroke="{stroke}" stroke-width="{swd}" stroke-linejoin="round" paint-order="stroke"' if stroke else ""
            out += (f'<path d="{it["d"]}" fill="{fill or it["c"]}"{st} '
                    f'transform="translate({off[0]},{off[1]}) rotate({-it["rot"]} {it["cx"]:.1f} {it["cy"]:.1f})"/>')
        return out
    body = ""
    if shadow: body += layer(shadow, shadow, ow * 2, sh)
    if outline: body += layer(None, outline, ow * 2)
    else: body += layer(None)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    bgr = f'<rect x="{vx:.0f}" y="{vy:.0f}" width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.0f} {vy:.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{bgr}'
            f'<g transform="scale(1,-1) rotate({-tilt} {cx:.0f} {cy:.0f})">{extras_back}{body}{extras_front}</g></svg>')


# ---------- palette fun ----------
TOMATE, BONBON, LILAS, POMME, CREME, ENCRE = "#FF5533", "#FF9EC7", "#A98BFF", "#7ED957", "#FFF3E3", "#1E1433"
# ---------- palette terre cuite (référence) ----------
TERRE, ATL, SAF, SABLE, ENC = "#B9462A", "#1D4466", "#E3A23B", "#F4EADB", "#22201C"


def L(ch, f, c, **kw): d = dict(ch=ch, f=f, c=c); d.update(kw); return d


def concepts(P):
    a, b, c, d, light, dark = P
    out = {}
    # 1. Duo : « wen » bulle + « zy » écrit à la main
    it = compose([L("w", "bagel", a, s=1.2), L("e", "bagel", a, s=1.2), L("n", "bagel", a, s=1.2, after=4),
                  L("z", "pacifico", c, s=1.15, dy=-10, rot=-6), L("y", "pacifico", c, s=1.15, dy=-10, rot=-6)], track=-6)
    out["duo"] = (it, {})
    # 2. Rebond : chaque lettre danse
    cols = [a, c, b, d, a]
    it = compose([L(ch, "caprasimo", cols[i], rot=r, dy=dy) for i, (ch, r, dy) in
                  enumerate(zip("wenzy", [-9, 7, -4, 10, -7], [0, 46, -6, 52, 4]))], track=10)
    out["rebond"] = (it, {})
    # 3. Autocollant : lettres pleines, contour épais, ombre décalée, mot penché
    it = compose([L(ch, "bagel", light, rot=r, dy=dy) for ch, r, dy in zip("wenzy", [-4, 3, -2, 4, -3], [0, 14, -4, 16, 0])], track=6)
    out["sticker"] = (it, dict(outline=dark, ow=13, shadow=a, sh=(46, -46), tilt=-5))
    # 4. Grand Z : un Z géant au cœur du mot
    it = compose([L("w", "rubik", dark), L("e", "rubik", dark), L("n", "rubik", dark, after=-30),
                  L("Z", "shrikhand", a, s=1.0, rot=-8, dy=-60, after=-40), L("y", "rubik", dark)], track=4)
    out["grandz"] = (it, {})
    # 5. Mélange : une police par lettre, même hauteur
    it = compose([L("w", "shrikhand", a, rot=-3), L("e", "bagel", c, dy=10), L("n", "fraunces-it", b, s=1.05),
                  L("z", "dela", d, s=.95, rot=5, dy=8), L("y", "pacifico", a, s=1.2, dy=-10)], track=16)
    out["melange"] = (it, {})
    # 6. Sourire : écriture liée, souligné en sourire
    it = compose([L(ch, "pacifico", a, s=1.15) for ch in "wenzy"], track=-34)
    x0, y0, x1, y1 = bbox(it)
    smile = (f'<path d="M{x0+10:.0f} {y0+300:.0f} C{x0+240:.0f} {y0-170:.0f} {x1-260:.0f} {y0-170:.0f} {x1+20:.0f} {y0+330:.0f}" '
             f'fill="none" stroke="{c}" stroke-width="64" stroke-linecap="round"/>')
    out["sourire"] = (it, dict(extras_back=smile, extra_box=200))
    return out


FUN_BG = {"duo": CREME, "rebond": CREME, "sticker": LILAS, "grandz": BONBON, "melange": CREME, "sourire": CREME}
for k, (it, kw) in concepts((TOMATE, BONBON, LILAS, POMME, CREME, ENCRE)).items():
    open(f"{OUT}/fun-{k}.svg", "w").write(svg(it, bg=FUN_BG[k], **kw))
    open(f"{OUT}/fun-{k}-transparent.svg", "w").write(svg(it, **kw))
TC_BG = {"duo": SABLE, "rebond": SABLE, "sticker": ATL, "grandz": SABLE, "melange": SABLE, "sourire": SABLE}
for k, (it, kw) in concepts((TERRE, SAF, ATL, "#E07A5F", SABLE, ENC)).items():
    open(f"{OUT}/tc-{k}.svg", "w").write(svg(it, bg=TC_BG[k], **kw))
print("ok")
