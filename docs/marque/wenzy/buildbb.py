import base64, random, sys
S = sys.argv[1]; OUT = sys.argv[2]
P = "/home/user/Thecommunity/apps/web/public/"
def b64(path, t): return f"data:{t};base64," + base64.b64encode(open(path, "rb").read()).decode()
F = S + "/final/"
rep = {
 "LOGO_ENCRE": b64(F + "wenzy-logo-encre.svg", "image/svg+xml"),
 "LOGO_CREME": b64(F + "wenzy-logo-creme.svg", "image/svg+xml"),
 "LOGO_BLANC": b64(F + "wenzy-logo-blanc.svg", "image/svg+xml"),
 "LOGO_NOIR": b64(F + "wenzy-logo-noir.svg", "image/svg+xml"),
 "ICONE_ENCRE": b64(F + "wenzy-icone-encre.svg", "image/svg+xml"),
 "ICONE_CREME": b64(F + "wenzy-icone-creme.svg", "image/svg+xml"),
 "ICONE_DEGRADE": b64(F + "wenzy-icone-degrade.svg", "image/svg+xml"),
 "FAVICON": b64(F + "wenzy-favicon-32.png", "image/png"),
 "MOTIF_ENCRE": b64(S + "/bb/motif-encre.svg", "image/svg+xml"),
 "MOTIF_CREME": b64(S + "/bb/motif-creme.svg", "image/svg+xml"),
 "MOTIF_TUILE": b64(S + "/bb/motif-encre-tuile.svg", "image/svg+xml"),
 "IMG_SOIREE": b64(P + "images/photos/univers-sorties-soiree.webp", "image/webp"),
 "IMG_DINER": b64(P + "images/photos/rencontre-groupe-diner.webp", "image/webp"),
 "IMG_DINER2": b64(P + "images/photos/univers-diners.webp", "image/webp"),
 "IMG_ATELIER": b64(P + "images/photos/univers-ateliers.webp", "image/webp"),
 "IMG_SPORT": b64(P + "images/photos/rencontre-groupe-sport.webp", "image/webp"),
 "IMG_PORTRAIT": b64(P + "images/aya-snoussi.webp", "image/webp"),
}
r = random.Random(3); cells = []
for y in range(7):
    for x in range(7):
        corner = (x < 2 and y < 2) or (x > 4 and y < 2) or (x < 2 and y > 4)
        cells.append('<i></i>' if corner or r.random() > .45 else '<i class="o"></i>')
rep["QR"] = "".join(cells)
s = open(S + "/brandbook.src.html").read()
s = s.replace("Dîners et sorties entre inconnus 🍽", "Dîners et sorties entre inconnus")
s = s.replace("وينزي · ناسك كاينين", "وينزي · غرباء اليوم، أصدقاء الغد")
for k, v in rep.items(): s = s.replace("{{%s}}" % k, v)
assert "{{" not in s, s[s.index("{{"):s.index("{{")+40]
open(OUT, "w").write(s); print(len(s))
