import { z } from "zod";
import { BOOKING_MODES } from "./constants";

/**
 * Back-office (5d, 5e) : partenaires, villes et univers. Mêmes schémas dans le navigateur (messages d'erreur)
 * et dans les Cloud Functions (qui font foi).
 */

export const PARTNER_TYPES = ["restaurant", "studio", "venue", "workshop", "organizer", "other"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];
export const PARTNER_STATUSES = ["prospect", "active", "archived"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];
/** Achat de prestation (prix fixe par participant) ou commission sur chaque place vendue. */
export const PARTNER_MODELS = ["purchase", "commission"] as const;

const optionalEmail = z.string().trim().max(120).regex(/^([^@\s]+@[^@\s]+\.[^@\s]+)?$/, "email");
const slug = z.string().trim().min(2, "required").max(40, "tooLong").regex(/^[a-z0-9-]+$/, "slug");

export const partnerInputSchema = z
  .object({
    name: z.string().trim().min(2, "required").max(120, "tooLong"),
    type: z.enum(PARTNER_TYPES, { message: "required" }),
    status: z.enum(PARTNER_STATUSES),
    cityId: slug,
    district: z.string().trim().max(60, "tooLong"),
    address: z.string().trim().max(200, "tooLong"),
    contactName: z.string().trim().max(80, "tooLong"),
    contactEmail: optionalEmail,
    contactPhone: z.string().trim().max(30, "tooLong").regex(/^[0-9 +().-]*$/, "phone"),
    link: z.string().trim().max(200, "tooLong"),
    model: z.enum(PARTNER_MODELS),
    defaultCommissionPercent: z.coerce.number().min(0, "min0").max(80, "tooMany"),
    notes: z.string().trim().max(2000, "tooLong"),
  })
  .refine((v) => v.model !== "commission" || v.defaultCommissionPercent > 0, { path: ["defaultCommissionPercent"], message: "required" });
export type PartnerInput = z.infer<typeof partnerInputSchema>;

export const cityInputSchema = z.object({
  id: slug,
  nameFr: z.string().trim().min(2, "required").max(60, "tooLong"),
  nameAr: z.string().trim().max(60, "tooLong"),
  nameEn: z.string().trim().max(60, "tooLong"),
  isActive: z.boolean(),
  isComingSoon: z.boolean(),
  order: z.coerce.number().int().min(0).max(999),
  /** Quartiers, un par ligne ou séparés par des virgules. */
  districts: z.array(z.string().trim().min(1).max(60)).max(80),
});
export type CityInput = z.infer<typeof cityInputSchema>;

const localized = (max: number) => ({
  fr: z.string().trim().min(2, "required").max(max, "tooLong"),
  ar: z.string().trim().max(max, "tooLong"),
  en: z.string().trim().max(max, "tooLong"),
});
export const categoryInputSchema = z.object({
  id: z.string().trim().min(1).max(20),
  name: z.object(localized(60)),
  shortName: z.object(localized(30)),
  description: z.object(localized(240)),
  order: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
  defaultBookingMode: z.enum(BOOKING_MODES as unknown as [string, ...string[]]),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

/** « Anfa, Maarif\nGauthier » → ["Anfa", "Maarif", "Gauthier"] (sans doublons ni vides). */
export function parseDistricts(text: string): string[] {
  return [...new Set(text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
}
