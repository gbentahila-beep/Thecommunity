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

/**
 * Fenêtre de réservation des rendez-vous (validé le 24/11) : une seule date ouverte à la fois, la suivante s'ouvre
 * quand la précédente ferme (la veille à 20h30) ; les abonnés Pass ont une date d'avance (deux dates ouvertes).
 * `upcoming` : dates à venir de l'expérience (une gamme), triées, sans les dates annulées.
 */
export const RENDEZVOUS_OPEN_DATES = 1;
export const RENDEZVOUS_OPEN_DATES_PASS = 2;
export type WindowState = { state: "open" | "pass" | "later" | "off"; opensAt: Date | null; passOpensAt: Date | null };

type Closable = { bookingMode?: unknown; closeRule?: unknown; rendezvousSlot?: unknown };

/**
 * La date tombe-t-elle sur le jour et l'heure du rendez-vous ? (dates d'avant le rendez-vous, gardées pour leurs
 * inscrits : hors calendrier, elles ne sont plus ouvertes ni montrées.) Sans créneau connu : oui.
 */
export function onRendezvousSlot(start: Date, e: Closable): boolean {
  const slot = e.rendezvousSlot as { weekday?: number; time?: string } | null | undefined;
  if (!slot || typeof slot.weekday !== "number" || !slot.time) return true;
  const [h, m] = slot.time.split(":").map(Number);
  const z = zonedParts(start, MOROCCO_TIMEZONE);
  return z.weekday === slot.weekday && z.hour === h && z.minute === m;
}
export function bookingWindow(upcoming: { id: string; startAt: string | Date }[], e: Closable, now: Date, closesAt: (start: Date, e: Closable) => Date): Map<string, WindowState> {
  const list = upcoming
    .map((s) => ({ id: s.id, start: new Date(s.startAt) }))
    .filter((s) => closesAt(s.start, e).getTime() > now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const out = new Map<string, WindowState>();
  // Hors calendrier : fermée aux nouvelles réservations, et ne compte pas dans la fenêtre.
  for (const s of list.filter((x) => !onRendezvousSlot(x.start, e))) out.set(s.id, { state: "off", opensAt: null, passOpensAt: null });
  list.splice(0, list.length, ...list.filter((x) => onRendezvousSlot(x.start, e)));
  list.forEach((s, i) => {
    const prev = (k: number) => (i - k >= 0 ? closesAt(list[i - k]!.start, e) : null);
    out.set(s.id, {
      state: i < RENDEZVOUS_OPEN_DATES ? "open" : i < RENDEZVOUS_OPEN_DATES_PASS ? "pass" : "later",
      opensAt: i < RENDEZVOUS_OPEN_DATES ? null : prev(RENDEZVOUS_OPEN_DATES),
      passOpensAt: i < RENDEZVOUS_OPEN_DATES_PASS ? null : prev(RENDEZVOUS_OPEN_DATES_PASS),
    });
  });
  return out;
}

/** La date est-elle réservable pour cette personne ? (null = oui ; les autres contrôles restent ceux de la réservation) */
export function windowRefusal(w: WindowState | undefined, pass: boolean): "not_yet_open" | null {
  if (!w) return null;
  if (w.state === "open" || (w.state === "pass" && pass)) return null;
  return "not_yet_open";
}

/**
 * Listes (accueil, Découvrir) : pour un rendez-vous, seule la date ouverte de chaque gamme est montrée, et les gammes
 * d'une même date sont réunies en une seule ligne (`rendezvousTiers`). Les autres expériences ne changent pas.
 */
export function collapseRendezvous<T extends { experienceId: string; startAt: string; rendezvousId?: string | null; experience: { rendezvousId?: string | null; rendezvousKind?: string | null; venueTier?: VenueTier | null } & Closable }>(
  sessions: T[],
  now: Date,
  closesAt: (start: Date, e: Closable) => Date,
): (T & { rendezvousTiers?: VenueTier[] })[] {
  const firstOpen = new Set<string>();
  const byKey = new Map<string, T & { rendezvousTiers?: VenueTier[] }>();
  const out: (T & { rendezvousTiers?: VenueTier[] })[] = [];
  for (const s of sessions) {
    const rv = s.experience.rendezvousId;
    if (!rv) { out.push(s); continue; }
    // Lot D : l'activité du samedi n'a qu'une date ouverte pour toute la rotation (pas une par activité) ; une ancienne
    // date gardée pour ses inscrits (sans rendezvousId) n'est plus montrée.
    const rotation = s.experience.rendezvousKind === "rotation";
    const slotKey = rotation ? `rv:${rv}` : s.experienceId;
    if (rotation && s.rendezvousId !== rv) continue;
    if (closesAt(new Date(s.startAt), s.experience).getTime() <= now.getTime() || !onRendezvousSlot(new Date(s.startAt), s.experience) || firstOpen.has(slotKey)) continue;
    firstOpen.add(slotKey);
    const key = `${rv}|${s.startAt}`;
    const tier = s.experience.venueTier ?? null;
    const row = byKey.get(key);
    if (row) {
      if (tier && !row.rendezvousTiers!.includes(tier)) row.rendezvousTiers!.push(tier);
      row.rendezvousTiers!.sort((a, b) => VENUE_TIERS.indexOf(a) - VENUE_TIERS.indexOf(b));
      continue;
    }
    const merged = { ...s, rendezvousTiers: tier ? [tier] : [] };
    byKey.set(key, merged);
    out.push(merged);
  }
  return out;
}

/**
 * docs/25, lot E — le calendrier de lancement (Casablanca). Chaque rendez-vous part d'un modèle de Tables ; ses
 * gammes reprennent les événements existants de ce modèle (mêmes avis, mêmes réservations) ou sont créées.
 */
export const LAUNCH_RENDEZVOUS: readonly {
  id: string;
  templateId: string;
  title: { fr: string; en: string; ar: string };
  weekday: number;
  time: string;
  capacity: number;
  tiers: readonly { tier: VenueTier; frequency: RendezvousFrequency }[];
}[] = [
  {
    id: "diner-du-mercredi", templateId: "diner", title: { fr: "Dîner du mercredi", en: "Wednesday Dinner", ar: "عشاء الأربعاء" }, weekday: 3, time: "20:30", capacity: 36,
    tiers: [{ tier: "casual", frequency: "weekly" }, { tier: "premium", frequency: "weekly" }, { tier: "exclusive", frequency: "first_of_month" }],
  },
  {
    id: "cafe-du-samedi", templateId: "cafe", title: { fr: "Café du samedi", en: "Saturday Coffee", ar: "قهوة السبت" }, weekday: 6, time: "16:00", capacity: 36,
    tiers: [{ tier: "casual", frequency: "weekly" }, { tier: "premium", frequency: "weekly" }],
  },
  {
    id: "brunch-du-dimanche", templateId: "brunch", title: { fr: "Brunch du dimanche", en: "Sunday Brunch", ar: "برانش الأحد" }, weekday: 0, time: "12:30", capacity: 36,
    tiers: [{ tier: "casual", frequency: "weekly" }, { tier: "premium", frequency: "weekly" }],
  },
];

/**
 * docs/25, lot C — « gamme voisine » à la fermeture des réservations. Pour une même date d'un rendez-vous, une gamme
 * qui n'atteint pas le minimum d'une table envoie dans une gamme voisine les personnes qui l'ont accepté, si cela
 * permet à la gamme voisine d'atteindre (ou de garder) le minimum. Les autres restent : elles suivent le cas
 * « minimum non atteint » (autre semaine ou remboursement, jamais déplacées sans leur accord).
 */
export const TIER_NEIGHBOURS: Record<VenueTier, VenueTier[]> = { casual: ["premium", "exclusive"], premium: ["casual", "exclusive"], exclusive: ["premium", "casual"] };
export type TierLoad = { tier: VenueTier; sessionId: string; people: number; free: number; movable: { reservationId: string; seats: number }[] };
export type TierMove = { reservationId: string; from: string; to: string; toTier: VenueTier; seats: number };

export function planTierFallback(loads: TierLoad[], min: number): TierMove[] {
  const state = new Map(loads.map((l) => [l.tier, { ...l, movable: [...l.movable] }]));
  const moves: TierMove[] = [];
  // Les gammes les plus petites d'abord : ce sont elles qui ont besoin de rejoindre une voisine.
  for (let pass = 0; pass < 3; pass++) {
    const order = [...state.values()].filter((l) => l.people > 0 && l.people < min).sort((a, b) => a.people - b.people);
    let changed = false;
    for (const src of order) {
      const seats = src.movable.reduce((n, m) => n + m.seats, 0);
      if (seats === 0) continue;
      const target = TIER_NEIGHBOURS[src.tier]
        .map((t) => state.get(t))
        .find((t): t is NonNullable<typeof t> => Boolean(t) && t!.people > 0 && t!.people + seats >= min && t!.free >= seats && (t!.people >= min || t!.people >= src.people));
      if (!target) continue;
      for (const m of src.movable) moves.push({ reservationId: m.reservationId, from: src.sessionId, to: target.sessionId, toTier: target.tier, seats: m.seats });
      target.people += seats;
      target.free -= seats;
      src.people -= seats;
      src.movable = [];
      changed = true;
    }
    if (!changed) break;
  }
  return moves;
}
