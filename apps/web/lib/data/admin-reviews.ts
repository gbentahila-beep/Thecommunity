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
export async function getAdminReviews(): Promise<{ reviews: (Review & { sessionStartAt?: string })[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { reviews: DEMO_REVIEWS.map((r) => ({ ...r, status: "published" as const })), isDemo: true };
  await requireAdmin();
  const snap = await adminDb().collection("reviews").orderBy("createdAt", "desc").limit(300).get();
  return {
    isDemo: false,
    reviews: snap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        experienceId: r.experienceId,
        sessionId: r.sessionId,
        userId: r.userId,
        rating: r.rating,
        comment: r.comment ?? "",
        publicName: r.publicName ?? "",
        status: r.status === "hidden" ? "hidden" : "published",
        createdAt: iso(r.createdAt),
        sessionStartAt: iso(r.sessionStartAt) || undefined,
      };
    }),
  };
}
