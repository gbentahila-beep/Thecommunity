import { audienceRefusal } from "./meeting";
import type { Experience, Session } from "./types";

/**
 * Étape 30 — suggestions « Pour vous » : univers préférés (déclarés au profil) d'abord, puis les centres d'intérêt,
 * puis le quartier. Jamais une expérience déjà réservée, complète, ou réservée aux femmes pour qui ne l'est pas.
 */
export const INTEREST_TO_CATEGORY: Record<string, string[]> = {
  gastronomy: ["eat"], sport: ["move"], wellness: ["move"], games: ["play"], art: ["create"],
  culture: ["create", "discover", "learn"], music: ["discover", "play"], nightlife: ["discover", "meet"], discovery: ["discover"], travel: ["discover", "meet"],
  cooking: ["eat", "create"], coffee: ["eat"], restaurants: ["eat"], pastry: ["eat", "create"],
  live_music: ["discover"], festivals: ["discover"], museums: ["learn", "discover"], theatre: ["discover", "learn"], comedy: ["discover"], dancing: ["discover", "move"], cinema: ["discover", "learn"],
  photography: ["create", "discover"], design: ["create"], writing: ["create", "learn"], fashion: ["create"], architecture: ["discover", "learn"], crafts: ["create"],
  running: ["move"], cycling: ["move"], football: ["move", "play"], hiking: ["move"], yoga: ["move"], padel: ["move"], swimming: ["move"],
  books: ["learn"], languages: ["meet", "learn"], tech: ["learn"], history: ["learn", "discover"], business: ["meet"], science: ["learn"], volunteering: ["meet"],
};

export type RecoProfile = { interests?: string[]; favoriteCategories?: string[]; district?: string | null; gender?: string | null };

export function recommendFor<S extends Session & { experience: Experience }>(p: RecoProfile, sessions: S[], opts: { exclude?: Set<string>; limit?: number } = {}): S[] {
  const fav = new Set(p.favoriteCategories ?? []);
  const fromInterests = new Set((p.interests ?? []).flatMap((i) => INTEREST_TO_CATEGORY[i] ?? []));
  const district = (p.district ?? "").trim().toLowerCase();
  const seen = new Set<string>();
  return sessions
    .filter((s) => {
      if (seen.has(s.experienceId) || opts.exclude?.has(s.experienceId) || s.status === "full") return false;
      if (audienceRefusal(s.experience.audience, p.gender)) return false;
      seen.add(s.experienceId);
      return true;
    })
    .map((s) => {
      const cats = [s.categoryId, s.experience.categoryId, s.experience.subcategoryId].filter(Boolean) as string[];
      const score = (cats.some((c) => fav.has(c)) ? 3 : 0) + (cats.some((c) => fromInterests.has(c)) ? 2 : 0) + (district && s.experience.district.toLowerCase() === district ? 1 : 0);
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.startAt.localeCompare(b.s.startAt))
    .slice(0, opts.limit ?? 4)
    .map((x) => x.s);
}
