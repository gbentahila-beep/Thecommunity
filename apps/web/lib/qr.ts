import QRCode from "qrcode";

/** QR code en SVG (texte), calculé côté serveur : aucun appel externe, aucune donnée transmise. */
export async function qrSvg(text: string, color = "#561A29"): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: color, light: "#FFFFFF" } });
}
