import { z } from "zod";
import { CATEGORY_ID_PATTERN } from "./constants";
import type { LocalizedText } from "./types";

/**
 * Étape 19-20 — Organisateurs : professionnels, établissements ou indépendants qui proposent leurs activités.
 * Distincts des « partenaires » (lieux où se règle une part sur place) : un organisateur peut organiser chez un partenaire.
 *
 * Données : organizers/{id} (profil public, lisible quand le compte est validé) et organizers/{id}/private/details
 * (coordonnées, documents, décisions de l'équipe, lisible par l'organisateur et l'équipe). Écritures : serveur seulement.
 *
 * Fichiers : avant la validation, pièces et logo dans organizer-uploads/{uid}/documents|logo/… (privés) ;
 * après, logo et photos des activités dans organizers/{id}/public/… (publics).
 */

/** Lot O (docs/26) : univers ouverts aux organisateurs (les Tables sont les rendez-vous de Wenzy). */
export const ORGANIZER_UNIVERSES: readonly string[] = ["move", "discover"];

export const ORGANIZER_STATUSES = ["pending", "info_requested", "approved", "rejected", "suspended"] as const;
export type OrganizerStatus = (typeof ORGANIZER_STATUSES)[number];

/** Version du contrat organisateur acceptée à l'inscription (changer le texte = changer la version). */
export const ORGANIZER_TERMS_VERSION = "2026-11-24";

export const ORGANIZER_DOCUMENTS_MAX = 5;
export const ORGANIZER_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
/** 10 Mo par document. */
export const ORGANIZER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const UID = "[A-Za-z0-9_-]{1,128}";
const doc = z.object({
  path: z.string().max(300).regex(new RegExp(`^organizer-uploads/${UID}/documents/[\\w.-]{1,120}$`), "invalidDocument"),
  name: z.string().trim().min(1).max(120),
});
/** Logo envoyé avant la validation (dossier privé de la personne) ou après (dossier public de l'organisateur). */
const logoPath = z
  .string()
  .max(300)
  .regex(new RegExp(`^(organizer-uploads/${UID}/logo|organizers/[A-Za-z0-9_-]{6,40}/public)/[\\w.-]{1,120}$`), "invalidImage")
  .optional()
  .or(z.literal(""));

export const organizerApplicationSchema = z.object({
  businessName: z.string().trim().min(2, "required").max(120, "tooLong"),
  contactName: z.string().trim().min(2, "required").max(80, "tooLong"),
  email: z.string().trim().max(120).email("email"),
  phone: z.string().trim().min(6, "required").max(30, "tooLong").regex(/^[0-9 +().-]+$/, "phone"),
  cityId: z.string().trim().min(2, "required").max(40),
  address: z.string().trim().min(5, "required").max(200, "tooLong"),
  categoryIds: z.array(z.string().regex(CATEGORY_ID_PATTERN).refine((c) => ORGANIZER_UNIVERSES.includes(c), "organizerUniverse")).min(1, "pickOne").max(2, "tooMany"),
  description: z.string().trim().min(30, "tooShort").max(1500, "tooLong"),
  website: z.string().trim().max(200, "tooLong").optional().or(z.literal("")),
  instagram: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
  /** Logo ou photo (déjà envoyé), facultatif. */
  logoPath,
  documents: z.array(doc).max(ORGANIZER_DOCUMENTS_MAX, "tooMany").default([]),
  acceptTerms: z.literal(true, { message: "required" }),
});
export type OrganizerApplicationInput = z.input<typeof organizerApplicationSchema>;

export const organizerDecisionSchema = z
  .object({
    organizerId: z.string().regex(/^[A-Za-z0-9_-]{6,40}$/),
    decision: z.enum(["approve", "reject", "request_info", "suspend", "reactivate"]),
    message: z.string().trim().max(800, "tooLong").optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (["reject", "request_info", "suspend"].includes(v.decision) && (v.message ?? "").length < 5) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "required" });
    }
  });

/** Profil public modifiable par l'organisateur validé (ce qui s'affiche sur sa page). */
export const organizerProfileSchema = z.object({
  description: z.string().trim().min(30, "tooShort").max(1500, "tooLong"),
  descriptionAr: z.string().trim().max(1500, "tooLong").optional().or(z.literal("")),
  descriptionEn: z.string().trim().max(1500, "tooLong").optional().or(z.literal("")),
  website: z.string().trim().max(200, "tooLong").optional().or(z.literal("")),
  instagram: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
  phone: z.string().trim().min(6, "required").max(30, "tooLong").regex(/^[0-9 +().-]+$/, "phone"),
  address: z.string().trim().min(5, "required").max(200, "tooLong"),
  logoPath,
});

/** Profil public d'un organisateur (organizers/{id}). */
export type Organizer = {
  id: string;
  name: string;
  slug: string;
  description: LocalizedText;
  logoPath?: string;
  cityId: string;
  categoryIds: string[];
  status: OrganizerStatus;
  website?: string;
  instagram?: string;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  isDemo?: boolean;
};

/** « Atelier Lumière — Casa » → « atelier-lumiere-casa ». */
export function organizerSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Libellés des statuts (back-office et espace organisateur). */
export const ORGANIZER_STATUS_LABELS: Record<OrganizerStatus, string> = {
  pending: "En attente de validation",
  info_requested: "Complément demandé",
  approved: "Validé",
  rejected: "Refusé",
  suspended: "Suspendu",
};

/** Statut d'une activité proposée par un organisateur (le brouillon et la validation précèdent la publication). */
export const EXPERIENCE_STATUSES = ["draft", "pending_review", "published", "rejected", "archived"] as const;
export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number];

/**
 * Lot O (docs/26) — demandes d'un organisateur à l'équipe : annuler une date (l'équipe décide et rembourse) et
 * proposer une activité validée pour l'activité du samedi.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const ORGANIZER_REQUEST_TYPES = ["cancel_session", "saturday"] as const;
export type OrganizerRequestType = (typeof ORGANIZER_REQUEST_TYPES)[number];
export const organizerCancelRequestSchema = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{6,40}$/),
  reason: z.string().trim().min(10, "tooShort").max(600, "tooLong"),
});
export const saturdayProposalSchema = z.object({
  experienceId: z.string().regex(/^[A-Za-z0-9_-]{6,40}$/),
  /** Samedis souhaités (facultatif, 3 au plus). */
  dates: z.array(z.string().regex(DAY)).max(3, "tooMany").default([]),
  note: z.string().trim().max(600, "tooLong").optional().or(z.literal("")),
});
export const organizerRequestDecisionSchema = z
  .object({
    requestId: z.string().regex(/^[A-Za-z0-9_-]{6,40}$/),
    decision: z.enum(["accept", "refuse"]),
    message: z.string().trim().max(600, "tooLong").optional().or(z.literal("")),
    /** Proposition du samedi acceptée : le samedi choisi, l'heure et les places. */
    date: z.string().regex(DAY).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    capacity: z.coerce.number().int().min(2).max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "refuse" && (v.message ?? "").length < 5) ctx.addIssue({ code: "custom", path: ["message"], message: "required" });
  });
export type OrganizerRequestDecision = z.input<typeof organizerRequestDecisionSchema>;
