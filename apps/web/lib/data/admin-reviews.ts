import "server-only";
import type { Review } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { DEMO_REVIEWS } from "./demo";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

/** Les 300 derniers avis (publiés et masqués) pour la modération. */
export type AdminReview = Review & {
  sessionStartAt?: string;
  /** Étape 24 : signalements à traiter (motif, précision, par l'organisateur ?) et historique de modération. */
  openReports: { reason: string; message: string; byOrganizer: boolean; at: string }[];
  history: { action: string; at: string; byRole: string; byName?: string; note?: string }[];
};

/** Démonstration : un avis signalé, une photo à vérifier, une réponse de l'organisateur. */
function demoAdminReviews(): AdminReview[] {
  return DEMO_REVIEWS.map((r, i) => ({
    ...r,
    status: "published" as const,
    openReports: i === 3 ? [{ reason: "false_info", message: "Je n'ai pas vu cette personne ce soir-là.", byOrganizer: false, at: "2026-11-19T10:00:00Z" }] : [],
    reportsOpen: i === 3 ? 1 : 0,
    reportCount: i === 3 ? 1 : 0,
    ...(i === 2 ? { photo: { path: "/demo/pilates-brunch.webp", status: "pending" as const } } : {}),
    history: [{ action: "created", at: r.createdAt, byRole: "member" }, ...(i === 3 ? [{ action: "reported", at: "2026-11-19T10:00:00Z", byRole: "member", note: "Faux ou sans rapport avec l'activité" }] : [])],
  }));
}

export async function getAdminReviews(): Promise<{ reviews: AdminReview[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { reviews: demoAdminReviews(), isDemo: true };
  await requireAdmin();
  const snap = await adminDb().collection("reviews").orderBy("createdAt", "desc").limit(300).get();
  return {
    isDemo: false,
    reviews: await Promise.all(
      snap.docs.map(async (d) => {
        const r = d.data();
        const [reports, hist] = await Promise.all([
          (r.reportsOpen ?? 0) > 0 ? d.ref.collection("reports").where("status", "==", "open").get() : Promise.resolve(null),
          (r.historyCount ?? 0) > 0 ? d.ref.collection("private").doc("history").get() : Promise.resolve(null),
        ]);
        return {
          id: d.id,
          experienceId: r.experienceId,
          sessionId: r.sessionId,
          userId: r.userId,
          rating: r.rating,
          comment: r.comment ?? "",
          publicName: r.publicName ?? "",
          status: r.status === "hidden" ? "hidden" : r.status === "pending" ? "pending" : "published",
          ...(r.moderation ? { moderation: { why: r.moderation.why ?? null, ...(r.moderation.word ? { word: String(r.moderation.word) } : {}) } } : {}),
          createdAt: iso(r.createdAt),
          sessionStartAt: iso(r.sessionStartAt) || undefined,
          reply: r.reply ? { text: String(r.reply.text ?? ""), authorName: String(r.reply.authorName ?? ""), authorRole: r.reply.authorRole === "team" ? "team" : "organizer", at: iso(r.reply.at) } : null,
          photo: r.photo?.status ? { path: String(r.photo.path ?? ""), status: r.photo.status } : null,
          reportCount: Number(r.reportCount ?? 0),
          reportsOpen: Number(r.reportsOpen ?? 0),
          openReports: (reports?.docs ?? []).map((x) => ({ reason: String(x.get("reason") ?? ""), message: String(x.get("message") ?? ""), byOrganizer: x.get("byOrganizer") === true, at: iso(x.get("createdAt")) })),
          history: ((hist?.get("events") as Record<string, unknown>[] | undefined) ?? []).map((e) => ({ action: String(e.action), at: iso(e.at), byRole: String(e.byRole ?? ""), ...(e.byName ? { byName: String(e.byName) } : {}), ...(e.note ? { note: String(e.note) } : {}) })),
        } satisfies AdminReview;
      }),
    ),
  };
}
