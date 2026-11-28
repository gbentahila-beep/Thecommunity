from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import sys, json

def instance(wght, opsz, soft):
    f = TTFont('fraunces-var.woff2')
    return instantiateVariableFont(f, {"wght": wght, "opsz": opsz, "SOFT": soft}, inplace=False)

def kern_table(font):
    # lit les paires de crénage GPOS simples (format 1 et 2) pour les glyphes utilisés
    pairs = {}
    gpos = font['GPOS'].table if 'GPOS' in font else None
    if not gpos: return pairs
    for li in gpos.LookupList.Lookup:
        for st in li.SubTable:
            if li.LookupType == 9: st = st.ExtSubTable
            if getattr(st, 'LookupType', li.LookupType) != 2 and li.LookupType not in (2, 9): continue
            if not hasattr(st, 'Format'): continue
            if st.Format == 1:
                cov = st.Coverage.glyphs
                for i, ps in enumerate(st.PairSet):
                    for pv in ps.PairValueRecord:
                        v = pv.Value1.XAdvance if pv.Value1 and hasattr(pv.Value1, 'XAdvance') else 0
                        pairs.setdefault((cov[i], pv.SecondGlyph), v or 0)
            elif st.Format == 2:
                cov = set(st.Coverage.glyphs)
                c1 = st.ClassDef1.classDefs; c2 = st.ClassDef2.classDefs
                for g1 in cov:
                    k1 = c1.get(g1, 0)
                    rec = st.Class1Record[k1]
                    for g2, k2 in c2.items():
                        v = rec.Class2Record[k2].Value1
                        x = getattr(v, 'XAdvance', 0) if v else 0
                        if x: pairs.setdefault((g1, g2), x)
    return pairs

def build(text, wght, opsz, soft, tracking=0.0, word=None, extra_kern=None, dot=True, dot_scale=1.0):
    font = instance(wght, opsz, soft)
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font['head'].unitsPerEm
    kern = kern_table(font)
    hm = font['hmtx']
    x = 0; parts = []; prev = None
    names = [cmap[ord(c)] for c in text]
    for i, c in enumerate(text):
        g = names[i]
        if prev: x += kern.get((prev, g), 0)
        if extra_kern and prev: x += extra_kern.get(text[i-1] + c, 0)
        if c == ' ':
            x += (word if word is not None else hm[g][0]); prev = g; continue
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (1, 0, 0, -1, x, 0))
        gs[g].draw(tp)
        parts.append(pen.getCommands())
        x += hm[g][0] + tracking * upm
        prev = g
    # point final : cercle parfait posé sur la ligne de base
    stem = None
    bp = BoundsPen(gs); gs[cmap[ord('l')]].draw(bp); lx0, ly0, lx1, ly1 = bp.bounds
    stem = (lx1 - lx0) * 0.55
    r = stem * 0.78 * dot_scale
    dotsvg = ''
    if dot:
        cx = x + r * 0.55; cy = -r
        dotsvg = f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" class="dot"/>'
        x = cx + r
    asc = font['OS/2'].sCapHeight or 700
    return {"paths": parts, "dot": dotsvg, "width": x, "cap": asc, "upm": upm}

def svg(d, fill="#561A29", dotfill="#B0566A", pad=40, extra=''):
    w = d["width"] + pad * 2; top = d["cap"] + pad + 30; h = d["cap"] + 60 + pad * 2 + 200
    body = ''.join(f'<path d="{p}"/>' for p in d["paths"])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-top} {w:.0f} {d["cap"] + 300 + pad:.0f}" role="img" aria-label="The Host Club">'
            f'<style>.dot{{fill:{dotfill}}}</style><g fill="{fill}">{body}</g>{d["dot"]}{extra}</svg>')

if __name__ == "__main__":
    cfg = json.loads(sys.argv[1])
    d = build(cfg["text"], cfg["wght"], cfg["opsz"], cfg["soft"], cfg.get("tracking", 0), cfg.get("word"), cfg.get("kern"), cfg.get("dot", True), cfg.get("dot_scale", 1.0))
    open(cfg["out"], "w").write(svg(d, cfg.get("fill", "#561A29"), cfg.get("dotfill", "#B0566A")))
    print(cfg["out"], round(d["width"]))
