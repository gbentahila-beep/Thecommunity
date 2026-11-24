import { z } from "zod";
import { MOROCCO_TIMEZONE } from "./constants";
import { zonedDateTimeToUtc, zonedParts } from "./time";
import { VENUE_TIERS, type VenueTier } from "./two-part";
import type { LocalizedText } from "./types";

/**
 * docs/25 — les rendez-vous de la semaine. Un rendez-vous (« Dîner du mercredi ») = un jour et une heure fixes, et
 * une expérience par gamme (Casual, Premium, Exclusive) qui porte tout le reste : prix, places, attribution des
 * restaurants de sa gamme, tables, liste d'attente. Les dates de chaque gamme sont créées automatiquement
 * `weeksAhead` semaines à l'avance, selon sa fréquence : chaque semaine, ou seulement la première de chaque mois.
 * Les réservations ferment la veille à 20h30 (règle « eve » posée sur les expériences du rendez-vous).
 */
export const RENDEZVOUS_FREQUENCIES = ["weekly", "first_of_month"] as const;
export type RendezvousFrequency = (typeof RENDEZVOUS_FREQUENCIES)[number];
export const RENDEZVOUS_WEEKS_AHEAD = 6;

export type RendezvousTier = { tier: VenueTier; experienceId: string; frequency: RendezvousFrequency };
export type Rendezvous = {
  id: string;
  title: LocalizedText;
  cityId: string;
  /** 0 = dimanche … 6 = samedi (heure du Maroc). */
  weekday: number;
  /** « 20:30 » */
  time: string;
  capacity: number;
  weeksAhead: number;
  tiers: RendezvousTier[];
  status: "active" | "paused";
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const rendezvousInputSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "slug").optional(),
  titleFr: z.string().trim().min(2, "required").max(80, "tooLong"),
  titleAr: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  titleEn: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  cityId: z.string().trim().min(2).max(40),
  weekday: z.coerce.number().int().min(0).max(6),
  time: z.string().regex(HHMM, "time"),
  capacity: z.coerce.number().int().min(2, "min2").max(500, "tooMany"),
  weeksAhead: z.coerce.number().int().min(1).max(12).default(RENDEZVOUS_WEEKS_AHEAD),
  /** Gammes : expérience de base (la gamme est fixée sur sa copie) et fréquence. */
  baseExperienceId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,200}$/),
  tiers: z.array(z.object({ tier: z.enum(VENUE_TIERS), frequency: z.enum(RENDEZVOUS_FREQUENCIES) })).min(1).max(3)
    .refine((t) => new Set(t.map((x) => x.tier)).size === t.length, "duplicateTier"),
  status: z.enum(["active", "paused"]).default("active"),
});
export type RendezvousInput = z.input<typeof rendezvousInputSchema>;

/** Première occurrence de ce jour de la semaine dans le mois ? (jour 1 à 7) */
export function isFirstOfMonth(instant: Date): boolean {
  return zonedParts(instant, MOROCCO_TIMEZONE).day <= 7;
}

export function tierRunsOn(frequency: RendezvousFrequency, instant: Date): boolean {
  return frequency === "weekly" || isFirstOfMonth(instant);
}

/**
 * Prochaines dates du rendez-vous (instants UTC), de maintenant à `weeks` semaines, à l'heure du Maroc (le décalage
 * horaire change pendant le Ramadan : jamais codé en dur).
 */
export function rendezvousDates(rv: { weekday: number; time: string }, now: Date, weeks: number): Date[] {
  const [h, m] = rv.time.split(":").map(Number) as [number, number];
  const z = zonedParts(now, MOROCCO_TIMEZONE);
  const out: Date[] = [];
  for (let i = 0; i <= weeks * 7; i++) {
    const d = new Date(Date.UTC(z.year, z.month - 1, z.day + i));
    if (d.getUTCDay() !== rv.weekday) continue;
    const at = zonedDateTimeToUtc({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: h, minute: m }, MOROCCO_TIMEZONE);
    if (at.getTime() > now.getTime() && at.getTime() <= now.getTime() + weeks * 7 * 86_400_000) out.push(at);
  }
  return out;
}

/** Dates à créer pour une gamme : celles du rendez-vous selon sa fréquence, moins celles qui existent déjà. */
export function missingTierDates(rv: { weekday: number; time: string; weeksAhead: number }, t: { frequency: RendezvousFrequency }, existing: Date[], now: Date): Date[] {
  const have = new Set(existing.map((d) => d.getTime()));
  return rendezvousDates(rv, now, rv.weeksAhead).filter((d) => tierRunsOn(t.frequency, d) && !have.has(d.getTime()));
}
