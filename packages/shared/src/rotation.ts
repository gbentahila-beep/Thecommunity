import { z } from "zod";
import { MOROCCO_TIMEZONE } from "./constants";
import { bookingClosesAt } from "./booking";
import { bookingWindow, type WindowState } from "./rendezvous";
import { zonedDateTimeToUtc, zonedParts } from "./time";

/**
 * docs/25, lot D — l'activité du samedi. Un rendez-vous « rotation » (rendezvous/{id}, kind « rotation ») enchaîne ses
 * activités semaine après semaine (running, céramique, padel, yoga, escape game…) : chaque activité est une expérience
 * à part entière (lieu, heure, places). L'équipe peut changer n'importe quel samedi (une autre activité, la proposition
 * d'un partenaire, ou pas d'activité) et choisir si la rotation reprend normalement ou se décale d'une semaine.
 */
export type RotationEntry = { experienceId: string; time: string; capacity: number };
/** Changement d'un samedi : `experienceId` null = pas d'activité ce samedi-là ; `shift` = la rotation se décale d'une semaine. */
export type RotationOverride = { experienceId: string | null; time?: string; capacity?: number; shift?: boolean; note?: string };
export type RotationConfig = { weekday: number; anchor: string; cycle: RotationEntry[]; overrides?: Record<string, RotationOverride> };
export type RotationWeek = { date: string; entry: RotationEntry | null; source: "cycle" | "override"; cycleIndex: number | null; shift: boolean; note: string };

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const ID = z.string().trim().regex(/^[A-Za-z0-9_-]{1,200}$/);

export const rotationEntrySchema = z.object({ experienceId: ID, time: z.string().regex(HHMM, "time"), capacity: z.coerce.number().int().min(2, "min2").max(500, "tooMany") });
export const rotationInputSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "slug").optional(),
  titleFr: z.string().trim().min(2, "required").max(80, "tooLong"),
  titleAr: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  titleEn: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  cityId: z.string().trim().min(2).max(40),
  weekday: z.coerce.number().int().min(0).max(6).default(6),
  /** Samedi où la rotation commence par la première activité (AAAA-MM-JJ). */
  anchor: z.string().regex(DAY_KEY, "date"),
  weeksAhead: z.coerce.number().int().min(1).max(12).default(6),
  cycle: z.array(rotationEntrySchema).min(1, "pickOne").max(12, "tooMany")
    .refine((c) => new Set(c.map((x) => x.experienceId)).size === c.length, "duplicate"),
  status: z.enum(["active", "paused"]).default("active"),
});
export type RotationInput = z.input<typeof rotationInputSchema>;

export const rotationWeekInputSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{3,80}$/),
  date: z.string().regex(DAY_KEY, "date"),
  /** null = revenir à la rotation pour ce samedi. */
  override: z
    .object({
      experienceId: ID.nullable(),
      time: z.string().regex(HHMM, "time").optional(),
      capacity: z.coerce.number().int().min(2).max(500).optional(),
      shift: z.boolean().default(false),
      note: z.string().trim().max(200).optional().or(z.literal("")),
    })
    .nullable(),
});

/** Ajouter une activité à la fin de la rotation (depuis sa fiche). */
export const rotationAddSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{3,80}$/),
  experienceId: ID,
  time: z.string().regex(HHMM, "time"),
  capacity: z.coerce.number().int().min(2, "min2").max(500, "tooMany"),
});

/** Jour local (heure du Maroc) d'un instant, « AAAA-MM-JJ ». */
export function localDayKey(instant: Date): string {
  const z = zonedParts(instant, MOROCCO_TIMEZONE);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
}
/** Instant UTC d'un jour local à une heure locale. */
export function localDayAt(day: string, time: string): Date {
  const [y, mo, d] = day.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  return zonedDateTimeToUtc({ year: y, month: mo, day: d, hour: h, minute: mi }, MOROCCO_TIMEZONE);
}
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/** Les prochains jours de la rotation (aujourd'hui compris), sur `weeks` semaines. */
export function rotationDays(weekday: number, now: Date, weeks: number): string[] {
  const z = zonedParts(now, MOROCCO_TIMEZONE);
  const out: string[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(Date.UTC(z.year, z.month - 1, z.day + i));
    if (d.getUTCDay() === weekday) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Programme de chaque jour : le changement décidé par l'équipe s'il y en a un, sinon l'activité dont c'est le tour.
 * Le tour avance d'une activité par semaine depuis `anchor` ; chaque changement « décaler » repousse la suite d'une semaine
 * (l'activité remplacée passe la semaine suivante).
 */
export function rotationPlan(rv: RotationConfig, days: string[]): RotationWeek[] {
  const n = rv.cycle.length;
  const overrides = rv.overrides ?? {};
  const shiftDays = Object.entries(overrides).filter(([d, o]) => o.shift && d >= rv.anchor).map(([d]) => d);
  return days.map((date) => {
    const weeks = Math.round((dayNumber(date) - dayNumber(rv.anchor)) / 7);
    const shifts = shiftDays.filter((d) => d < date).length;
    const cycleIndex = n ? (((weeks - shifts) % n) + n) % n : null;
    const o = overrides[date];
    if (o) {
      const known = rv.cycle.find((c) => c.experienceId === o.experienceId);
      const entry = o.experienceId ? { experienceId: o.experienceId, time: o.time ?? known?.time ?? "10:00", capacity: o.capacity ?? known?.capacity ?? 12 } : null;
      return { date, entry, source: "override", cycleIndex, shift: Boolean(o.shift), note: o.note ?? "" };
    }
    return { date, entry: cycleIndex === null ? null : rv.cycle[cycleIndex]!, source: "cycle", cycleIndex, shift: false, note: "" };
  });
}

/**
 * Ouverture des réservations de chaque samedi du programme (même fenêtre que les rendez-vous) : un samedi s'ouvre à
 * tous quand le précédent ferme (vendredi 20h30), une semaine plus tôt pour les abonnés Pass. Tant qu'il n'est pas
 * ouvert, l'équipe peut changer son activité sans toucher à personne : c'est son heure limite.
 */
export function rotationWindows(plan: RotationWeek[], now: Date): Map<string, WindowState> {
  const list = plan.filter((w) => w.entry).map((w) => ({ id: w.date, startAt: localDayAt(w.date, w.entry!.time) }));
  return bookingWindow(list, { closeRule: "eve" }, now, bookingClosesAt);
}

/** Heure limite pour choisir l'activité d'un samedi : son ouverture aux abonnés Pass (sinon à tous) ; null = déjà ouvert. */
export function rotationDeadline(w: WindowState | undefined): Date | null {
  if (!w || w.state === "open" || w.state === "off") return null;
  return w.passOpensAt ?? (w.state === "later" ? w.opensAt : null);
}

/** docs/25, lot D : l'activité du samedi au lancement, dans l'ordre de la rotation (modèles et heure conseillée). */
export const LAUNCH_ROTATION = {
  id: "activite-du-samedi",
  title: { fr: "L'activité du samedi", en: "Saturday Activity", ar: "نشاط السبت" },
  weekday: 6,
  templates: ["running", "ceramique", "padel", "yoga", "escape-game"],
} as const;
