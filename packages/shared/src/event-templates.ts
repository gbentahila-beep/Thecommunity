import { z } from "zod";
import { BOOKING_MODES, CATEGORY_ID_PATTERN } from "./constants";
import { ACTIVITY_LEVELS } from "./activity";
import { SPOKEN_LANGUAGES } from "./profile";
import { QUESTIONNAIRE_TEMPLATES, questionnaireSchema, type QuestionDef } from "./questionnaire";
import type { VenueTier } from "./two-part";
import type { BookingMode, SpokenLanguage } from "./types";

/**
 * Modèles d'événements (docs/22 § 5 et 7, docs/23) : toute création part d'un modèle qui pré-remplit tout, du titre
 * au questionnaire, image comprise. Choix en 3 temps : univers → modèle (format) → gamme (Tables seulement).
 * Les 14 modèles du lancement, validés le 22 novembre, sont définis ici ; l'équipe peut les modifier, les masquer ou
 * en créer d'autres dans l'appli (collection `eventTemplates`, qui l'emporte sur ces valeurs par défaut).
 */

/** Ce qui change selon la gamme d'un modèle de Tables. */
export type TemplateTier = { ambiance: string; practicalInfo?: string };

/** Réglages pré-remplis (mêmes noms que le formulaire d'expérience). */
export type TemplateValues = {
  titleFr: string;
  summaryFr: string;
  descriptionFr: string;
  titleAr?: string;
  summaryAr?: string;
  descriptionAr?: string;
  titleEn?: string;
  summaryEn?: string;
  descriptionEn?: string;
  categoryId: string;
  subcategoryId?: string;
  revealPolicy: "immediate" | "on_group_reveal";
  bookingMode: BookingMode;
  groupMin?: number;
  groupMax?: number;
  capacity: number;
  maxSeatsPerBooking: 1 | 2;
  durationMinutes: number;
  /** Jour conseillé (0 = dimanche … 6 = samedi) et heure de début (heure de Casablanca). */
  weekday: number;
  time: string;
  pricingModel: "online_only" | "fixed_partner" | "variable_consumption";
  partnerPriceDh?: number;
  budgetMinDh?: number;
  budgetMaxDh?: number;
  cuisine?: string;
  ambiance?: string;
  included: string;
  practicalInfo?: string;
  level?: (typeof ACTIVITY_LEVELS)[number];
  equipmentProvided?: string;
  whatToBring?: string;
  dressCode?: string;
  outdoor: boolean;
  physicalActivity: boolean;
  alcoholServed: boolean;
  languages: SpokenLanguage[];
  cancellationPolicyId: string;
  audience: "all" | "women";
  membersOnly: boolean;
  /** Abonnés d'abord pendant X jours après la mise en ligne d'une date (0 = ouvert à tous tout de suite). */
  earlyAccessDays: number;
  questionnaire: QuestionDef[];
};

export type EventTemplate = {
  id: string;
  /** Nom affiché dans la grille du back-office. */
  name: string;
  /** Photo du modèle (fichier du site, ex. /images/modeles/cafe.webp). */
  image: string;
  order: number;
  isActive: boolean;
  /** Modèle livré avec le site (sinon créé dans l'appli). */
  builtIn?: boolean;
  /** Tables : gammes proposées et ce qu'elles changent (ambiance, infos pratiques). */
  tiers?: Partial<Record<VenueTier, TemplateTier>>;
  values: TemplateValues;
};

const q = (id: string) => QUESTIONNAIRE_TEMPLATES.find((t) => t.id === id)?.questions ?? [];

/** Réglages communs (docs/23 § 3). */
const COMMON = {
  maxSeatsPerBooking: 1 as const,
  alcoholServed: false,
  languages: ["fr", "darija"] as SpokenLanguage[],
  cancellationPolicyId: "standard-48h",
  audience: "all" as const,
  membersOnly: false,
  earlyAccessDays: 0,
  outdoor: false,
  physicalActivity: false,
};

/** Tables : lieu secret, tables de 4 à 6, consommation sur place selon la gamme, pas de questionnaire (le profil suffit). */
const TABLE = {
  ...COMMON,
  categoryId: "eat",
  revealPolicy: "on_group_reveal" as const,
  bookingMode: "social_dinner" as const,
  groupMin: 4,
  groupMax: 6,
  capacity: 24,
  durationMinutes: 150,
  pricingModel: "variable_consumption" as const,
  questionnaire: [] as QuestionDef[],
};

export const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  // ——— Tables ———
  {
    id: "cafe", name: "Café", image: "/images/modeles/cafe.webp", order: 1, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Cosy et détendue" }, premium: { ambiance: "Café de spécialité" }, exclusive: { ambiance: "Salon de thé raffiné" } },
    values: {
      ...TABLE, subcategoryId: "cafe", weekday: 6, time: "10:30",
      titleFr: "Café",
      summaryFr: "Un café, une table, et des discussions avec des gens que vous ne connaissez pas encore.",
      descriptionFr: "Un café choisi par notre équipe, avec des personnes qui ont de quoi se parler. On commande, on discute, on fait connaissance, et chacun reste aussi longtemps qu'il le souhaite.",
      included: "La réservation du café",
    },
  },
  {
    id: "brunch", name: "Brunch", image: "/images/modeles/brunch.webp", order: 2, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Lumineuse et décontractée" }, premium: { ambiance: "Adresse tendance" }, exclusive: { ambiance: "Hôtel ou adresse d'exception" } },
    values: {
      ...TABLE, subcategoryId: "brunch", weekday: 6, time: "11:30",
      titleFr: "Brunch",
      summaryFr: "Un brunch partagé avec des gens que vous ne connaissez pas encore.",
      descriptionFr: "Le week-end commence autour d'un brunch, dans un restaurant choisi par notre équipe, avec tout le temps de faire connaissance.",
      included: "La réservation du restaurant",
    },
  },
  {
    id: "dejeuner", name: "Déjeuner", image: "/images/modeles/dejeuner.webp", order: 3, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Simple et conviviale" }, premium: { ambiance: "Chic et décontractée" }, exclusive: { ambiance: "Haut de gamme" } },
    values: {
      ...TABLE, subcategoryId: "dejeuner", weekday: 4, time: "12:30",
      titleFr: "Déjeuner",
      summaryFr: "La pause de midi, à une table d'inconnus.",
      descriptionFr: "On change d'air en pleine semaine : un déjeuner dans un restaurant choisi par notre équipe, pour discuter et rencontrer de nouvelles têtes.",
      included: "La réservation du restaurant",
    },
  },
  {
    id: "diner", name: "Dîner", image: "/images/modeles/diner.webp", order: 4, isActive: true, builtIn: true,
    tiers: { casual: { ambiance: "Conviviale" }, premium: { ambiance: "Chic et décontractée" }, exclusive: { ambiance: "Haut de gamme", practicalInfo: "Tenue soignée." } },
    values: {
      ...TABLE, subcategoryId: "diner", weekday: 3, time: "20:00",
      titleFr: "Dîner",
      summaryFr: "Une table, des inconnus, et une adresse à découvrir.",
      descriptionFr: "Notre format phare. Des personnes qui ont de quoi se parler, réunies d'après leurs profils, dans un restaurant choisi par notre équipe. Une soirée pour rencontrer de nouvelles têtes, à votre rythme.",
      included: "La réservation du restaurant",
    },
  },
  // ——— Bouger ———
  {
    id: "running", name: "Running", image: "/images/modeles/running.webp", order: 1, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 8, capacity: 20, durationMinutes: 75, weekday: 6, time: "08:00",
      titleFr: "Running",
      summaryFr: "Courir à plusieurs, à votre allure, puis un café face à l'océan.",
      descriptionFr: "Un parcours de 5 à 8 km sur la Corniche, en groupes de même allure. On court, on discute, et ceux qui veulent prolongent par un café.",
      pricingModel: "online_only",
      included: "Un parcours préparé",
      whatToBring: "Chaussures de course, eau", dressCode: "Tenue de sport", level: "all", outdoor: true, physicalActivity: true,
      questionnaire: q("running"),
    },
  },
  {
    id: "padel", name: "Padel", image: "/images/modeles/padel.webp", order: 2, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", subcategoryId: "padel", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 4, capacity: 8, durationMinutes: 90, weekday: 6, time: "10:00",
      titleFr: "Padel",
      summaryFr: "Quatre par terrain, même niveau, et des parties qui s'enchaînent.",
      descriptionFr: "Des parties entre joueurs de niveau proche, dans un club partenaire. Débutant ou confirmé, chacun joue à sa mesure, puis ceux qui le souhaitent se retrouvent autour d'un verre.",
      pricingModel: "fixed_partner", partnerPriceDh: 120,
      included: "Le terrain réservé",
      equipmentProvided: "Raquettes et balles (à confirmer avec le club)", dressCode: "Sport, baskets propres", level: "all", physicalActivity: true,
      questionnaire: q("padel"),
    },
  },
  {
    id: "yoga", name: "Yoga", image: "/images/modeles/yoga.webp", order: 3, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "move", revealPolicy: "immediate", bookingMode: "individual", capacity: 12, durationMinutes: 75, weekday: 0, time: "09:00",
      titleFr: "Yoga",
      summaryFr: "Une séance de yoga tous niveaux, en petit groupe.",
      descriptionFr: "Un cours accessible à tous, donné par un professeur dans un lieu partenaire : studio, jardin ou rooftop.",
      pricingModel: "fixed_partner", partnerPriceDh: 120,
      included: "Le cours",
      equipmentProvided: "Tapis", whatToBring: "Eau", dressCode: "Souple", level: "all", physicalActivity: true,
      questionnaire: q("level"),
    },
  },
  // ——— Sortir ———
  {
    id: "escape-game", name: "Escape game", image: "/images/modeles/escape-game.webp", order: 1, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 12, durationMinutes: 60, weekday: 5, time: "19:00",
      titleFr: "Escape game",
      summaryFr: "Une heure pour sortir ensemble, avec des coéquipiers que vous ne connaissez pas encore.",
      descriptionFr: "Une heure d'énigmes à résoudre ensemble dans une salle partenaire, en mêlant habitués et débutants.",
      pricingModel: "fixed_partner", partnerPriceDh: 150,
      included: "La salle réservée",
      level: "all",
      questionnaire: q("paintball"),
    },
  },
  {
    id: "soiree-jeux", name: "Soirée jeux", image: "/images/modeles/soiree-jeux.webp", order: 2, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 18, durationMinutes: 150, weekday: 2, time: "19:30",
      titleFr: "Soirée jeux",
      summaryFr: "Des jeux simples, des règles expliquées, et des fous rires.",
      descriptionFr: "Des jeux faciles à apprendre, dans un café ludique partenaire. On change de table en cours de soirée pour jouer avec d'autres personnes.",
      pricingModel: "variable_consumption", budgetMinDh: 40, budgetMaxDh: 80,
      included: "Les jeux\nLes règles expliquées",
      questionnaire: [],
    },
  },
  {
    id: "quiz", name: "Quiz", image: "/images/modeles/quiz.webp", order: 3, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 24, durationMinutes: 120, weekday: 4, time: "20:00",
      titleFr: "Quiz",
      summaryFr: "Culture générale, musique et fous rires, avec une équipe d'inconnus.",
      descriptionFr: "Six manches de quiz et de blind test, animées dans un café ou un bar partenaire.",
      pricingModel: "variable_consumption", budgetMinDh: 60, budgetMaxDh: 120,
      included: "L'animation du quiz",
      questionnaire: q("paintball"),
    },
  },
  {
    id: "afterwork", name: "Afterwork", image: "/images/modeles/afterwork.webp", order: 4, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "open", capacity: 30, durationMinutes: 120, weekday: 4, time: "19:30",
      titleFr: "Afterwork",
      summaryFr: "Après le travail, un verre avec des gens qui ont aussi envie de rencontrer du monde.",
      descriptionFr: "Un espace réservé pour le groupe dans un bar ou un rooftop partenaire, pour faire de nouvelles rencontres en fin de journée.",
      pricingModel: "variable_consumption", budgetMinDh: 60, budgetMaxDh: 150,
      included: "Un espace réservé pour le groupe",
      questionnaire: [],
    },
  },
  {
    id: "echange-langues", name: "Échange de langues", image: "/images/modeles/echange-langues.webp", order: 5, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "discover", revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupMax: 6, capacity: 24, durationMinutes: 120, weekday: 3, time: "19:00",
      titleFr: "Échange de langues",
      summaryFr: "Pratiquer une langue en vrai, autour d'un café.",
      descriptionFr: "Vous pratiquez la langue de votre choix avec des personnes qui la parlent, dans un café partenaire. On change de table toutes les 30 minutes.",
      pricingModel: "variable_consumption", budgetMinDh: 30, budgetMaxDh: 60,
      included: "Des tables par langue",
      languages: ["fr", "en", "es", "ar", "darija"],
      questionnaire: q("langues"),
    },
  },
  // ——— Découvrir ———
  {
    id: "ceramique", name: "Céramique", image: "/images/modeles/ceramique.webp", order: 1, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "create", revealPolicy: "immediate", bookingMode: "individual", capacity: 8, durationMinutes: 120, weekday: 6, time: "15:00",
      titleFr: "Céramique",
      summaryFr: "Les mains dans la terre, et de nouvelles têtes autour de la table.",
      descriptionFr: "Un céramiste vous guide pour façonner votre pièce (bol, tasse ou petit vase), en petit groupe.",
      pricingModel: "fixed_partner", partnerPriceDh: 300,
      included: "L'atelier guidé par un céramiste\nLa terre et la cuisson",
      practicalInfo: "Pièce cuite et émaillée par l'atelier, à récupérer deux à trois semaines plus tard.",
      equipmentProvided: "Terre, outils, tablier", dressCode: "Vêtements qui ne craignent rien", level: "beginner",
      questionnaire: q("workshop"),
    },
  },
  {
    id: "visite-guidee", name: "Visite guidée", image: "/images/modeles/visite-guidee.webp", order: 2, isActive: true, builtIn: true,
    values: {
      ...COMMON, categoryId: "create", revealPolicy: "immediate", bookingMode: "individual", capacity: 15, durationMinutes: 120, weekday: 6, time: "10:00",
      titleFr: "Visite guidée",
      summaryFr: "Casablanca racontée par un guide passionné, en petit groupe.",
      descriptionFr: "Une balade à pied avec un guide local, au choix : Art déco du centre-ville, Habous ou ancienne médina.",
      pricingModel: "fixed_partner", partnerPriceDh: 120,
      included: "La visite guidée",
      whatToBring: "Chaussures confortables, eau", outdoor: true,
      questionnaire: [],
    },
  },
];

/** Univers où ranger un modèle, dans l'ordre d'affichage (docs/22, décision 36). */
export const TEMPLATE_UNIVERSES = ["eat", "move", "discover", "create"] as const;

/** Modèles visibles : ceux de l'appli l'emportent sur ceux livrés avec le site (même identifiant). */
export function mergeTemplates(saved: EventTemplate[], defaults: EventTemplate[] = DEFAULT_EVENT_TEMPLATES): EventTemplate[] {
  const byId = new Map(defaults.map((t) => [t.id, t]));
  for (const t of saved) byId.set(t.id, { ...t, builtIn: byId.get(t.id)?.builtIn ?? false });
  return [...byId.values()].sort((a, b) => TEMPLATE_UNIVERSES.indexOf(a.values.categoryId as never) - TEMPLATE_UNIVERSES.indexOf(b.values.categoryId as never) || a.order - b.order || a.name.localeCompare(b.name, "fr"));
}

/** Prochaine date (AAAA-MM-JJ) qui tombe le jour conseillé, au plus tôt demain. */
export function nextWeekdayDate(weekday: number, now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/* ——— Enregistrement d'un modèle depuis l'appli ——— */

const text = (max: number) => z.string().trim().max(max, "tooLong").optional().or(z.literal(""));
const tierSchema = z.object({ ambiance: z.string().trim().max(60, "tooLong"), practicalInfo: text(1000) });

export const templateValuesSchema = z.object({
  titleFr: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  summaryFr: z.string().trim().min(10, "tooShort").max(160, "tooLong"),
  descriptionFr: z.string().trim().min(30, "tooShort").max(3000, "tooLong"),
  titleAr: text(80), summaryAr: text(160), descriptionAr: text(3000), titleEn: text(80), summaryEn: text(160), descriptionEn: text(3000),
  categoryId: z.string().regex(CATEGORY_ID_PATTERN, "required"),
  subcategoryId: z.string().regex(CATEGORY_ID_PATTERN).optional().or(z.literal("")),
  revealPolicy: z.enum(["immediate", "on_group_reveal"]),
  bookingMode: z.enum(BOOKING_MODES as [BookingMode, ...BookingMode[]]),
  groupMin: z.number().int().min(2).max(20).optional(),
  groupMax: z.number().int().min(2).max(20).optional(),
  capacity: z.number().int().min(1).max(50),
  maxSeatsPerBooking: z.union([z.literal(1), z.literal(2)]),
  durationMinutes: z.number().int().min(15).max(1440),
  weekday: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "required"),
  pricingModel: z.enum(["online_only", "fixed_partner", "variable_consumption"]),
  partnerPriceDh: z.number().min(0).max(100_000).optional(),
  budgetMinDh: z.number().min(0).max(100_000).optional(),
  budgetMaxDh: z.number().min(0).max(100_000).optional(),
  cuisine: text(60), ambiance: text(60),
  included: z.string().max(1000, "tooLong"),
  practicalInfo: text(1000),
  level: z.enum(ACTIVITY_LEVELS).optional(),
  equipmentProvided: text(300), whatToBring: text(300), dressCode: text(200),
  outdoor: z.boolean(),
  physicalActivity: z.boolean(),
  alcoholServed: z.boolean(),
  languages: z.array(z.enum(SPOKEN_LANGUAGES as [SpokenLanguage, ...SpokenLanguage[]])).min(1, "pickOne"),
  cancellationPolicyId: z.string().min(1, "required"),
  audience: z.enum(["all", "women"]),
  membersOnly: z.boolean(),
  earlyAccessDays: z.number().int().min(0).max(30),
  questionnaire: questionnaireSchema,
});

export const templateInputSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/, "slug"),
  name: z.string().trim().min(2, "tooShort").max(60, "tooLong"),
  image: z.string().regex(/^(\/images\/modeles\/[a-z0-9-]+\.webp|experiences\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+)$/, "invalidImagePath"),
  order: z.number().int().min(0).max(999).default(50),
  isActive: z.boolean().default(true),
  tiers: z.object({ casual: tierSchema.optional(), premium: tierSchema.optional(), exclusive: tierSchema.optional() }).optional(),
  values: templateValuesSchema,
});
export type TemplateInput = z.infer<typeof templateInputSchema>;

/** Identifiant lisible d'un nouveau modèle (« Soirée karaoké » → « soiree-karaoke »). */
export function templateSlug(name: string): string {
  const s = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return /^[a-z]/.test(s) ? s : `modele-${s || "nouveau"}`;
}


/**
 * Vitrine (docs/22, étape M) : données d'un événement créé à partir d'un modèle, prêtes pour experienceInputSchema.
 * Tables : lieu attribué (secret), une gamme ; activités : lieu fixe (un lieu partenaire compatible).
 */
export function templateExperienceInput(t: EventTemplate, o: { tier?: VenueTier | null; firstDate: string; weeks: number; cityId: string; venue?: { name: string; address: string; district: string; partnerId?: string } | null }) {
  const x = t.values;
  const g = o.tier ? t.tiers?.[o.tier] : undefined;
  const grouped = x.bookingMode === "group" || x.bookingMode === "social_dinner";
  return {
    // Étape S : la gamme n'est pas dans le titre (elle s'affiche sur la carte, sous le titre).
    titleFr: x.titleFr, summaryFr: x.summaryFr, descriptionFr: x.descriptionFr,
    titleAr: x.titleAr ?? "", summaryAr: x.summaryAr ?? "", descriptionAr: x.descriptionAr ?? "",
    titleEn: x.titleEn ?? "", summaryEn: x.summaryEn ?? "", descriptionEn: x.descriptionEn ?? "",
    categoryId: x.categoryId, subcategoryId: x.subcategoryId ?? "", cityId: o.cityId,
    district: o.venue?.district ?? "", venueName: o.venue?.name ?? "", address: o.venue?.address ?? "", partnerId: o.venue?.partnerId ?? "",
    revealPolicy: x.revealPolicy, bookingMode: x.bookingMode,
    ...(grouped ? { groupMin: x.groupMin ?? 4, groupTarget: x.groupMax ?? 6, groupMax: x.groupMax ?? 6 } : {}),
    maxSeatsPerBooking: x.maxSeatsPerBooking, admission: "direct" as const, requestMessageRequired: false,
    durationMinutes: x.durationMinutes, languages: x.languages, alcoholServed: x.alcoholServed,
    cancellationPolicyId: x.cancellationPolicyId, status: "published" as const,
    sessions: { firstDate: o.firstDate, time: x.time, weeks: o.weeks, capacity: x.capacity },
    pricingModel: x.pricingModel,
    ...(x.partnerPriceDh !== undefined ? { partnerPriceDh: x.partnerPriceDh } : {}),
    ...(x.budgetMinDh !== undefined ? { budgetMinDh: x.budgetMinDh } : {}),
    ...(x.budgetMaxDh !== undefined ? { budgetMaxDh: x.budgetMaxDh } : {}),
    venueTier: o.tier ?? "", ambiance: g?.ambiance ?? x.ambiance ?? "", cuisine: x.cuisine ?? "",
    included: x.included, practicalInfo: g?.practicalInfo ?? x.practicalInfo ?? "",
    ...(x.level ? { level: x.level } : {}), equipmentProvided: x.equipmentProvided ?? "", whatToBring: x.whatToBring ?? "", dressCode: x.dressCode ?? "",
    outdoor: x.outdoor, physicalActivity: x.physicalActivity, foodServed: x.categoryId === "eat",
    audience: x.audience, membersOnly: x.membersOnly, earlyAccessDays: x.earlyAccessDays,
    questionnaire: x.questionnaire, templateId: t.id, free: false, economicsModel: "own" as const,
  };
}
