/**
 * Étape 11d — billet. Le QR code du billet ouvre la fiche du billet dans le back-office
 * (réservée à l'équipe : un visiteur sans rôle n'y voit rien). Le code court permet
 * de retrouver le billet à la main si le scan échoue.
 */
export function ticketCode(reservationId: string): string {
  return reservationId.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
}

export function ticketPath(reservationId: string): string {
  return `/admin/billets/${encodeURIComponent(reservationId)}`;
}

/** Un billet ne donne accès que s'il est confirmé (ou déjà pointé présent). */
export function ticketState(status: string): "valid" | "used" | "pending" | "void" {
  if (status === "confirmed") return "valid";
  if (status === "attended") return "used";
  if (status === "pending_payment") return "pending";
  return "void";
}
