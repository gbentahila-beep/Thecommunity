import type { BookingMode, CategoryKey, Interest, SocialGoal } from "./types";

/** Les cinq univers historiques (adresses conservées). Étape 19 : d'autres catégories peuvent être créées par le super-admin. */
export const CATEGORY_KEYS: readonly CategoryKey[] = ["eat", "move", "play", "create", "discover"];
/** Identifiant d'une catégorie (adresse du site) : minuscules, chiffres, tirets. */
export const CATEGORY_ID_PATTERN = /^[a-z][a-z0-9-]{1,23}$/;
/** Pictogrammes proposés pour les catégories (liste fermée, dessinés par le site). */
export const CATEGORY_ICONS = ["utensils", "flower", "gamepad", "palette", "sparkles", "users", "book", "mountain", "music", "dumbbell", "coffee", "map", "ticket", "camera"] as const;

export const INTERESTS: readonly Interest[] = [
  "gastronomy",
  "sport",
  "travel",
  "culture",
  "art",
  "music",
  "wellness",
  "games",
  "nightlife",
  "discovery",
];

/** Centres d'intérêt détaillés, par thème (« Voir plus » dans l'inscription). */
export const INTEREST_GROUPS: readonly { key: string; items: readonly Interest[] }[] = [
  { key: "eat", items: ["cooking", "coffee", "restaurants", "pastry"] },
  { key: "city", items: ["live_music", "festivals", "museums", "theatre", "comedy", "dancing", "cinema"] },
  { key: "making", items: ["photography", "design", "writing", "fashion", "architecture", "crafts"] },
  { key: "moving", items: ["running", "cycling", "football", "hiking", "yoga", "padel", "swimming"] },
  { key: "mind", items: ["books", "languages", "tech", "history", "business", "science", "volunteering"] },
];
export const ALL_INTERESTS: readonly Interest[] = [...INTERESTS, ...INTEREST_GROUPS.flatMap((g) => g.items)];
export const INTERESTS_MAX = 15;

export const SOCIAL_GOALS: readonly SocialGoal[] = [
  "meet_new_people",
  "expand_circle",
  "discover_activities",
  "go_out_more",
  "share_passions",
];

export const BOOKING_MODES: readonly BookingMode[] = [
  "individual",
  "group",
  "social_dinner",
  "open",
  "private",
];

/** Fuseau par défaut des villes marocaines (UTC+1, UTC+0 pendant le Ramadan). */
export const MOROCCO_TIMEZONE = "Africa/Casablanca";
