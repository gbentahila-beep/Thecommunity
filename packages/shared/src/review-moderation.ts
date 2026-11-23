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

/**
 * Audit du 23/11 — file de modération : un avis noté 2 étoiles ou moins, ou dont le texte contient un mot sensible,
 * attend la validation de l'équipe avant d'être publié (il ne compte pas dans la note tant qu'il est en attente).
 * Liste par défaut (FR, darija en lettres latines, arabe, EN) complétée dans le back-office (settings/reviews).
 */
export const REVIEW_MODERATION_MAX_RATING = 2;
export const DEFAULT_SENSITIVE_WORDS = [
  // insultes et propos haineux
  "connard", "connasse", "salope", "pute", "encule", "enculé", "batard", "bâtard", "fdp", "nique", "pd",
  "zamel", "9ahba", "qahba", "khanzir", "hmar", "tfou", "wld l9ahba",
  "قحبة", "زامل", "حمار", "خنزير", "كلب",
  "bitch", "asshole", "fuck", "slut", "whore",
  // signaux à vérifier (sécurité, accusations, données personnelles)
  "agression", "harcèlement", "harcele", "harcelé", "drogue", "vol", "volé", "police", "arnaque", "escroc",
  "harassment", "assault", "scam",
  "تحرش", "نصب",
];
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/**
 * Le texte contient-il un mot sensible ? Sans tenir compte des accents ni de la casse ; mot entier pour les mots
 * courts (« vol » ne prend pas « volontiers »), début de mot à partir de 5 lettres (« harcelé » prend « harcelée »).
 */
export function sensitiveWordIn(text: string, words: string[] = DEFAULT_SENSITIVE_WORDS): string | null {
  const t = ` ${fold(text).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  for (const w of words) {
    const f = fold(w).trim().replace(/[^\p{L}\p{N}]+/gu, " ");
    if (f && t.includes(f.length >= 5 ? ` ${f}` : ` ${f} `)) return w;
  }
  // Numéros de téléphone (06/07…, +212) : données personnelles dans un avis public.
  if (/(?:\+?212|0)[\s.-]?[5-7](?:[\s.-]?\d){8}/.test(text)) return "phone";
  return null;
}
export function reviewNeedsModeration(rating: number, comment: string, words?: string[]): { pending: boolean; why: "low_rating" | "sensitive" | null; word?: string } {
  if (rating <= REVIEW_MODERATION_MAX_RATING) return { pending: true, why: "low_rating" };
  const w = comment ? sensitiveWordIn(comment, words) : null;
  return w ? { pending: true, why: "sensitive", word: w } : { pending: false, why: null };
}
