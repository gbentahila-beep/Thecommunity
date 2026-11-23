import { recommendFor } from "@thecommunity/shared";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getNextSessionPerExperience } from "@/lib/data";
import { adminDb } from "@/lib/firebase/admin";
import { formatShortSlot } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

/**
 * Étape 30 — suggestions « Pour vous » de la personne connectée (univers préférés, centres d'intérêt, quartier),
 * sans ce qu'elle a déjà réservé. Jamais mis en cache partagé (réponse propre à chacun).
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("locale");
  const locale = raw === "ar" || raw === "en" ? raw : "fr";
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const db = adminDb();
  const [profile, res] = await Promise.all([db.doc(`users/${user.uid}`).get(), db.collection("reservations").where("userId", "==", user.uid).get()]);
  const p = profile.data() ?? {};
  const booked = new Set(res.docs.filter((d) => d.get("status") !== "cancelled").map((d) => String(d.get("experienceId"))));
  const sessions = await getNextSessionPerExperience({ cityId: String(p.cityId ?? "casablanca") });
  const items = recommendFor({ interests: p.interests, favoriteCategories: p.favoriteCategories, district: p.district, gender: p.gender }, sessions, { exclude: booked, limit: 4 }).map((s) => ({
    href: `/experiences/${s.experience.slug}`,
    title: tr(s.experience.title, locale),
    detail: [s.experience.district, formatShortSlot(s.startAt, locale)].filter(Boolean).join(" · "),
    image: s.experience.images[0]?.path ?? "",
  }));
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}
