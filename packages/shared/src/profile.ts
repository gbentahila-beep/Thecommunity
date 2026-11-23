import { z } from "zod";
import { ALL_INTERESTS, CATEGORY_ID_PATTERN, INTERESTS_MAX, SOCIAL_GOALS } from "./constants";
import type { Interest, SocialGoal, SpokenLanguage } from "./types";

export const SPOKEN_LANGUAGES: readonly SpokenLanguage[] = ["fr", "ar", "darija", "en", "es"];
export const MIN_AGE = 18;
export const BIO_MAX = 280;

/** Âge révolu à une date donnée, à partir d'une date de naissance AAAA-MM-JJ. */
export function ageOn(birthDate: string, today: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number) as [number, number, number];
  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Tranche d'âge utilisée par le matching (jamais l'âge exact). */
export function ageBand(age: number): string {
  if (age < 25) return "18-24";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  if (age < 50) return "40-49";
  return "50+";
}

const name = z.string().trim().min(1, "required").max(50, "tooLong");

/**
 * Schémas du questionnaire, écran par écran. Les messages d'erreur sont des clés
 * traduites par l'interface. Ces schémas seront réutilisés tels quels par les
 * Cloud Functions (phase 3) pour revalider côté serveur.
 */
export const profileIdentitySchema = z.object({
  firstName: name,
  lastName: name,
  phone: z
    .string()
    .trim()
    .refine((v) => /^\+?\d{9,15}$/.test(v.replace(/[\s.-]/g, "")), "invalidPhone")
    .optional()
    .or(z.literal("")),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "required")
    .refine((v) => ageOn(v) >= MIN_AGE, "tooYoung")
    .refine((v) => ageOn(v) <= 100, "invalidDate"),
  cityId: z.string().min(1, "required"),
  // Facultatif (décision D5). « null » accepté : les appels Firebase transforment undefined en null.
  gender: z.enum(["female", "male", "undisclosed"]).nullish(),
});

export const profileInterestsSchema = z.object({
  languages: z.array(z.enum(SPOKEN_LANGUAGES as [SpokenLanguage, ...SpokenLanguage[]])).min(1, "pickOne"),
  interests: z.array(z.enum(ALL_INTERESTS as [Interest, ...Interest[]])).min(3, "pickThree").max(INTERESTS_MAX, "tooMany"),
});

export const profileGoalsSchema = z.object({
  socialGoals: z.array(z.enum(SOCIAL_GOALS as [SocialGoal, ...SocialGoal[]])).min(1, "pickOne"),
});

export const SPORT_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SportLevel = (typeof SPORT_LEVELS)[number];
export const AGE_PREFERENCES = ["any", "similar"] as const;
export type AgePreference = (typeof AGE_PREFERENCES)[number];

export const profileAboutSchema = z.object({
  profession: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  bio: z.string().trim().max(BIO_MAX, "tooLong").optional().or(z.literal("")),
  /** Étape 30 (facultatif) : quartier, univers préférés, niveau sportif, préférence d'âge pour son groupe (souple). */
  district: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
  favoriteCategories: z.array(z.string().regex(CATEGORY_ID_PATTERN)).max(5, "tooMany").default([]),
  sportLevel: z.enum(SPORT_LEVELS).nullish(),
  agePreference: z.enum(AGE_PREFERENCES).default("any"),
});

/**
 * Inscription en questions (docs/16, phase 6) : réponses facultatives qui aident à composer les groupes.
 * Pas de question sur la situation amoureuse, les enfants ou la religion (données sensibles, loi 09-08, inutiles
 * pour un bon groupe). Rien de tout cela n'est montré aux autres participants.
 */
export const GROUP_VIBES = ["calm", "curious", "playful", "any"] as const;
export const HUMOR_STYLES = ["dry", "playful", "offbeat", "everything"] as const;
export const LIFE_VALUES = ["family", "friends", "career", "health", "adventure", "learning", "creativity", "helping", "fun"] as const;
export const LIFE_VALUES_MAX = 3;
export const EXERCISE_FREQUENCIES = ["most_days", "weekly", "sometimes", "rarely"] as const;
export const VENUE_BUDGETS = ["cafe", "casual", "smart", "fine"] as const;
export const PROFILE_DIETS = ["vegetarian", "vegan", "pescatarian", "halal", "no_alcohol", "gluten_free", "lactose_free"] as const;
export const SECTORS = ["tech", "health", "finance_law", "creative_media", "education", "trades", "hospitality_retail", "public", "student", "not_working", "other"] as const;
export const REFERRAL_SOURCES = ["friend", "instagram", "tiktok", "facebook", "whatsapp", "google", "ai_assistant", "linkedin", "youtube", "event", "poster", "press", "other"] as const;
/** De « J'écoute surtout » (1) à « Je lance la conversation » (5). */
export const CONVERSATION_STYLES = [1, 2, 3, 4, 5] as const;

export const profileMoreSchema = z.object({
  groupVibe: z.enum(GROUP_VIBES).nullish(),
  conversationStyle: z.number().int().min(1).max(5).nullish(),
  humor: z.enum(HUMOR_STYLES).nullish(),
  lifeValues: z.array(z.enum(LIFE_VALUES)).max(LIFE_VALUES_MAX, "tooMany").default([]),
  exerciseFrequency: z.enum(EXERCISE_FREQUENCIES).nullish(),
  venueBudget: z.enum(VENUE_BUDGETS).nullish(),
  diets: z.array(z.enum(PROFILE_DIETS)).max(PROFILE_DIETS.length).default([]),
  sector: z.enum(SECTORS).nullish(),
  referral: z.enum(REFERRAL_SOURCES).nullish(),
  whatsapp: z.boolean().default(false),
  instagram: z
    .string()
    .trim()
    .regex(/^@?[A-Za-z0-9._]{1,30}$/, "invalidInstagram")
    .optional()
    .or(z.literal("")),
});

export const profileSchema = profileIdentitySchema
  .merge(profileInterestsSchema)
  .merge(profileGoalsSchema)
  .merge(profileAboutSchema)
  .merge(profileMoreSchema);

export type ProfileInput = z.infer<typeof profileSchema>;
