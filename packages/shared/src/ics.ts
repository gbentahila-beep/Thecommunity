/**
 * Invitation agenda .ics (RFC 5545), commune au site (bouton « Ajouter à mon agenda ») et aux e-mails (audit du 23/11).
 * Même identifiant pour une réservation (`<id>@wenzy`) et numéro de version croissant : quand le lieu est révélé ou que
 * la date change, l'invitation jointe à l'e-mail met à jour l'événement déjà dans l'agenda au lieu d'en créer un second.
 */
function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function escape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}
/** Lignes de 75 octets au plus (pliage RFC 5545), sans couper un caractère. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(e: { uid: string; title: string; startAt: string | Date; endAt: string | Date; location: string; url: string; geo?: { lat: number; lng: number } | null; sequence?: number; cancelled?: boolean; now?: Date }) {
  const now = e.now ?? new Date();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wenzy//Reservations//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@wenzy`,
    `SEQUENCE:${e.sequence ?? Math.floor(now.getTime() / 1000)}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(new Date(e.startAt))}`,
    `DTEND:${stamp(new Date(e.endAt))}`,
    `SUMMARY:${escape(e.title)}`,
    `LOCATION:${escape(e.location)}`,
    ...(e.geo ? [`GEO:${e.geo.lat};${e.geo.lng}`] : []),
    `URL:${e.url}`,
    `DESCRIPTION:${escape(`Votre réservation Wenzy : ${e.url}`)}`,
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(fold).join("\r\n");
}
