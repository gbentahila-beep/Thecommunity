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
};

type PublicFields = {
  district: string;
  venue: { name: string; address: string; revealPolicy: "immediate" | "on_group_reveal"; geo?: { lat: number; lng: number } | null };
  partnerSnapshot?: { name: string } | null;
  pricing?: { partner?: { name: string } | null } | null;
};

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
    ...(e.partnerSnapshot ? { partnerSnapshot: null } : {}),
    ...(e.pricing?.partner ? { pricing: { ...e.pricing, partner: { ...e.pricing.partner, name: "" } } } : {}),
  };
}

/** « Quartier, Ville » sans le quartier quand il est vide (lieu secret). */
export function placeLabel(district: string | null | undefined, city: string): string {
  return [district?.trim(), city].filter(Boolean).join(", ");
}
