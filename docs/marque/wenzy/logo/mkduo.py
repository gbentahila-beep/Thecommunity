"""Wenzy « duo » en couleurs Midi : « wen » net + « zy » manuscrit. Usage : python3 mkduo.py fonts sortie"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, "mkfun.py")).read().split("# ---------- palette fun")[0])

def L(ch, f, c, **kw): d = dict(ch=ch, f=f, c=c); d.update(kw); return d

COBALT, SAFRAN, CHAUX, NUIT, FIGUE = "#1340A8", "#F5C242", "#FBFAF6", "#10162B", "#F28BA8"

# (police de « wen », police de « zy », taille relative du zy, angle, décalage vertical, rapprochement)
DUOS = {
    "caveat": ("outfit", "caveat", 1.30, -6, -10, 10),
    "kaushan": ("outfit", "kaushan", 1.12, -4, -10, 12),
    "yellowtail": ("outfit", "yellowtail", 0.86, -3, -10, 14),
    "dancing": ("outfit", "dancing", 1.18, -4, -10, 12),
}

COLORWAYS = {  # fond, wen, zy
    "cobalt": (COBALT, CHAUX, SAFRAN),
    "chaux": (CHAUX, COBALT, FIGUE),
    "nuit": (NUIT, CHAUX, SAFRAN),
    "safran": (SAFRAN, NUIT, COBALT),
}


def seg(text, fk, c, xh_target, rot=0, dy=0, track=0):
    tt, gs, f, upem, xh = font(fk)
    k = xh_target / xh
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties(); hb.shape(f, buf, {"kern": True, "liga": True, "calt": True})
    order = tt.getGlyphOrder(); x = 0; pen = SVGPathPen(None); xs = []; ys = []
    for i, (inf, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        name = order[inf.codepoint]
        rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
        ox = x + pos.x_offset
        rec.replay(TransformPen(pen, (k, 0, 0, k, ox * k, dy)))
        bp = BoundsPen(gs); gs[name].draw(bp)
        if bp.bounds:
            xs += [ox * k + bp.bounds[0] * k, ox * k + bp.bounds[2] * k]; ys += [bp.bounds[1] * k + dy, bp.bounds[3] * k + dy]
        x += pos.x_advance + track
    return dict(d=pen.getCommands(), c=c, rot=rot, box=(min(xs), min(ys), max(xs), max(ys)))


def place(segs, gaps):
    """aligne les segments de gauche à droite : gaps[i] = espace entre l'encre du segment i et i+1"""
    out = []; cursor = 0
    for i, sg in enumerate(segs):
        x0, y0, x1, y1 = sg["box"]; shift = cursor - x0
        d = sg["d"]
        out.append(dict(d=d, c=sg["c"], rot=sg["rot"], shift=shift, box=(x0 + shift, y0, x1 + shift, y1),
                        cx=(x0 + x1) / 2 + shift, cy=(y0 + y1) / 2))
        cursor = x1 + shift + (gaps[i] if i < len(gaps) else 0)
    for o in out:  # applique le décalage dans le tracé via transform
        o["tf"] = f'translate({o["shift"]:.1f},0)'
    return out


def duo(key, wen_c, zy_c):
    fw, fz, s, rot, dy, dx = DUOS[key]
    return place([seg("wen", fw, wen_c, 520, track=-18), seg("zy", fz, zy_c, 520 * s, rot=rot, dy=dy)], [dx])


def svg2(items, bg=None, pad=70):
    xs = []; ys = []
    for it in items:
        x0, y0, x1, y1 = it["box"]; m = 30 + abs(it["rot"]) * 6
        xs += [x0 - m, x1 + m]; ys += [y0 - m, y1 + m]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    W, H = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad; vx, vy = x0 - pad, -(y1 + pad)
    body = "".join(f'<g transform="rotate({-it["rot"]} {it["cx"]:.1f} {it["cy"]:.1f})"><path d="{it["d"]}" fill="{it["c"]}" transform="{it["tf"]}"/></g>' for it in items)
    bgr = f'<rect x="{vx:.0f}" y="{vy:.0f}" width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.0f} {vy:.0f} {W:.0f} {H:.0f}" role="img" aria-label="Wenzy"><title>Wenzy</title>{bgr}'
            f'<g transform="scale(1,-1)">{body}</g></svg>')


def icon(key, bg, c, size=1000):
    fw, fz, s, rot, dy, dx = DUOS[key]
    it = place([seg("zy", fz, c, 520 * s, rot=rot)], [])
    x0, y0, x1, y1 = it[0]["box"]
    w, h = x1 - x0, y1 - y0; k = size * 0.62 / max(w, h)
    tx = size / 2 - (x0 + w / 2) * k; ty = size / 2 + (y0 + h / 2) * k
    paths = "".join(f'<g transform="rotate({-i["rot"]} {i["cx"]:.1f} {i["cy"]:.1f})"><path d="{i["d"]}" fill="{i["c"]}" transform="{i["tf"]}"/></g>' for i in it)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Wenzy"><title>Wenzy</title>'
            f'<rect width="{size}" height="{size}" rx="220" fill="{bg}"/><g transform="translate({tx:.1f},{ty:.1f}) scale({k:.4f},{-k:.4f})">{paths}</g></svg>')


for key in DUOS:
    for cw, (bg, a, b) in COLORWAYS.items():
        open(f"{OUT}/{key}-{cw}.svg", "w").write(svg2(duo(key, a, b), bg=bg, pad=170))
    open(f"{OUT}/{key}-cobalt-transparent.svg", "w").write(svg2(duo(key, CHAUX, SAFRAN), pad=20))
    open(f"{OUT}/{key}-chaux-transparent.svg", "w").write(svg2(duo(key, COBALT, FIGUE), pad=20))
    open(f"{OUT}/{key}-icone.svg", "w").write(icon(key, COBALT, SAFRAN))
print("ok")
