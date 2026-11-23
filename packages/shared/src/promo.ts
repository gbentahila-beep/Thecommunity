import { z } from "zod";
import { SPOKEN_LANGUAGES } from "./profile";

/**
 * Codes promo et frais de service (5f), préférences de réservation (5g).
 * Montants en centimes. Le serveur fait foi : l'interface n'affiche que ce qu'il calcule.
 */

export const promoCodeSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9-]{3,20}$/, "promoFormat"));

export type PromoRule = { type: "percent" | "fixed"; value: number };

/** Remise d'un code sur un montant : pourcentage arrondi au dirham, ou montant fixe ; jamais plus que le montant. */
export function promoDiscount(p: PromoRule, amount: number): number {
  if (amount <= 0) return 0;
  const raw = p.type === "percent" ? Math.round((amount * p.value) / 100 / 100) * 100 : p.value;
  return Math.max(0, Math.min(amount, raw));
}

export type PromoState = {
  isActive: boolean;
  validFrom?: Date | null;
  validTo: Date;
  maxRedemptions: number;
  redemptionsCount: number;
  firstBookingOnly: boolean;
};
export type PromoRefusal = "promo_unknown" | "promo_inactive" | "promo_not_started" | "promo_expired" | "promo_exhausted" | "promo_already_used" | "promo_first_booking_only";

/** Le code est-il utilisable par cette personne maintenant ? (null = oui) */
export function promoRefusal(
  p: PromoState | null | undefined,
  o: { now: Date; alreadyUsedByUser: boolean; hasPastBooking: boolean },
): PromoRefusal | null {
  if (!p) return "promo_unknown";
  if (!p.isActive) return "promo_inactive";
  if (p.validFrom && o.now.getTime() < p.validFrom.getTime()) return "promo_not_started";
  if (o.now.getTime() > p.validTo.getTime()) return "promo_expired";
  if (p.redemptionsCount >= p.maxRedemptions) return "promo_exhausted";
  if (o.alreadyUsedByUser) return "promo_already_used";
  if (p.firstBookingOnly && o.hasPastBooking) return "promo_first_booking_only";
  return null;
}

/** Back-office : création / modification d'un code (valeur en % ou en dirhams). */
export const promoInputSchema = z
  .object({
    code: promoCodeSchema,
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().positive("min1"),
    validFrom: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "date"),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required"),
    maxRedemptions: z.coerce.number().int().min(1, "min1").max(100000, "tooMany"),
    firstBookingOnly: z.boolean(),
    isActive: z.boolean(),
    description: z.string().trim().max(200, "tooLong"),
  })
  .refine((v) => v.type !== "percent" || (v.value >= 1 && v.value <= 100), { path: ["value"], message: "percent" })
  .refine((v) => !v.validFrom || v.validFrom <= v.validTo, { path: ["validTo"], message: "dateOrder" });
export type PromoInput = z.infer<typeof promoInputSchema>;

/** Frais de service (Paramètres) : aucun, montant fixe par place, ou pourcentage du montant après remises. */
export type ServiceFee = { mode: "none" | "per_seat" | "percent"; amount: number; percent: number };
export const NO_SERVICE_FEE: ServiceFee = { mode: "none", amount: 0, percent: 0 };

export function serviceFeeAmount(f: ServiceFee, net: number, seats: number): number {
  if (f.mode === "per_seat") return Math.max(0, Math.round(f.amount)) * seats;
  if (f.mode === "percent") return Math.round((net * f.percent) / 100 / 100) * 100;
  return 0;
}

/** Lit un réglage enregistré (anciens documents : `serviceFee: 0`). */
export function readServiceFee(v: unknown): ServiceFee {
  const o = (v ?? {}) as Partial<ServiceFee>;
  if (o.mode === "per_seat" && typeof o.amount === "number" && o.amount > 0) return { mode: "per_seat", amount: o.amount, percent: 0 };
  if (o.mode === "percent" && typeof o.percent === "number" && o.percent > 0) return { mode: "percent", amount: 0, percent: o.percent };
  return NO_SERVICE_FEE;
}

export const serviceFeeInputSchema = z
  .object({ mode: z.enum(["none", "per_seat", "percent"]), amountDh: z.coerce.number().min(0).max(1000), percent: z.coerce.number().min(0).max(30) })
  .refine((v) => v.mode !== "per_seat" || v.amountDh > 0, { path: ["amountDh"], message: "required" })
  .refine((v) => v.mode !== "percent" || v.percent > 0, { path: ["percent"], message: "required" });

// ---------- 5g : préférences pour l'accueil ----------

export const DIETS = ["none", "vegetarian", "vegan", "pescatarian", "gluten_free", "lactose_free", "other"] as const;
export type Diet = (typeof DIETS)[number];

/**
 * Régime, allergies et langue(s) de table. Les allergies sont une donnée de santé :
 * leur transmission au lieu demande un accord explicite (consent).
 */
export const bookingPreferencesSchema = z
  .object({
    diet: z.enum(DIETS),
    allergies: z.string().trim().max(200, "tooLong"),
    languages: z.array(z.enum(SPOKEN_LANGUAGES)).max(5),
    consent: z.boolean(),
  })
  .refine((v) => (v.diet === "none" && !v.allergies) || v.consent, { path: ["consent"], message: "consent" });
export type BookingPreferences = z.infer<typeof bookingPreferencesSchema>;

/** A-t-on quelque chose à transmettre au lieu ? */
export const hasDietInfo = (p: BookingPreferences | undefined | null) => Boolean(p && (p.diet !== "none" || p.allergies));
