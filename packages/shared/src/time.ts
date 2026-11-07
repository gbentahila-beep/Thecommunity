/**
 * Conversion heure locale d'une ville ⇄ instant UTC, sans dépendance externe.
 * Indispensable au Maroc : le décalage passe de UTC+1 à UTC+0 pendant le Ramadan,
 * il ne doit donc jamais être codé en dur.
 */

function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** Renvoie l'instant UTC correspondant à une date/heure murale dans `timeZone`. */
export function zonedDateTimeToUtc(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string,
): Date {
  const naive = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  // Deux passes suffisent pour converger, y compris autour d'un changement d'heure.
  let guess = naive - offsetMinutes(new Date(naive), timeZone) * 60_000;
  guess = naive - offsetMinutes(new Date(guess), timeZone) * 60_000;
  return new Date(guess);
}

/** Composantes calendaires (année, mois, jour, jour de semaine 0=dimanche) d'un instant dans `timeZone`. */
export function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdays.indexOf(get("weekday")),
  };
}
