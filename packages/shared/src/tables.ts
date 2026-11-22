import { z } from "zod";
import { bookingClosesAt, SELF_CHECKIN_AFTER_MIN, SELF_CHECKIN_BEFORE_MIN } from "./booking";
import { ageOn } from "./profile";
import { VENUE_REVEAL_HOURS } from "./venue";

/**
 * Parcours des Tables (docs/22 § 8 et § 17.H) : horaires d'une date, résumé de table sans les noms, minimum.
 * Utilisé à l'identique par le serveur (tâche planifiée, callables) et par l'interface.
 */

/** Tables définitives et message au lieu : 1 h avant le début. */
export const TABLES_FINAL_HOURS = 1;
/** Messages entre les personnes d'une table : ouverts 2 h après le début, pendant 14 jours. */
export const TABLE_CHAT_OPENS_AFTER_HOURS = 2;
export const TABLE_CHAT_DAYS = 14;
export const TABLE_MESSAGE_MAX = 500;
/** Relances à l'équipe quand le lieu d'une date à lieu secret n'est pas renseigné (heures avant le début). */
export const VENUE_REMINDER_HOURS = [24, 8] as const;

const HOUR = 3_600_000;

/** Une date suit le parcours des Tables : dîner (ou café, brunch, déjeuner) en tables composées. */
export function isTablesFlow(e: { bookingMode?: string; groupConfig?: unknown } | null | undefined): boolean {
  return e?.bookingMode === "social_dinner" && Boolean(e.groupConfig);
}

export type TablesTimeline = { closesAt: Date; revealAt: Date; finalAt: Date; checkInFrom: Date; checkInUntil: Date; chatFrom: Date; chatUntil: Date };

/** Les heures clés d'une date de Tables. */
export function tablesTimeline(startAt: Date | string): TablesTimeline {
  const start = new Date(startAt);
  const t = start.getTime();
  const chatFrom = new Date(t + TABLE_CHAT_OPENS_AFTER_HOURS * HOUR);
  return {
    closesAt: bookingClosesAt(start, "social_dinner"),
    revealAt: new Date(t - VENUE_REVEAL_HOURS * HOUR),
    finalAt: new Date(t - TABLES_FINAL_HOURS * HOUR),
    checkInFrom: new Date(t - SELF_CHECKIN_BEFORE_MIN * 60_000),
    checkInUntil: new Date(t + SELF_CHECKIN_AFTER_MIN * 60_000),
    chatFrom,
    chatUntil: new Date(chatFrom.getTime() + TABLE_CHAT_DAYS * 24 * HOUR),
  };
}

/** Assez d'inscrits pour au moins une table complète ? */
export function minimumMet(seatsConfirmed: number, groupConfig: { minSize: number } | null | undefined): boolean {
  return seatsConfirmed >= Math.max(1, groupConfig?.minSize ?? 1);
}

/** Tables hors des limites (ex. une table de 7 pour des tables de 4 à 6) : à valider par l'équipe. */
export function tablesOutOfBounds(sizes: number[], groupConfig: { minSize: number; maxSize: number }): number[] {
  return sizes.map((n, i) => (n > groupConfig.maxSize || n < groupConfig.minSize ? i : -1)).filter((i) => i >= 0);
}

export type TableSummaryPerson = { birthDate?: string | null; languages?: string[]; sector?: string | null; interests?: string[]; seats?: number };

/**
 * Résumé de la table sans les noms (décision 37), montré à la révélation : nombre de convives, tranche d'âge, langues,
 * secteurs et centres d'intérêt les plus partagés des AUTRES personnes. Aucun prénom, aucune donnée nominative.
 */
export type TableSummary = { others: number; ageMin: number | null; ageMax: number | null; languages: string[]; sectors: string[]; interests: string[] };

const OPEN_SECTORS = new Set(["student", "not_working", "other"]);

function topOf(values: string[], max: number): string[] {
  const count = new Map<string, number>();
  values.forEach((v) => count.set(v, (count.get(v) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([v]) => v);
}

export function tableSummary(others: TableSummaryPerson[], now: Date = new Date()): TableSummary {
  const ages = others.map((p) => (p.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) ? ageOn(p.birthDate, now) : null)).filter((a): a is number => a !== null && a >= 18 && a < 100);
  return {
    // Les invités (« Moi + 1 ») comptent comme convives, sans rien dire d'eux.
    others: others.reduce((n, p) => n + Math.max(1, p.seats ?? 1), 0),
    ageMin: ages.length ? Math.min(...ages) : null,
    ageMax: ages.length ? Math.max(...ages) : null,
    languages: topOf(others.flatMap((p) => [...new Set(p.languages ?? [])]), 4),
    sectors: topOf(others.map((p) => p.sector ?? "").filter((s) => s && !OPEN_SECTORS.has(s)), 4),
    interests: topOf(others.flatMap((p) => [...new Set(p.interests ?? [])]), 5),
  };
}

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

/** Déplacer sa réservation sur une autre date du même rendez-vous (décision 38). */
export const moveReservationSchema = z.object({ reservationId: idSchema, targetSessionId: idSchema });

/** Minimum non atteint (décision 17) : chaque inscrit choisit une autre date ou le remboursement. */
export const minimumChoiceSchema = z.discriminatedUnion("choice", [
  z.object({ reservationId: idSchema, choice: z.literal("refund") }),
  z.object({ reservationId: idSchema, choice: z.literal("move"), targetSessionId: idSchema }),
]);

/** Message entre les personnes d'une table, après la rencontre (décision 39). */
export const tableMessageSchema = z.object({ groupId: idSchema, text: z.string().trim().min(1, "required").max(TABLE_MESSAGE_MAX, "tooLong") });
