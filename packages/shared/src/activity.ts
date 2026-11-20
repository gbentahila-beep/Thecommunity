import { z } from "zod";
import { CATEGORY_ID_PATTERN } from "./constants";
import { ageOn } from "./profile";

/**
 * Étape 18 — tout ce qui sert aux activités autres que le dîner : niveau attendu, matériel, tenue,
 * âge minimum, plein air (18b) ; conditions de participation aux activités physiques et assurance des
 * lieux partenaires (18c) ; propositions de sorties par les membres de confiance (18d).
 */

/** Niveau attendu, affiché sur la fiche (la composition par niveau passe par le questionnaire). */
export const ACTIVITY_LEVELS = ["all", "beginner", "intermediate", "advanced"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/** L'âge minimum ne descend jamais sous 18 ans (règle du site). */
export const MIN_AGE_FLOOR = 18;
export const MIN_AGE_MAX = 99;

/**
 * Conditions de participation aux activités physiques (page /conditions-activites-physiques).
 * La version acceptée est enregistrée avec la réservation ; changer le texte = changer la version.
 * Projet rédigé par nous, à faire relire par un avocat (voir docs/16).
 */
export const PHYSICAL_TERMS_VERSION = "2026-11-19";

/** Trop jeune pour cette expérience ? (âge inconnu : pas de blocage ici, le profil impose la date de naissance.) */
export function tooYoung(minAge: number | null | undefined, birthDate: string | undefined | null, on: Date): boolean {
  if (!minAge || minAge <= MIN_AGE_FLOOR) return false;
  if (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  return ageOn(birthDate, on) < minAge;
}

/* ——— 18c : assurance des lieux partenaires ——— */

export const partnerInsuranceSchema = z.object({
  /** L'équipe a vu l'attestation d'assurance responsabilité civile du lieu. */
  verified: z.boolean().default(false),
  insurer: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  policyNumber: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
  /** Date de fin de validité (AAAA-MM-JJ). */
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate").optional().or(z.literal("")),
});
export type PartnerInsurance = z.infer<typeof partnerInsuranceSchema>;

export type InsuranceState = "valid" | "expiring" | "expired" | "missing";
/** État de l'assurance d'un lieu : « expiring » = fin dans moins de 30 jours. */
export function insuranceState(ins: Partial<PartnerInsurance> | null | undefined, now: Date): InsuranceState {
  if (!ins?.verified) return "missing";
  if (!ins.expiresOn) return "valid";
  const end = new Date(`${ins.expiresOn}T23:59:59Z`).getTime();
  if (end < now.getTime()) return "expired";
  return end - now.getTime() < 30 * 86_400_000 ? "expiring" : "valid";
}

/* ——— 18d : propositions de sorties par les membres de confiance ——— */

export const PROPOSAL_STATUSES = ["pending", "accepted", "declined"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
/** Propositions par membre et par jour (anti-abus). */
export const PROPOSALS_PER_DAY = 3;

export const outingProposalSchema = z.object({
  title: z.string().trim().min(3, "tooShort").max(80, "tooLong"),
  categoryId: z.string().regex(CATEGORY_ID_PATTERN, "required"),
  description: z.string().trim().min(30, "tooShort").max(1500, "tooLong"),
  district: z.string().trim().min(2, "required").max(60, "tooLong"),
  /** Lieu envisagé (nom ou idée) : l'équipe vérifie et contacte le lieu. */
  venueIdea: z.string().trim().max(150, "tooLong").optional().or(z.literal("")),
  /** Dates envisagées, en texte libre (« samedis matin de décembre »). */
  datesIdea: z.string().trim().min(3, "required").max(200, "tooLong"),
  capacity: z.coerce.number().int().min(2, "min2").max(50, "tooMany"),
  /** Prix par personne envisagé (DH), facultatif. */
  priceIdeaDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany").optional(),
  level: z.enum(ACTIVITY_LEVELS).optional(),
  /** Le membre sera présent et accueillera le groupe. */
  willHost: z.boolean().default(true),
  notes: z.string().trim().max(500, "tooLong").optional().or(z.literal("")),
});
export type OutingProposalInput = z.input<typeof outingProposalSchema>;

export const proposalDecisionSchema = z.object({
  proposalId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  decision: z.enum(["declined"]),
  message: z.string().trim().min(5, "tooShort").max(500, "tooLong"),
});
