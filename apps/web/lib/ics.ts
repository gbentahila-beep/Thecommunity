/** Fichier agenda .ics d'une réservation : même générateur que les e-mails (identifiant stable, mise à jour). */
export { buildIcs } from "@thecommunity/shared";

export function icsDataUri(ics: string) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
