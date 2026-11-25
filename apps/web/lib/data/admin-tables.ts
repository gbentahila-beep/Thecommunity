import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * Refonte de la composition des tables (25/11) : le profil complet des participants d'une date, pour que l'équipe
 * puisse retoucher les tables en connaissance de cause — réponses d'inscription, régime, historique (sorties,
 * absences) et personnes déjà rencontrées. Lu seulement pour les participants de la date (équipe uniquement).
 */
export type TableProfile = {
  profession: string; bio: string; sector: string; district: string; socialGoals: string[]; groupVibe: string; conversationStyle: number | null;
  humor: string; lifeValues: string[]; venueBudget: string; diets: string[]; agePreference: string; createdAt: string;
  outings: number; noShows: number; metUids: string[];
};

export async function getTableProfiles(sessionId: string, uids: string[]): Promise<Record<string, TableProfile>> {
  const out: Record<string, TableProfile> = {};
  if (!FIREBASE_ENABLED || uids.length === 0) return out;
  const db = adminDb();
  const users = await db.getAll(...uids.map((u) => db.doc(`users/${u}`)));
  const now = Date.now();
  await Promise.all(uids.map(async (uid, i) => {
    const u = users[i]?.data() ?? {};
    const [res, groups] = await Promise.all([
      db.collection("reservations").where("userId", "==", uid).get(),
      db.collection("groups").where("memberIds", "array-contains", uid).get(),
    ]);
    const past = res.docs.filter((d) => d.get("sessionId") !== sessionId && (d.get("sessionSnapshot.startAt")?.toMillis?.() ?? 0) < now);
    const met = new Set<string>();
    for (const g of groups.docs) {
      if (g.get("sessionId") === sessionId) continue;
      for (const m of (g.get("memberIds") ?? []) as string[]) if (m !== uid) met.add(m);
    }
    const created = u.createdAt?.toDate?.() as Date | undefined;
    out[uid] = {
      profession: String(u.profession ?? ""), bio: String(u.bio ?? ""), sector: String(u.sector ?? ""), district: String(u.district ?? ""),
      socialGoals: (u.socialGoals ?? []) as string[], groupVibe: String(u.groupVibe ?? ""), conversationStyle: typeof u.conversationStyle === "number" ? u.conversationStyle : null,
      humor: String(u.humor ?? ""), lifeValues: (u.lifeValues ?? []) as string[], venueBudget: String(u.venueBudget ?? ""), diets: (u.diets ?? []) as string[],
      agePreference: String(u.agePreference ?? ""), createdAt: created ? created.toISOString() : "",
      outings: past.filter((d) => ["confirmed", "attended", "completed"].includes(String(d.get("status")))).length,
      noShows: past.filter((d) => d.get("status") === "no_show").length,
      metUids: [...met].filter((m) => uids.includes(m)),
    };
  }));
  return out;
}
