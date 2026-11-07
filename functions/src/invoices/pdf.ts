import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { InvoiceDoc } from "./types";
import { dateFr, money } from "./format";

const PLUM = rgb(0.337, 0.102, 0.161); // #561a29
const INK = rgb(0.13, 0.11, 0.12);
const MUTED = rgb(0.42, 0.38, 0.4);
const LINE = rgb(0.88, 0.84, 0.82);

/** Les polices PDF standard ne couvrent que l'alphabet latin (WinAnsi) : tout autre caractère devient « ? ». */
function safe(font: PDFFont, text: string): string {
  const typographic: Record<string, string> = { "’": "'", "‘": "'", "“": '"', "”": '"', " ": " ", " ": " " };
  return [...text]
    .map((ch) => typographic[ch] ?? ch)
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return "?";
      }
    })
    .join("");
}

/** Coupe un texte en lignes d'au plus `width` points. */
function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of safe(font, text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Facture / avoir / reçu au format A4, à partir du document figé en base (rien n'est relu ailleurs). */
export async function renderInvoicePdf(inv: InvoiceDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${inv.title} ${inv.number}`);
  pdf.setAuthor(inv.seller?.legalName ?? "The Host Club");
  pdf.setCreator("The Host Club");
  const page: PDFPage = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const M = 48;
  const W = 595.28 - 2 * M;
  let y = 841.89 - M;

  const text = (t: string, x: number, yy: number, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(safe(o.f ?? font, t), { x, y: yy, size: o.size ?? 10, font: o.f ?? font, color: o.color ?? INK });
  const right = (t: string, xRight: number, yy: number, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb> } = {}) => {
    const f = o.f ?? font;
    const s = safe(f, t);
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, o.size ?? 10), y: yy, size: o.size ?? 10, font: f, color: o.color ?? INK });
  };

  // En-tête
  text("The Host Club.", M, y - 18, { size: 22, f: bold, color: PLUM });
  const titleLines = wrap(bold, inv.title, 13, 250);
  titleLines.forEach((l, i) => right(l, M + W, y - 12 - i * 16, { size: 13, f: bold, color: PLUM }));
  let ty = y - 12 - titleLines.length * 16;
  right(`N° ${inv.number}`, M + W, ty - 2, { size: 10, f: bold });
  right(`Date : ${dateFr(new Date(inv.issuedAt))}`, M + W, ty - 16, { color: MUTED });
  y = Math.min(y - 60, ty - 36);

  // Émetteur / client
  const col = W / 2;
  text("Émetteur", M, y, { size: 9, f: bold, color: MUTED });
  text("Client", M + col, y, { size: 9, f: bold, color: MUTED });
  y -= 15;
  const seller = inv.seller
    ? [inv.seller.legalName, inv.seller.address, `ICE : ${inv.seller.ice}`, inv.seller.if ? `IF : ${inv.seller.if}` : "", inv.seller.rc ? `RC : ${inv.seller.rc}` : "", inv.seller.email ?? ""].filter(Boolean)
    : ["The Host Club", "Société en cours d'immatriculation", "(raison sociale, siège et ICE à compléter)"];
  // Les polices standard ne savent pas écrire l'arabe : dans ce cas le nom est omis (l'e-mail identifie le client).
  const encodable = (t: string) => { try { font.encodeText(t); return true; } catch { return false; } };
  const buyer = [encodable(inv.buyer.name) ? inv.buyer.name : "", inv.buyer.email].filter(Boolean);
  if (buyer.length === 0) buyer.push("Membre");
  let ys = y;
  for (const l of seller) for (const w of wrap(font, l, 10, col - 16)) { text(w, M, ys); ys -= 13; }
  let yb = y;
  for (const l of buyer) for (const w of wrap(font, l, 10, col - 16)) { text(w, M + col, yb); yb -= 13; }
  y = Math.min(ys, yb) - 18;

  if (inv.kind === "credit_note" && inv.relatedInvoiceNumber) {
    text(`Avoir sur ${inv.relatedInvoiceNumber}${inv.reasonLabel ? ` — ${inv.reasonLabel}` : ""}`, M, y, { f: bold });
    y -= 20;
  }

  // Tableau
  const cQty = M + W * 0.62, cUnit = M + W * 0.8, cAmt = M + W;
  page.drawRectangle({ x: M, y: y - 6, width: W, height: 20, color: rgb(0.97, 0.92, 0.93) });
  text("Désignation", M + 6, y, { size: 9, f: bold });
  right("Qté", cQty, y, { size: 9, f: bold });
  right("Prix unit. TTC", cUnit, y, { size: 9, f: bold });
  right("Montant TTC", cAmt - 6, y, { size: 9, f: bold });
  y -= 24;
  for (const l of inv.lines) {
    const labelLines = wrap(font, l.label, 10, W * 0.55);
    labelLines.forEach((w, i) => text(w, M + 6, y - i * 13));
    right(String(l.quantity), cQty, y);
    right(money(l.unitAmount, inv.currency), cUnit, y);
    right(money(l.amount, inv.currency), cAmt - 6, y);
    let yy = y - labelLines.length * 13;
    if (l.detail) for (const w of wrap(font, l.detail, 9, W * 0.55)) { text(w, M + 6, yy, { size: 9, color: MUTED }); yy -= 12; }
    y = yy - 8;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: M + W, y: y + 4 }, thickness: 0.5, color: LINE });
    y -= 6;
  }

  // Totaux
  y -= 6;
  const sign = inv.kind === "credit_note" ? -1 : 1;
  const signed = (v: number) => sign * v || 0; // jamais « -0,00 »
  const row = (label: string, value: string, strong = false) => {
    right(label, cUnit, y, { f: strong ? bold : font, size: strong ? 11 : 10 });
    right(value, cAmt - 6, y, { f: strong ? bold : font, size: strong ? 11 : 10, color: strong ? PLUM : INK });
    y -= strong ? 18 : 15;
  };
  row("Total HT", money(signed(inv.totals.ht), inv.currency));
  row(inv.totals.rate != null ? `TVA ${String(inv.totals.rate).replace(".", ",")} %` : "TVA (taux à confirmer)", money(signed(inv.totals.vat), inv.currency));
  row(inv.kind === "credit_note" ? "Total remboursé TTC" : "Total TTC", money(signed(inv.totals.ttc), inv.currency), true);

  // Paiement et mentions
  y -= 14;
  const payLine = inv.kind === "credit_note"
    ? `Remboursé le ${dateFr(new Date(inv.payment.at))} sur le moyen de paiement d'origine.`
    : `Payé le ${dateFr(new Date(inv.payment.at))} par carte bancaire en ligne.`;
  text(payLine, M, y);
  y -= 22;
  const notes: string[] = [];
  if (inv.test) notes.push("Document de TEST : aucun paiement réel n'a eu lieu. Ce document n'a aucune valeur comptable.");
  else if (!inv.legal) notes.push("Ce reçu n'a pas valeur de facture : les informations de la société ne sont pas encore renseignées.");
  if (inv.totals.rate == null) notes.push("TVA : taux et mentions à confirmer avec l'expert-comptable.");
  for (const n of notes) for (const w of wrap(font, n, 9, W)) { text(w, M, y, { size: 9, color: MUTED }); y -= 12; }

  // Pied de page
  page.drawLine({ start: { x: M, y: M + 20 }, end: { x: M + W, y: M + 20 }, thickness: 0.5, color: LINE });
  text(`${inv.seller?.legalName ?? "The Host Club"} — ${inv.number}`, M, M + 6, { size: 8, color: MUTED });
  right("Document généré automatiquement", M + W, M + 6, { size: 8, color: MUTED });
  return pdf.save();
}
