import { z } from "zod";
import { bookingClosesAt, localOnDayBefore, SELF_CHECKIN_AFTER_MIN, SELF_CHECKIN_BEFORE_MIN } from "./booking";
import { MOROCCO_TIMEZONE } from "./constants";
import { zonedDateTimeToUtc, zonedParts } from "./time";
import { ageOn } from "./profile";

/**
 * Parcours des Tables (docs/22 § 8 et § 17.H) : horaires d'une date, résumé de table sans les noms, minimum.
 * Utilisé à l'identique par le serveur (tâche planifiée, callables) et par l'interface.
 */

/**
 * Timeline des Tables (24/11, remplace la décision 42), la même pour tous les rendez-vous :
 * - veille 15h : demandes d'« option » aux restaurants, entre les deux services (nombre d'inscrits + une table de marge) ;
 * - veille 18h30 : lieux encore sans réponse → l'équipe appelle (2 h avant la fermeture) ;
 * - veille 20h30 : fermeture des réservations, gamme voisine, minimum, nombre final envoyé aux lieux ;
 * - veille 21h30 : tables composées et lieu dévoilé ;
 * - jour J 11h (la veille à 21h30 pour un début avant 14h) : récapitulatif à chaque lieu (prénoms, allergies) ;
 * - 1 h avant : mise à jour au lieu seulement si quelque chose a changé depuis le récapitulatif.
 */
export const VENUE_OPTIONS_AT = { hour: 15, minute: 0 } as const;
export const VENUE_CALL_AT = { hour: 18, minute: 30 } as const;
export const VENUE_REVEAL_AT = { hour: 21, minute: 30 } as const;
export const VENUE_RECAP_AT = { hour: 11, minute: 0 } as const;
/** Début avant cette heure : le récapitulatif part dès le dévoilement (la veille au soir). */
export const RECAP_SAME_DAY_FROM_HOUR = 14;
/** Dernière vérification avant le début : mise à jour au lieu si les tables ont changé. */
export const TABLES_FINAL_HOURS = 1;
/** Messages entre les personnes d'une table (étape Z) : ouverts dès le check-in (30 min avant), gardés 14 jours. */
export const TABLE_CHAT_DAYS = 14;
export const TABLE_MESSAGE_MAX = 500;
/** Relances à l'équipe quand le lieu d'une date à lieu secret n'est pas renseigné (heures avant le début). */
export const VENUE_REMINDER_HOURS = [24, 8] as const;

const HOUR = 3_600_000;

/** Une date suit le parcours des Tables : dîner (ou café, brunch, déjeuner) en tables composées. */
export function isTablesFlow(e: { bookingMode?: string; groupConfig?: unknown } | null | undefined): boolean {
  return e?.bookingMode === "social_dinner" && Boolean(e.groupConfig);
}

export type TablesTimeline = { optionsAt: Date; callAt: Date; closesAt: Date; revealAt: Date; recapAt: Date; finalAt: Date; checkInFrom: Date; checkInUntil: Date; chatFrom: Date; chatUntil: Date };

/** Demandes d'option aux restaurants : la veille à 15h. */
export function venueOptionsAt(startAt: Date | string): Date {
  return localOnDayBefore(new Date(startAt), VENUE_OPTIONS_AT.hour, VENUE_OPTIONS_AT.minute);
}

/** Lieux encore sans réponse : l'équipe appelle, la veille à 18h30. */
export function venueCallAt(startAt: Date | string): Date {
  return localOnDayBefore(new Date(startAt), VENUE_CALL_AT.hour, VENUE_CALL_AT.minute);
}

/** Dévoilement du lieu et des tables : la veille à 21h30, une heure après la fermeture des réservations. */
export function revealAtFor(startAt: Date | string): Date {
  return localOnDayBefore(new Date(startAt), VENUE_REVEAL_AT.hour, VENUE_REVEAL_AT.minute);
}

/** Récapitulatif aux lieux : le jour J à 11h ; pour un début avant 14h, dès le dévoilement la veille. */
export function recapAtFor(startAt: Date | string): Date {
  const start = new Date(startAt);
  const z = zonedParts(start, MOROCCO_TIMEZONE);
  if (z.hour < RECAP_SAME_DAY_FROM_HOUR) return revealAtFor(start);
  return zonedDateTimeToUtc({ year: z.year, month: z.month, day: z.day, hour: VENUE_RECAP_AT.hour, minute: VENUE_RECAP_AT.minute }, MOROCCO_TIMEZONE);
}

/** Les heures clés d'une date de Tables. */
export function tablesTimeline(startAt: Date | string): TablesTimeline {
  const start = new Date(startAt);
  const t = start.getTime();
  const chatFrom = new Date(t - SELF_CHECKIN_BEFORE_MIN * 60_000);
  return {
    optionsAt: venueOptionsAt(start),
    callAt: venueCallAt(start),
    closesAt: bookingClosesAt(start, "social_dinner"),
    revealAt: revealAtFor(start),
    recapAt: recapAtFor(start),
    finalAt: new Date(t - TABLES_FINAL_HOURS * HOUR),
    checkInFrom: new Date(t - SELF_CHECKIN_BEFORE_MIN * 60_000),
    checkInUntil: new Date(t + SELF_CHECKIN_AFTER_MIN * 60_000),
    chatFrom,
    chatUntil: new Date(t + TABLE_CHAT_DAYS * 24 * HOUR),
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

/**
 * Événement à risque (décision 46) : l'équipe maintient, propose une autre date (même rendez-vous), regroupe avec un
 * événement compatible (même format et gamme), ou annule. Chacun accepte la proposition ou est remboursé.
 */
export const riskDecisionSchema = z.discriminatedUnion("action", [
  z.object({ sessionId: idSchema, action: z.literal("keep") }),
  z.object({ sessionId: idSchema, action: z.literal("propose"), targetSessionId: idSchema }),
]);
/** Réponse du participant à une proposition (autre date ou regroupement). */
export const proposalResponseSchema = z.object({ reservationId: idSchema, accept: z.boolean() });
/** Heure limite pour répondre à une proposition : la fermeture de la date proposée, au plus tard la révélation de la sienne. */
export function proposalDeadline(ownStart: Date | string, targetClosesAt: Date): Date {
  const own = revealAtFor(ownStart);
  return targetClosesAt.getTime() < own.getTime() ? targetClosesAt : own;
}
/** Événement à risque : la veille (24 h avant), moins d'inscrits que le minimum d'une table. */
export const RISK_CHECK_HOURS = 24;

/** Message entre les personnes d'une table, après la rencontre (décision 39). */
export const tableMessageSchema = z.object({ groupId: idSchema, text: z.string().trim().min(1, "required").max(TABLE_MESSAGE_MAX, "tooLong") });
