import { NextResponse, type NextRequest } from "next/server";
import { getSearchSuggestions } from "@/lib/data";
import { DEFAULT_CITY } from "@/lib/site";

/**
 * Étape 23 — suggestions de la barre de recherche (expériences, catégories, organisateurs).
 * Données publiques seulement ; réponse mise en cache 60 s par le navigateur.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const raw = req.nextUrl.searchParams.get("locale");
  const locale = raw === "ar" || raw === "en" ? raw : "fr";
  const suggestions = q.trim().length < 2 ? [] : await getSearchSuggestions(q, locale, DEFAULT_CITY);
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=60" } });
}
