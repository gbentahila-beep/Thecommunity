import type { BookingMode, CategoryKey, Interest, SocialGoal } from "./types";

export const CATEGORY_KEYS: readonly CategoryKey[] = ["eat", "move", "play", "create", "discover"];

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
