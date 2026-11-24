import type { ExtraI18n } from "./extra-i18n";
import { z } from "zod";
import { parseCoords } from "./experience-input";
/**
 * Lieu secret (docs/22, lot 0) : tant que le lieu n'est pas révélé, rien ne doit permettre de le deviner —
 * ni son nom, ni son adresse, ni ses coordonnées, ni le quartier, ni le nom du partenaire (souvent le restaurant).
 * Ces informations sont rangées dans `experiences/{id}/private/venue` (lisible par l'équipe seulement) et
 * retirées du document public. Le lieu est communiqué à chaque participant sur sa réservation, à la révélation.
 */

/** Le lieu secret et son adresse sont révélés ce nombre d'heures avant le début (docs/22). */
export const VENUE_REVEAL_HOURS = 5;

type VenueLike = { venue?: { revealPolicy?: string | null } | null };

/** Le lieu reste-t-il secret jusqu'à la révélation ? */
export const isSecretVenue = (e: VenueLike | null | undefined): boolean => e?.venue?.revealPolicy === "on_group_reveal";

/** Lieu réel d'une expérience à lieu secret (document privé). */
export type PrivateVenue = {
  name: string;
  address: string;
  geo: { lat: number; lng: number } | null;
  district: string;
  partnerName: string;
  /** Cuisine du restaurant, révélée avec le lieu (docs/22, décision 14). */
  cuisine?: string;
  cuisineI18n?: { ar?: string; en?: string } | null;
};

type PublicFields = {
  district: string;
  venue: { name: string; address: string; revealPolicy: "immediate" | "on_group_reveal"; geo?: { lat: number; lng: number } | null };
  partnerSnapshot?: { name: string } | null;
  pricing?: { partner?: { name: string } | null } | null;
  cuisine?: string | null;
  textI18n?: ExtraI18n | null;
};

const stripCuisine = (t: ExtraI18n): ExtraI18n => Object.fromEntries(Object.entries(t).map(([l, m]) => [l, { ...m, cuisine: undefined }]));

/**
 * Version publique d'une expérience : quand le lieu est secret, nom, adresse, coordonnées, quartier et nom du
 * partenaire sont vidés. Ne change rien quand le lieu est visible dès la réservation.
 * Sert de filet de sécurité côté site (anciens documents, démonstration) ; le serveur ne les écrit plus.
 */
export function publicExperience<T extends PublicFields>(e: T): T {
  if (!isSecretVenue(e)) return e;
  return {
    ...e,
    district: "",
    venue: { ...e.venue, name: "", address: "", geo: null },
    ...(e.cuisine ? { cuisine: null } : {}),
    ...(e.textI18n ? { textI18n: stripCuisine(e.textI18n) } : {}),
    ...(e.partnerSnapshot ? { partnerSnapshot: null } : {}),
    ...(e.pricing?.partner ? { pricing: { ...e.pricing, partner: { ...e.pricing.partner, name: "" } } } : {}),
  };
}

/** « Quartier, Ville » sans le quartier quand il est vide (lieu secret). */
export function placeLabel(district: string | null | undefined, city: string): string {
  return [district?.trim(), city].filter(Boolean).join(", ");
}

/* ——— Lieu par date (docs/22, décision 15) ——— */

/** Un lieu d'une date : partenaire enregistré ou saisie libre ; `tables` = tables disponibles (répartition). */
export type SessionVenue = {
  partnerId?: string | null;
  name: string;
  address: string;
  geo?: { lat: number; lng: number } | null;
  tables?: number | null;
  /** Cuisine du restaurant (fiche du lieu, docs/22 décision 41), révélée avec le lieu. */
  cuisine?: string | null;
  cuisineI18n?: { ar?: string; en?: string } | null;
  /** Après la date : l'équipe note le lieu (« bien » ou « à revoir »). */
  rating?: "good" | "bad" | null;
};

export const sessionVenueInputSchema = z.object({
  partnerId: z.string().trim().max(80).optional().or(z.literal("")),
  name: z.string().trim().min(2, "required").max(100, "tooLong"),
  address: z.string().trim().min(5, "required").max(200, "tooLong"),
  coords: z.string().trim().max(40, "tooLong").refine((s) => !s || parseCoords(s) !== null, "invalidCoords").optional().or(z.literal("")),
  tables: z.coerce.number().int().min(0, "min0").max(100, "tooMany").optional(),
});

export const sessionVenuesInputSchema = z.object({
  sessionId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/),
  venues: z.array(sessionVenueInputSchema).max(5, "tooMany"),
  /** Appliquer ces lieux aux prochaines dates du rendez-vous qui n'en ont pas encore. */
  applyToFuture: z.boolean().default(false),
  /** En faire le lieu habituel du rendez-vous (pré-rempli sur les nouvelles dates). */
  makeDefault: z.boolean().default(false),
});

export const sessionVenueActionSchema = z.object({
  sessionId: sessionVenuesInputSchema.shape.sessionId,
  index: z.number().int().min(0).max(4),
  action: z.enum(["rate", "default"]),
  rating: z.enum(["good", "bad"]).optional(),
});

/**
 * Plusieurs lieux pour une date : chaque table (groupe, dans l'ordre Table 1, Table 2…) reçoit un lieu. Les lieux se
 * remplissent dans l'ordre selon leurs tables disponibles ; sans capacité indiquée, les tables sont réparties à parts
 * égales. Renvoie l'indice du lieu de chaque table.
 */
export function assignGroupsToVenues(groupCount: number, venues: { tables?: number | null }[]): number[] {
  if (venues.length <= 1) return Array.from({ length: groupCount }, () => 0);
  const caps = venues.map((v) => (v.tables && v.tables > 0 ? v.tables : 0));
  if (caps.every((c) => c === 0)) {
    const per = Math.ceil(groupCount / venues.length);
    return Array.from({ length: groupCount }, (_, i) => Math.min(venues.length - 1, Math.floor(i / per)));
  }
  const out: number[] = [];
  const used = caps.map(() => 0);
  for (let g = 0; g < groupCount; g++) {
    let i = caps.findIndex((c, k) => c > 0 && used[k]! < c);
    // Plus de place annoncée : lieux sans capacité indiquée d'abord, sinon le dernier lieu.
    if (i === -1) i = caps.findIndex((c) => c === 0);
    if (i === -1) i = venues.length - 1;
    used[i]!++;
    out.push(i);
  }
  return out;
}

/**
 * Lot C (docs/25) : mémoire des restaurants. `slots[k]` = lieu de la place k (assignGroupsToVenues) ; `seen[g][v]` =
 * nombre de membres de la table g déjà venus au lieu v. Renvoie, pour chaque table g, sa place k, en limitant le
 * nombre de personnes renvoyées dans un restaurant qu'elles connaissent (échanges deux à deux jusqu'à stabilité).
 */
export function assignTablesAvoidingRepeats(slots: number[], seen: number[][]): number[] {
  const n = slots.length;
  const place = Array.from({ length: n }, (_, g) => g);
  const cost = (g: number, k: number) => seen[g]?.[slots[k]!] ?? 0;
  for (let round = 0; round < 50; round++) {
    let improved = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const now = cost(a, place[a]!) + cost(b, place[b]!);
        const swapped = cost(a, place[b]!) + cost(b, place[a]!);
        if (swapped < now) {
          [place[a], place[b]] = [place[b]!, place[a]!];
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return place;
}

/** Clé d'un lieu pour la mémoire des restaurants : le partenaire s'il est connu, sinon le nom. */
export const venueKey = (v: { partnerId?: string | null; name?: string | null }): string[] =>
  [v.partnerId ? `p:${v.partnerId}` : "", v.name ? `n:${v.name.trim().toLowerCase()}` : ""].filter(Boolean);

/** « Table 2 » avant « Table 10 ». */
export const byTableLabel = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });
