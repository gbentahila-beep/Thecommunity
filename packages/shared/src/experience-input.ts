import { z } from "zod";
import { BOOKING_MODES, CATEGORY_KEYS } from "./constants";
import { SPOKEN_LANGUAGES } from "./profile";
import { zonedDateTimeToUtc } from "./time";
import type { BookingMode, CategoryKey, SpokenLanguage } from "./types";

/**
 * Formulaire admin « Créer une expérience ». Même schéma côté navigateur (phase 2)
 * et dans la Cloud Function admin-experiences-save (phase 3).
 * Les montants sont saisis en dirhams et convertis en centimes à l'enregistrement.
 */
export const RECURRENCE_MAX_WEEKS = 26;

export const sessionPlanSchema = z.object({
  firstDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "required"),
  weeks: z.coerce.number().int().min(1, "min1").max(RECURRENCE_MAX_WEEKS, "tooMany"),
  capacity: z.coerce.number().int().min(1, "min1").max(500, "tooMany"),
});

export const experienceInputSchema = z
  .object({
    titleFr: z.string().trim().min(3, "tooShort").max(80, "tooLong"),
    titleAr: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
    summaryFr: z.string().trim().min(10, "tooShort").max(160, "tooLong"),
    descriptionFr: z.string().trim().min(30, "tooShort").max(3000, "tooLong"),
    categoryId: z.enum(CATEGORY_KEYS as [CategoryKey, ...CategoryKey[]], { message: "required" }),
    cityId: z.string().min(1, "required"),
    district: z.string().trim().min(2, "required").max(60, "tooLong"),
    venueName: z.string().trim().min(2, "required").max(100, "tooLong"),
    address: z.string().trim().min(5, "required").max(200, "tooLong"),
    revealPolicy: z.enum(["immediate", "on_group_reveal"]),
    bookingMode: z.enum(BOOKING_MODES as [BookingMode, ...BookingMode[]]),
    groupMin: z.coerce.number().int().min(2, "min2").max(20, "tooMany").optional(),
    groupTarget: z.coerce.number().int().min(2, "min2").max(20, "tooMany").optional(),
    groupMax: z.coerce.number().int().min(2, "min2").max(20, "tooMany").optional(),
    maxSeatsPerBooking: z.coerce.number().int().min(1, "min1").max(50, "tooMany"),
    admission: z.enum(["direct", "on_request"]).default("direct"),
    /** Prix membre précis (DH) ; vide = réduction de la formule d'abonnement. */
    memberPriceDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany").optional(),
    membersOnly: z.boolean().default(false),
    requestMessageRequired: z.boolean().default(false),
    priceDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany"),
    durationMinutes: z.coerce.number().int().min(15, "min15").max(1440, "tooMany"),
    languages: z.array(z.enum(SPOKEN_LANGUAGES as [SpokenLanguage, ...SpokenLanguage[]])).min(1, "pickOne"),
    alcoholServed: z.boolean(),
    included: z.string().max(1000, "tooLong").optional().or(z.literal("")),
    practicalInfo: z.string().max(1000, "tooLong").optional().or(z.literal("")),
    cancellationPolicyId: z.string().min(1, "required"),
    partnerId: z.string().optional().or(z.literal("")),
    economicsModel: z.enum(["own", "commission"]),
    costPerSeatDh: z.coerce.number().min(0, "min0").optional(),
    commissionPercent: z.coerce.number().min(0, "min0").max(100, "max100").optional(),
    status: z.enum(["draft", "published"]),
    sessions: sessionPlanSchema,
  })
  .superRefine((v, ctx) => {
    const grouped = v.bookingMode === "group" || v.bookingMode === "social_dinner";
    if (grouped) {
      for (const key of ["groupMin", "groupTarget", "groupMax"] as const) {
        if (v[key] === undefined) ctx.addIssue({ code: "custom", path: [key], message: "required" });
      }
      if (v.groupMin !== undefined && v.groupTarget !== undefined && v.groupMax !== undefined) {
        if (!(v.groupMin <= v.groupTarget && v.groupTarget <= v.groupMax)) {
          ctx.addIssue({ code: "custom", path: ["groupTarget"], message: "groupOrder" });
        }
        if (v.sessions.capacity < v.groupMin) {
          ctx.addIssue({ code: "custom", path: ["sessions", "capacity"], message: "capacityBelowGroup" });
        }
      }
    }
    if (v.bookingMode !== "open" && v.bookingMode !== "private" && v.maxSeatsPerBooking > 2) {
      ctx.addIssue({ code: "custom", path: ["maxSeatsPerBooking"], message: "seatsPerBookingMode" });
    }
    if (v.memberPriceDh !== undefined && v.memberPriceDh > v.priceDh) {
      ctx.addIssue({ code: "custom", path: ["memberPriceDh"], message: "memberAbovePublic" });
    }
    if (v.economicsModel === "own" && v.costPerSeatDh === undefined) {
      ctx.addIssue({ code: "custom", path: ["costPerSeatDh"], message: "required" });
    }
    if (v.economicsModel === "commission" && v.commissionPercent === undefined) {
      ctx.addIssue({ code: "custom", path: ["commissionPercent"], message: "required" });
    }
    if (v.economicsModel === "commission" && !v.partnerId) {
      ctx.addIssue({ code: "custom", path: ["partnerId"], message: "partnerRequired" });
    }
    if (v.revealPolicy === "on_group_reveal" && !grouped) {
      ctx.addIssue({ code: "custom", path: ["revealPolicy"], message: "revealNeedsGroups" });
    }
  });

export type ExperienceInput = z.infer<typeof experienceInputSchema>;

/** Dates des sessions d'une récurrence hebdomadaire, en UTC, à partir d'une heure locale de la ville. */
export function planSessionDates(
  plan: { firstDate: string; time: string; weeks: number },
  durationMinutes: number,
  timeZone: string,
): { startAt: string; endAt: string }[] {
  const [y, m, d] = plan.firstDate.split("-").map(Number) as [number, number, number];
  const [hour, minute] = plan.time.split(":").map(Number) as [number, number];
  return Array.from({ length: plan.weeks }, (_, i) => {
    const day = new Date(Date.UTC(y, m - 1, d + i * 7));
    const start = zonedDateTimeToUtc(
      { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate(), hour, minute },
      timeZone,
    );
    return { startAt: start.toISOString(), endAt: new Date(start.getTime() + durationMinutes * 60_000).toISOString() };
  });
}

/** Marge estimée par place, en centimes, selon le modèle économique. */
export function marginPerSeat(priceAmount: number, model: "own" | "commission", costPerSeat = 0, commissionPercent = 0): number {
  return model === "own" ? priceAmount - costPerSeat : Math.round((priceAmount * commissionPercent) / 100);
}
