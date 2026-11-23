export const PARTNER_TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant ou café",
  studio: "Studio sport / bien-être",
  workshop: "Atelier créatif",
  venue: "Lieu",
  organizer: "Organisateur indépendant",
  other: "Autre",
};
export const PARTNER_STATUS_LABELS = { prospect: "Prospect", active: "Actif", archived: "Archivé" } as const;
export const PARTNER_STATUS_TONES = { prospect: "amber", active: "green", archived: "gray" } as const;
