import { z } from "zod";
import { VENUE_TIERS } from "./two-part";
import { DEPOSIT_MAX, DEPOSIT_MIN, PAYMENT_MODELS } from "./marketplace";
import { BOOKING_MODES, CATEGORY_ID_PATTERN } from "./constants";
import { SPOKEN_LANGUAGES } from "./profile";
import { ACTIVITY_LEVELS, MIN_AGE_FLOOR, MIN_AGE_MAX } from "./activity";
import { questionnaireSchema } from "./questionnaire";
import { zonedDateTimeToUtc } from "./time";
import type { BookingMode, SpokenLanguage } from "./types";

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
  // Plafond par date : rester à taille humaine (décision du 8 novembre, voir MAX_SESSION_CAPACITY).
  capacity: z.coerce.number().int().min(1, "min1").max(50, "tooMany"),
});

export const experienceInputSchema = z
  .object({
    titleFr: z.string().trim().min(3, "tooShort").max(80, "tooLong"),
    titleAr: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
    // Anglais facultatif : sinon le texte français s'affiche sur la version anglaise du site.
    summaryAr: z.string().trim().max(160, "tooLong").optional().or(z.literal("")),
    descriptionAr: z.string().trim().max(3000, "tooLong").optional().or(z.literal("")),
    titleEn: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
    summaryEn: z.string().trim().max(160, "tooLong").optional().or(z.literal("")),
    descriptionEn: z.string().trim().max(3000, "tooLong").optional().or(z.literal("")),
    summaryFr: z.string().trim().min(10, "tooShort").max(160, "tooLong"),
    descriptionFr: z.string().trim().min(30, "tooShort").max(3000, "tooLong"),
    categoryId: z.string().regex(CATEGORY_ID_PATTERN, "required"),
    /** Étape 19 : sous-catégorie facultative (rattachée à la catégorie choisie, vérifié par le serveur). */
    subcategoryId: z.string().regex(CATEGORY_ID_PATTERN, "required").optional().or(z.literal("")),
    cityId: z.string().min(1, "required"),
    // docs/22, décision 15 : lieu secret → le lieu peut être choisi plus tard (au plus tard 5 h avant) ; lieu affiché → obligatoire.
    district: z.string().trim().max(60, "tooLong").default(""),
    venueName: z.string().trim().max(100, "tooLong").default(""),
    address: z.string().trim().max(200, "tooLong").default(""),
    revealPolicy: z.enum(["immediate", "on_group_reveal"]),
    /** Étape 23 : coordonnées GPS du lieu (« 33.5951, -7.6187 », copiées depuis une carte) : carte sur la fiche si le lieu est public. */
    venueCoords: z.string().trim().max(40, "tooLong").refine((s) => !s || parseCoords(s) !== null, "invalidCoords").optional().or(z.literal("")),
    bookingMode: z.enum(BOOKING_MODES as [BookingMode, ...BookingMode[]]),
    groupMin: z.coerce.number().int().min(2, "min2").max(20, "tooMany").optional(),
    groupTarget: z.coerce.number().int().min(2, "min2").max(20, "tooMany").optional(),
    groupMax: z.coerce.number().int().min(2, "min2").max(20, "tooMany").optional(),
    maxSeatsPerBooking: z.coerce.number().int().min(1, "min1").max(50, "tooMany"),
    admission: z.enum(["direct", "on_request"]).default("direct"),
    /** Prix membre précis (DH) ; vide = réduction de la formule d'abonnement. */
    memberPriceDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany").optional(),
    membersOnly: z.boolean().default(false),
    /** docs/22, décision 9 : abonnés d'abord pendant X jours après la mise en ligne d'une date (0 = ouvert à tous tout de suite). */
    earlyAccessDays: z.coerce.number().int().min(0, "min0").max(30, "tooMany").default(0),
    requestMessageRequired: z.boolean().default(false),
    /** 11h : compte Instagram obligatoire dans la demande de participation (expériences sur demande). */
    requestInstagramRequired: z.boolean().default(false),
    /**
     * docs/22 : le prix d'un événement Wenzy est le prix Wenzy global (35 DH), jamais saisi ici. `priceDh` ne sert plus
     * qu'aux activités d'organisateurs (prix total de l'activité). `free` : événement gratuit (aucun frais Wenzy).
     */
    priceDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany").optional(),
    free: z.boolean().default(false),
    durationMinutes: z.coerce.number().int().min(15, "min15").max(1440, "tooMany"),
    languages: z.array(z.enum(SPOKEN_LANGUAGES as [SpokenLanguage, ...SpokenLanguage[]])).min(1, "pickOne"),
    alcoholServed: z.boolean(),
    /** docs/16 : pas d'hôte par défaut ; l'organisateur peut indiquer qu'une hôtesse accueille sur place. */
    onSiteHost: z.boolean().default(false),
    /** Plats ou boissons servis hors univers « Dîners » (atelier cuisine…) : régime et allergies demandés. */
    foodServed: z.boolean().default(false),
    included: z.string().max(1000, "tooLong").optional().or(z.literal("")),
    /** Étape 23 : ce qui n'est pas compris dans le prix (un élément par ligne). */
    notIncluded: z.string().max(1000, "tooLong").optional().or(z.literal("")),
    practicalInfo: z.string().max(1000, "tooLong").optional().or(z.literal("")),
    cancellationPolicyId: z.string().min(1, "required"),
    partnerId: z.string().optional().or(z.literal("")),
    economicsModel: z.enum(["own", "commission"]).default("own"),
    costPerSeatDh: z.coerce.number().min(0, "min0").optional(),
    commissionPercent: z.coerce.number().min(0, "min0").max(100, "max100").optional(),
    /** 11g : commission éventuelle sur la part réglée sur place, facturée au partenaire hors site (jamais encaissée en ligne). */
    onSiteCommissionPercent: z.coerce.number().min(0, "min0").max(100, "max100").optional(),
    /** Étape 11 : comment le client paie (section « Tarification et paiement client »). */
    /** Étape 22 : mode de paiement d'une activité d'organisateur (A tout en ligne, B acompte, C frais de réservation). */
    paymentModel: z.enum(PAYMENT_MODELS).default("full_online"),
    depositPercent: z.coerce.number().int().min(DEPOSIT_MIN, "depositRange").max(DEPOSIT_MAX, "depositRange").optional(),
    pricingModel: z.enum(["online_only", "fixed_partner", "variable_consumption"]).default("online_only"),
    partnerPriceDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany").optional(),
    partnerDescription: z.string().trim().max(300, "tooLong").optional().or(z.literal("")),
    /** Restaurant (docs/16) : gamme, budget estimé par personne (consommation libre), cuisine, ambiance. */
    venueTier: z.enum(VENUE_TIERS).optional().or(z.literal("")),
    budgetMinDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany").optional(),
    budgetMaxDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany").optional(),
    cuisine: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
    ambiance: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
    status: z.enum(["draft", "published"]),
    sessions: sessionPlanSchema,
    /* ——— 18b : précisions pour les activités (toutes facultatives) ——— */
    level: z.enum(ACTIVITY_LEVELS).optional(),
    equipmentProvided: z.string().trim().max(300, "tooLong").optional().or(z.literal("")),
    whatToBring: z.string().trim().max(300, "tooLong").optional().or(z.literal("")),
    dressCode: z.string().trim().max(200, "tooLong").optional().or(z.literal("")),
    /** Âge minimum au-delà de 18 ans (vérifié par le serveur à la réservation). */
    minAge: z.coerce.number().int().min(MIN_AGE_FLOOR, "minAge").max(MIN_AGE_MAX, "tooMany").optional(),
    /** Étape 29 : public (« all » mixte, « women » réservé aux femmes : vérifié par le serveur à la réservation). */
    audience: z.enum(["all", "women"]).default("all"),
    /** Étape O : badge de la carte choisi par l'équipe (« auto » : le site décide ; « none » : aucun). */
    highlight: z.enum(["auto", "none", "featured", "popular", "new", "almostFull", "special"]).default("auto"),
    /** Étape 29 : tranche d'âge visée, indicative (affichée sur la fiche, jamais bloquante). */
    targetAgeMin: z.coerce.number().int().min(MIN_AGE_FLOOR, "minAge").max(99, "tooMany").optional(),
    targetAgeMax: z.coerce.number().int().min(MIN_AGE_FLOOR, "minAge").max(99, "tooMany").optional(),
    /** En plein air : reportée ou annulée (remboursée) si la météo ne permet pas l'activité. */
    outdoor: z.boolean().default(false),
    /** 18c : activité physique → conditions de participation à accepter à la réservation. */
    physicalActivity: z.boolean().default(false),
    /** 18a : questionnaire rempli par les participants après leur réservation (10 questions au plus). */
    questionnaire: questionnaireSchema,
    /** docs/22 : modèle d'événement dont la fiche est partie (pour le suivi ; rien n'en dépend). */
    templateId: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/).optional(),
    /** 18d : proposition d'un membre de confiance dont cette expérience est issue. */
    proposalId: z.string().regex(/^[A-Za-z0-9_-]{6,40}$/).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.targetAgeMin && v.targetAgeMax && v.targetAgeMin > v.targetAgeMax) ctx.addIssue({ code: "custom", path: ["targetAgeMax"], message: "ageOrder" });
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
    if (v.memberPriceDh !== undefined && v.priceDh !== undefined && v.memberPriceDh > v.priceDh) {
      ctx.addIssue({ code: "custom", path: ["memberPriceDh"], message: "memberAbovePublic" });
    }
    if (v.economicsModel === "commission" && v.commissionPercent === undefined) {
      ctx.addIssue({ code: "custom", path: ["commissionPercent"], message: "required" });
    }
    if (v.economicsModel === "commission" && !v.partnerId) {
      ctx.addIssue({ code: "custom", path: ["partnerId"], message: "partnerRequired" });
    }
    if (v.pricingModel !== "online_only" && v.economicsModel === "commission") {
      ctx.addIssue({ code: "custom", path: ["economicsModel"], message: "onSiteNoCommission" });
    }
    // docs/22 : une part sur place (menu, consommation, prix de l'activité) ne demande plus de lieu partenaire enregistré.
    if ((v.budgetMinDh === undefined) !== (v.budgetMaxDh === undefined)) {
      ctx.addIssue({ code: "custom", path: [v.budgetMinDh === undefined ? "budgetMinDh" : "budgetMaxDh"], message: "required" });
    }
    if (v.budgetMinDh !== undefined && v.budgetMaxDh !== undefined && v.budgetMinDh > v.budgetMaxDh) {
      ctx.addIssue({ code: "custom", path: ["budgetMaxDh"], message: "budgetOrder" });
    }
    // Consommation libre : le client doit savoir combien il dépensera (budget estimé, ou à défaut la gamme).
    if (v.pricingModel === "variable_consumption" && v.budgetMaxDh === undefined && !v.venueTier) {
      ctx.addIssue({ code: "custom", path: ["budgetMinDh"], message: "budgetNeeded" });
    }
    if (v.pricingModel === "fixed_partner" && v.partnerPriceDh === undefined) {
      ctx.addIssue({ code: "custom", path: ["partnerPriceDh"], message: "required" });
    }
    if (v.revealPolicy === "immediate") {
      if (v.district.length < 2) ctx.addIssue({ code: "custom", path: ["district"], message: "required" });
      if (v.venueName.length < 2) ctx.addIssue({ code: "custom", path: ["venueName"], message: "required" });
      if (v.address.length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "required" });
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

/** « 33.5951, -7.6187 » → { lat, lng } (null si illisible ou hors limites). */
export function parseCoords(s: string | null | undefined): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/.exec(s ?? "");
  if (!m) return null;
  const lat = Number(m[1]!.replace(",", "."));
  const lng = Number(m[2]!.replace(",", "."));
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 } : null;
}
