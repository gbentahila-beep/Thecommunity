import { z } from "zod";

/**
 * Étape 24 — avis : réponse publique de l'organisateur (ou de l'équipe), signalement par les membres et
 * l'organisateur, historique de modération (visible de l'équipe seulement), photo facultative vérifiée par
 * l'équipe avant d'être publiée.
 *
 * Données : reviews/{id}.reply (réponse publique), reviews/{id}.photo ({ path, status }), reviews/{id}.reportsOpen
 * (signalements à traiter) ; reviews/{id}/reports/{uid} (un signalement par personne) ; reviews/{id}/private/history
 * (événements). Écritures : serveur seulement.
 */

const ID = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

export const REVIEW_REPLY_MAX = 1000;
/** Réponse publique ; un texte vide retire la réponse. */
export const reviewReplySchema = z.object({
  reviewId: ID,
  text: z.string().trim().max(REVIEW_REPLY_MAX, "tooLong").refine((t) => t === "" || t.length >= 2, "tooShort"),
});

export const REVIEW_REPORT_REASONS = ["offensive", "personal_info", "false_info", "spam", "other"] as const;
export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number];
export const REVIEW_REPORT_LABELS: Record<ReviewReportReason, string> = {
  offensive: "Propos insultants ou discriminatoires",
  personal_info: "Informations personnelles",
  false_info: "Faux ou sans rapport avec l'activité",
  spam: "Publicité ou spam",
  other: "Autre",
};
export const reviewReportSchema = z
  .object({
    reviewId: ID,
    reason: z.enum(REVIEW_REPORT_REASONS),
    message: z.string().trim().max(500, "tooLong").optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.reason === "other" && (v.message ?? "").length < 5) ctx.addIssue({ code: "custom", path: ["message"], message: "required" });
  });

/** Traitement des signalements par l'équipe : garder l'avis ou le masquer (avec une note pour l'historique). */
export const reviewReportsDecisionSchema = z.object({
  reviewId: ID,
  outcome: z.enum(["keep", "hide"]),
  note: z.string().trim().max(500, "tooLong").optional().or(z.literal("")),
});

/** Photo jointe à un avis : envoyée dans le dossier privé de la personne, publiée seulement après vérification. */
export const REVIEW_PHOTO_MAX_MB = 5;
export const REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const reviewPhotoPath = (uid: string) => new RegExp(`^review-uploads/${uid.replace(/[^A-Za-z0-9_-]/g, "")}/[\\w.-]{1,120}$`);
export const reviewPhotoDecisionSchema = z
  .object({
    reviewId: ID,
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(500, "tooLong").optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "reject" && (v.note ?? "").length < 5) ctx.addIssue({ code: "custom", path: ["note"], message: "required" });
  });

export type ReviewReply = { text: string; authorName: string; authorRole: "organizer" | "team"; at: string };
export type ReviewPhoto = { path: string; status: "pending" | "approved" | "rejected" };

export const REVIEW_HISTORY_ACTIONS = ["created", "reply", "reply_removed", "reported", "reports_kept", "hidden", "published", "photo_approved", "photo_rejected"] as const;
export type ReviewHistoryAction = (typeof REVIEW_HISTORY_ACTIONS)[number];
export const REVIEW_HISTORY_LABELS: Record<ReviewHistoryAction, string> = {
  created: "Avis publié",
  reply: "Réponse publiée",
  reply_removed: "Réponse retirée",
  reported: "Signalé",
  reports_kept: "Signalements traités : avis gardé",
  hidden: "Avis masqué",
  published: "Avis republié",
  photo_approved: "Photo acceptée",
  photo_rejected: "Photo refusée",
};
export type ReviewHistoryEvent = { action: ReviewHistoryAction; at: string; byRole: "member" | "organizer" | "team" | "system"; byName?: string; note?: string };

/** Note d'un organisateur : moyenne des avis publiés de toutes ses activités, pondérée par leur nombre. */
export function organizerRating(experiences: { ratingAvg: number; ratingCount: number }[]): { avg: number; count: number } {
  const count = experiences.reduce((a, e) => a + (e.ratingCount || 0), 0);
  const avg = count ? experiences.reduce((a, e) => a + (e.ratingAvg || 0) * (e.ratingCount || 0), 0) / count : 0;
  return { avg: Math.round(avg * 10) / 10, count };
}
