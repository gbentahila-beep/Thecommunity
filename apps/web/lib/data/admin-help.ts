import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

export type PartnerApplication = {
  id: string;
  contactName: string;
  businessName: string;
  type: string;
  city: string;
  email: string;
  phone: string;
  link: string;
  message: string;
  locale: string;
  createdAt: string;
  status: "new" | "converted" | "declined";
  partnerId?: string;
};
export type HelpFeedbackStat = { article: string; yes: number; no: number; last: string };

/** Les 200 dernières candidatures partenaires (formulaire public « Devenir partenaire »). */
export async function getPartnerApplications(): Promise<{ applications: PartnerApplication[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { applications: [], isDemo: true };
  await requireAdmin();
  const snap = await adminDb().collection("partnerApplications").orderBy("createdAt", "desc").limit(200).get();
  return {
    isDemo: false,
    applications: snap.docs.map((d) => {
      const r = d.data();
      const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
      return {
        id: d.id,
        contactName: s("contactName"),
        businessName: s("businessName"),
        type: s("type"),
        city: s("city"),
        email: s("email"),
        phone: s("phone"),
        link: s("link"),
        message: s("message"),
        locale: s("locale"),
        createdAt: iso(r.createdAt),
        status: r.status === "converted" || r.status === "declined" ? r.status : "new",
        ...(r.partnerId ? { partnerId: String(r.partnerId) } : {}),
      };
    }),
  };
}

/** Retours « Cet article vous a-t-il aidé ? » agrégés par article (2 000 derniers). */
export async function getHelpFeedbackStats(): Promise<{ stats: HelpFeedbackStat[]; total: number; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { stats: [], total: 0, isDemo: true };
  await requireAdmin();
  const snap = await adminDb().collection("helpFeedback").orderBy("createdAt", "desc").limit(2000).get();
  const by = new Map<string, HelpFeedbackStat>();
  for (const d of snap.docs) {
    const r = d.data();
    const article = String(r.article ?? "");
    const s = by.get(article) ?? { article, yes: 0, no: 0, last: iso(r.createdAt) };
    if (r.helpful === true) s.yes++;
    else s.no++;
    by.set(article, s);
  }
  return { stats: [...by.values()].sort((a, b) => b.no - a.no || b.yes + b.no - (a.yes + a.no)), total: snap.size, isDemo: false };
}
