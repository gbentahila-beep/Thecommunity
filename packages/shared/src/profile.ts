import { z } from "zod";
import { INTERESTS, SOCIAL_GOALS } from "./constants";
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
  gender: z.enum(["female", "male", "undisclosed"]).optional(),
});

export const profileInterestsSchema = z.object({
  languages: z.array(z.enum(SPOKEN_LANGUAGES as [SpokenLanguage, ...SpokenLanguage[]])).min(1, "pickOne"),
  interests: z.array(z.enum(INTERESTS as [Interest, ...Interest[]])).min(3, "pickThree"),
});

export const profileGoalsSchema = z.object({
  socialGoals: z.array(z.enum(SOCIAL_GOALS as [SocialGoal, ...SocialGoal[]])).min(1, "pickOne"),
});

export const profileAboutSchema = z.object({
  profession: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  bio: z.string().trim().max(BIO_MAX, "tooLong").optional().or(z.literal("")),
});

export const profileSchema = profileIdentitySchema
  .merge(profileInterestsSchema)
  .merge(profileGoalsSchema)
  .merge(profileAboutSchema);

export type ProfileInput = z.infer<typeof profileSchema>;
