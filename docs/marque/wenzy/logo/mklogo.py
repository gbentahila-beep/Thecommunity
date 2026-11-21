"""Génère les logos Wenzy (piste A « Midi ») en SVG vectoriel à partir de Bricolage Grotesque (OFL).
Usage : python3 mklogo.py <dossier fonts> <dossier sortie>"""
import sys, os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen, DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.areaPen import AreaPen

FD, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
COBALT, SAFRAN, CHAUX, NUIT = "#1340A8", "#F5C242", "#FBFAF6", "#10162B"
TRACK = -38  # crénage serré, unités /1000


def shape(path, text, track=0, rtl=False):
    blob = hb.Blob.from_file_path(path); face = hb.Face(blob); font = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    tt = TTFont(path); gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    x = 0; glyphs = []
    for i, (inf, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        name = order[inf.codepoint]
        glyphs.append((name, x + pos.x_offset, pos.y_offset))
        x += pos.x_advance + (track if i < len(buf.glyph_infos) - 1 else 0)
    return gs, glyphs, x


def contours(gs, name, dx, dy):
    """Liste des contours (commandes) d'un glyphe, déplacé, axe Y inversé plus tard."""
    rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
    t = RecordingPen(); rec.replay(TransformPen(t, (1, 0, 0, 1, dx, dy))); rec = t
    cs, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ("closePath", "endPath"):
            cs.append(cur); cur = []
    return cs


def to_d(cmds):
    pen = SVGPathPen(None)
    rp = RecordingPen(); rp.value = [c for cs in cmds for c in cs]
    rp.replay(pen)
    return pen.getCommands()


def area(cs):
    p = AreaPen(); r = RecordingPen(); r.value = cs; r.replay(p); return p.value


def word(path, text, track=TRACK):
    gs, glyphs, adv = shape(path, text, track)
    per = {}
    for name, x, y in glyphs:
        per.setdefault(name, []).append(contours(gs, name, x, y))
    return glyphs, per, adv, gs


def build(out, variant, fg, dot, bg=None, pad=60):
    path = os.path.join(FD, "bri-96-800.ttf")
    gs, glyphs, adv = shape(path, "wenzy", TRACK)
    body, eye = [], []
    xh, desc = 528, -230
    ex = None
    for name, x, y in glyphs:
        cs = contours(gs, name, x, y)
        if name == "w":
            bp = BoundsPen(gs); gs["w"].draw(bp); wx0, _, wx1, _ = bp.bounds
            wcx = x + (wx0 + wx1) / 2
        body += cs
    shapes = []
    w = adv
    top, bottom = xh + 40, desc - 10
    if variant == "bras":
        r = 78; cx = wcx; cy = xh + r + 34
        shapes.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{dot}"/>')
        top = cy + r
    if variant == "soleil":
        r = 80; cx = adv + 22; cy = xh + 140
        shapes.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{dot}"/>')
        w = cx + r; top = cy + r
    elif variant == "point":
        r = 62; cx = adv + 20 + r; cy = r
        shapes.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{dot}"/>')
        w = cx + r
    d_body = to_d(body)
    paths = f'<path d="{d_body}" fill="{fg}" fill-rule="nonzero"/>'
    if eye:
        paths += f'<path d="{to_d(eye)}" fill="{dot}" transform=""/>'
    x0, y0 = -pad, -(top + pad); W, H = w + 2 * pad, (top - bottom) + 2 * pad
    bgr = f'<rect x="{x0}" y="{y0}" width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {W} {H}" role="img" aria-label="Wenzy">'
           f'<title>Wenzy</title>{bgr}<g transform="scale(1,-1)">{paths}{"".join(shapes)}</g></svg>')
    open(os.path.join(OUT, out), "w").write(svg)
    return svg


def mono(out, variant, bg=COBALT, fg=CHAUX, dot=SAFRAN, radius=0.22, size=1000):
    """Monogramme carré : « w » + élément safran, dans un carré arrondi (radius en fraction ; 0 = carré plein)."""
    path = os.path.join(FD, "bri-96-800.ttf")
    gs, glyphs, adv = shape(path, "w")
    cs = contours(gs, "w", 0, 0)
    xh = 528
    s = 1.05  # échelle du w dans le carré
    # centrage optique
    gw = adv * s
    tx = (size - gw) / 2 - 30 * s
    ty = size / 2 + xh * s / 2 + 20
    extra = ""
    if variant == "soleil":
        tx -= 40
        extra = f'<circle cx="{tx + gw + 10}" cy="{ty - xh * s - 70}" r="{78}" fill="{dot}"/>'
    elif variant == "bras":
        s = 0.95; gw = adv * s; tx = (size - gw) / 2 - 18; ty = size / 2 + xh * s / 2 + 85
        bp = BoundsPen(gs); gs["w"].draw(bp); wx0, _, wx1, _ = bp.bounds
        extra = f'<circle cx="{tx + (wx0 + wx1) / 2 * s}" cy="{ty - xh * s - 110}" r="{82}" fill="{dot}"/>'
    elif variant == "point":
        tx -= 55
        extra = f'<circle cx="{tx + gw + 45}" cy="{ty - 66}" r="{66}" fill="{dot}"/>'
    rr = radius * size
    rect = f'<rect width="{size}" height="{size}" rx="{rr}" fill="{bg}"/>' if bg else ""
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Wenzy">'
           f'<title>Wenzy</title>{rect}<path transform="translate({tx},{ty}) scale({s},{-s})" d="{to_d(cs)}" fill="{fg}"/>{extra}</svg>')
    open(os.path.join(OUT, out), "w").write(svg)
    return svg


def arabic(out, fg=NUIT, pad=40):
    path = os.path.join(FD, "readex-600.ttf")
    gs, glyphs, adv = shape(path, "وينزي")
    allc = []
    for name, x, y in glyphs:
        allc += contours(gs, name, x, y)
    top, bottom = 760, -380
    x0, y0 = -pad, -(top + pad)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {adv + 2*pad} {top - bottom + 2*pad}" role="img" aria-label="وينزي">'
           f'<g transform="scale(1,-1)"><path d="{to_d(allc)}" fill="{fg}"/></g></svg>')
    open(os.path.join(OUT, out), "w").write(svg)
    return svg


if __name__ == "__main__":
    for v in ("soleil", "bras", "point"):
        build(f"{v}-cobalt.svg", v, COBALT, SAFRAN)
        build(f"{v}-sur-cobalt.svg", v, CHAUX, SAFRAN, bg=COBALT)
        build(f"{v}-nuit.svg", v, NUIT, NUIT)
        mono(f"{v}-monogramme.svg", v)
    arabic("arabe-nuit.svg")
    print("ok")
