import { z } from "zod";
import { MOROCCO_TIMEZONE } from "./constants";
import { zonedParts } from "./time";
import { VENUE_TIERS } from "./two-part";

/**
 * Attribution automatique des lieux (docs/22, décisions 41 à 47) : fiche du lieu (gammes, formats, créneaux,
 * capacités), capacité d'un lieu pour une date, répartition des tables entre plusieurs lieux, demandes aux lieux,
 * messages prédéfinis (e-mail, WhatsApp). Code commun au serveur et au back-office.
 */

/** Ce qu'on réserve chez le lieu : une table (restaurant, café), un terrain (padel), une session (escape game), des places (cours, atelier). */
export const VENUE_UNITS = ["table", "court", "session", "spot"] as const;
export type VenueUnit = (typeof VENUE_UNITS)[number];
export const PARTNER_LEVELS = ["regular", "occasional"] as const;
export type PartnerLevel = (typeof PARTNER_LEVELS)[number];

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time");
/** Créneau habituel : un jour de la semaine (0 = dimanche), une plage d'heures de début, un nombre de ressources. */
export const partnerSlotSchema = z.object({ weekday: z.coerce.number().int().min(0).max(6), from: hhmm, to: hhmm, units: z.coerce.number().int().min(0, "min0").max(100, "tooMany") })
  .refine((s) => s.from <= s.to, { path: ["to"], message: "timeOrder" });
/** Ouverture ou fermeture exceptionnelle à une date (0 = fermé ce jour-là). */
export const partnerExceptionSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date"), units: z.coerce.number().int().min(0, "min0").max(100, "tooMany") });
export type PartnerSlot = z.infer<typeof partnerSlotSchema>;
export type PartnerException = z.infer<typeof partnerExceptionSchema>;

/** Champs de la fiche du lieu utilisés par le moteur (docs/22 § 17.H, H2). */
export const partnerHostingSchema = z.object({
  tiers: z.array(z.enum(VENUE_TIERS)).max(3).default([]),
  /** Formats et activités acceptés : identifiants des modèles (cafe, brunch, dejeuner, diner, padel…). */
  formats: z.array(z.string().trim().regex(/^[a-z0-9-]{2,40}$/)).max(30).default([]),
  unit: z.enum(VENUE_UNITS).default("table"),
  unitMin: z.coerce.number().int().min(1, "min1").max(50, "tooMany").default(4),
  unitMax: z.coerce.number().int().min(1, "min1").max(50, "tooMany").default(6),
  slots: z.array(partnerSlotSchema).max(40, "tooMany").default([]),
  exceptions: z.array(partnerExceptionSchema).max(60, "tooMany").default([]),
  cuisine: z.string().trim().max(60, "tooLong").default(""),
  cuisineAr: z.string().trim().max(60, "tooLong").default(""),
  cuisineEn: z.string().trim().max(60, "tooLong").default(""),
  avgBudget: z.coerce.number().int().min(0, "min0").max(10_000, "tooMany").default(0),
  level: z.enum(PARTNER_LEVELS).default("occasional"),
});
export type PartnerHosting = z.infer<typeof partnerHostingSchema>;

/** Fiche minimale d'un lieu vue par le moteur. */
export type HostPartner = Partial<PartnerHosting> & { id: string; name: string; status?: string; cityId?: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** Ressources (tables, terrains…) qu'un lieu propose pour un début donné : exception du jour, sinon créneau habituel. */
export function partnerUnitsAt(p: HostPartner, startAt: Date, timeZone = MOROCCO_TIMEZONE): number {
  const z = zonedParts(startAt, timeZone);
  const date = `${z.year}-${pad(z.month)}-${pad(z.day)}`;
  const time = `${pad(z.hour)}:${pad(z.minute)}`;
  const slot = (p.slots ?? []).find((s) => s.weekday === z.weekday && s.from <= time && time <= s.to);
  const exception = (p.exceptions ?? []).find((e) => e.date === date);
  if (exception) return exception.units;
  return slot?.units ?? 0;
}

/** Le lieu accepte-t-il cet événement (actif, même ville, format, gamme) ? */
export function partnerMatches(p: HostPartner, e: { templateId?: string | null; subcategoryId?: string | null; venueTier?: string | null; cityId?: string }): boolean {
  if (p.status && p.status !== "active") return false;
  if (e.cityId && p.cityId && p.cityId !== e.cityId) return false;
  const formats = p.formats ?? [];
  // Une édition Girls only (modèle « girls-only-diner ») va dans les mêmes lieux que son format (« diner »).
  const format = (e.templateId || e.subcategoryId || "").replace(/^girls-only-/, "");
  if (!format || !formats.includes(format)) return false;
  if (e.venueTier && !(p.tiers ?? []).includes(e.venueTier as never)) return false;
  return true;
}

/** Personnes qu'un lieu peut accueillir avec `units` ressources pour des tables de `tableMax` au plus. */
export const peopleFor = (p: HostPartner, units: number, tableMax: number) => units * Math.min(p.unitMax ?? tableMax, tableMax);

export type AllocationCandidate = { partnerId: string; name: string; units: number; regular: boolean; reliability: number; /** Lot C : part des inscrits déjà venus dans ce lieu (0 à 1). */ seen?: number };
export type AllocationLine = { partnerId: string; name: string; tables: number };
export type Allocation = { lines: AllocationLine[]; missing: number };

/**
 * Répartit `tables` tables entre les lieux disponibles, sans jamais dépasser ce que chacun a déclaré (décision 41) :
 * lieux réguliers et fiables d'abord, puis répartition équilibrée (une table à la fois au lieu le moins rempli en
 * proportion), pour ne pas tout mettre chez un seul lieu. `missing` : tables qu'aucun lieu ne peut accueillir.
 */
export function allocateTables(tables: number, candidates: AllocationCandidate[]): Allocation {
  const pool = candidates
    .filter((c) => c.units > 0)
    // Lot C : à fidélité égale, les lieux que les inscrits connaissent le moins passent devant (rotation des restaurants).
    .sort((a, b) => Number(b.regular) - Number(a.regular) || (a.seen ?? 0) - (b.seen ?? 0) || b.reliability - a.reliability || b.units - a.units || a.name.localeCompare(b.name));
  const used = new Map<string, number>();
  let left = tables;
  while (left > 0) {
    let best: AllocationCandidate | null = null;
    let bestRatio = Infinity;
    for (const c of pool) {
      const u = used.get(c.partnerId) ?? 0;
      if (u >= c.units) continue;
      const ratio = u / c.units;
      if (ratio < bestRatio - 1e-9) {
        best = c;
        bestRatio = ratio;
      }
    }
    if (!best) break;
    used.set(best.partnerId, (used.get(best.partnerId) ?? 0) + 1);
    left--;
  }
  const lines = pool.filter((c) => used.has(c.partnerId)).map((c) => ({ partnerId: c.partnerId, name: c.name, tables: used.get(c.partnerId)! }));
  return { lines, missing: left };
}

/** Fiabilité d'un lieu (0 à 1) d'après son historique : demandes acceptées / demandes reçues ; 0,5 sans historique. */
export function reliabilityOf(stats: { requests?: number; accepted?: number } | null | undefined): number {
  const n = Number(stats?.requests ?? 0);
  return n > 0 ? Math.min(1, Number(stats?.accepted ?? 0) / n) : 0.5;
}

/* ——— Demandes aux lieux (décision 45) ——— */

export const VENUE_REQUEST_STATUSES = ["sent", "confirmed", "refused", "expired", "cancelled"] as const;
export type VenueRequestStatus = (typeof VENUE_REQUEST_STATUSES)[number];
/** Une demande qui occupe encore la capacité du lieu. */
export const ACTIVE_REQUEST_STATUSES: readonly VenueRequestStatus[] = ["sent", "confirmed"];

/** Délais de réponse des lieux (Paramètres) : relance après 1 h, autre lieu proposé après 2 h. */
export const allocationSettingsSchema = z.object({
  remindAfterMinutes: z.coerce.number().int().min(10, "min10").max(24 * 60, "tooMany").default(60),
  expireAfterMinutes: z.coerce.number().int().min(20, "min20").max(48 * 60, "tooMany").default(120),
}).refine((v) => v.remindAfterMinutes < v.expireAfterMinutes, { path: ["expireAfterMinutes"], message: "order" });
export type AllocationSettings = z.infer<typeof allocationSettingsSchema>;
export const DEFAULT_ALLOCATION_SETTINGS: AllocationSettings = { remindAfterMinutes: 60, expireAfterMinutes: 120 };
export function allocationSettingsOf(raw: unknown): AllocationSettings {
  const v = allocationSettingsSchema.safeParse(raw ?? {});
  return v.success ? v.data : DEFAULT_ALLOCATION_SETTINGS;
}

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
/** Réponse du lieu depuis le lien sécurisé (sans compte). */
export const partnerResponseSchema = z.object({ requestId: idSchema, token: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/), accept: z.boolean(), note: z.string().trim().max(300, "tooLong").default("") });
/** Action de l'équipe sur une demande : confirmé par téléphone, refusé, renvoyé, WhatsApp envoyé à la main. */
export const requestActionSchema = z.object({ requestId: idSchema, action: z.enum(["confirm_phone", "refuse", "resend", "whatsapp_sent", "recap_sent"]), note: z.string().trim().max(300, "tooLong").default("") });

/* ——— WhatsApp (décision 44) ——— */

/** Numéro au format international sans « + » (06 12 34 56 78 → 212612345678), ou null. */
export function waNumber(phone: string | null | undefined): string | null {
  let d = String(phone ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^0[5-7]\d{8}$/.test(d)) d = `212${d.slice(1)}`;
  return /^\d{8,15}$/.test(d) ? d : null;
}

/** Lien qui ouvre WhatsApp Web avec le numéro et le message déjà remplis (l'admin n'a plus qu'à envoyer). */
export function whatsappWebUrl(phone: string | null | undefined, text: string): string | null {
  const n = waNumber(phone);
  return n ? `https://web.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text)}` : null;
}
/** Même chose depuis un téléphone. */
export function whatsappMobileUrl(phone: string | null | undefined, text: string): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/* ——— Messages prédéfinis aux lieux (français ; mêmes textes pour l'e-mail, WhatsApp et le lien manuel) ——— */

export type VenueRequestInfo = { venue: string; title: string; when: string; format: string; tier?: string | null; tables: number; people: number; unit: VenueUnit; reference: string; link: string };

const UNIT_WORDS: Record<VenueUnit, [string, string]> = { table: ["table", "tables"], court: ["terrain", "terrains"], session: ["session", "sessions"], spot: ["place", "places"] };
export const unitWord = (u: VenueUnit, n: number) => UNIT_WORDS[u][n > 1 ? 1 : 0];

export function venueRequestText(o: VenueRequestInfo): string {
  return [
    `Bonjour ${o.venue}, c'est Wenzy.`,
    `Demande de réservation : ${o.when}, ${o.tables} ${unitWord(o.unit, o.tables)} pour environ ${o.people} personne${o.people > 1 ? "s" : ""} (${o.format}${o.tier ? ` ${o.tier}` : ""}).`,
    "Les réservations ferment ce soir à 20h30 : nous vous envoyons alors le nombre final, puis le récapitulatif (prénoms, allergies) le jour même. Chacun règle sa consommation sur place.",
    `Pouvez-vous confirmer ? Accepter ou refuser : ${o.link}`,
    `Référence ${o.reference}.`,
  ].join("\n");
}

/** Nombre final, envoyé à la fermeture des réservations (veille 20h30) si la demande a changé. 0 = table libérée. */
export function venueFinalText(o: VenueRequestInfo & { before: { tables: number; people: number } }): string {
  if (o.tables === 0) {
    return [`Bonjour ${o.venue}, c'est Wenzy.`, `Pour ${o.when}, nous n'aurons finalement pas besoin de ${o.before.tables > 1 ? "ces" : "cette"} ${unitWord(o.unit, o.before.tables)} : vous pouvez ${o.before.tables > 1 ? "les" : "la"} libérer. Merci et à bientôt.`, `Référence ${o.reference}.`].join("\n");
  }
  return [
    `Bonjour ${o.venue}, c'est Wenzy.`,
    `Nombre final pour ${o.when} : ${o.tables} ${unitWord(o.unit, o.tables)}, ${o.people} personne${o.people > 1 ? "s" : ""} (au lieu de ${o.before.tables} ${unitWord(o.unit, o.before.tables)}, ${o.before.people} personne${o.before.people > 1 ? "s" : ""}).`,
    `Le récapitulatif (prénoms, allergies) suit. Détail : ${o.link}`,
    `Référence ${o.reference}.`,
  ].join("\n");
}

export function venueReminderText(o: VenueRequestInfo): string {
  return [`Bonjour ${o.venue}, petit rappel de Wenzy.`, `Notre demande pour ${o.when} (${o.tables} ${unitWord(o.unit, o.tables)}, ${o.people} personne${o.people > 1 ? "s" : ""}) attend votre réponse : ${o.link}`, `Référence ${o.reference}.`].join("\n");
}

export type VenueRecapInfo = { venue: string; when: string; title: string; tables: { label: string; names: string[] }[]; people: number; notes: string[]; unit: VenueUnit; link: string };

export function venueRecapText(o: VenueRecapInfo & { update?: boolean }): string {
  return [
    `Bonjour ${o.venue}, ${o.update ? "mise à jour du" : "voici le"} récapitulatif Wenzy pour ${o.when} : ${o.tables.length} ${unitWord(o.unit, o.tables.length)}, ${o.people} personne${o.people > 1 ? "s" : ""}.`,
    ...o.tables.map((t) => `${t.label} : ${t.names.join(", ")}`),
    o.notes.length ? `Régimes et allergies : ${o.notes.join(" ; ")}.` : "Aucun régime ni allergie signalé.",
    `Détail : ${o.link}`,
  ].join("\n");
}
