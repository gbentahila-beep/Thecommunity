import { MOROCCO_TIMEZONE } from "./constants";
import { searchScore, type SearchField } from "./search";
import { seatsAvailable } from "./seats";
import { zonedParts } from "./time";
import { priceSplit, pricingOf } from "./two-part";
import type { Experience, LocalizedText, Session } from "./types";

/**
 * Étape 23 — catalogue : filtres combinables (recherche, prix, quartier, débutants, format, places
 * disponibles, date), tri, badges. Les paramètres d'adresse sont en français (comme « categorie » et
 * « quand ») : ?q=padel&prix=200&quartier=Maarif&debutant=1&format=seul&dispo=1&date=2026-11-28&tri=prix-croissant
 */

export const CATALOG_SORTS = ["recommended", "date", "price_asc", "price_desc", "rating", "new"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];
const SORT_PARAM: Record<CatalogSort, string> = {
  recommended: "",
  date: "date",
  price_asc: "prix-croissant",
  price_desc: "prix-decroissant",
  rating: "note",
  new: "nouveautes",
};

/** Plafonds proposés (DH, prix total par place). */
export const CATALOG_MAX_PRICES = [100, 200, 300, 500] as const;

/** « Je viens seul·e » : on vous place dans un petit groupe ; « À plusieurs » : réserver plusieurs places. */
export const CATALOG_FORMATS = ["solo", "together"] as const;
export type CatalogFormat = (typeof CATALOG_FORMATS)[number];
const FORMAT_PARAM: Record<CatalogFormat, string> = { solo: "seul", together: "plusieurs" };

export type CatalogFilters = {
  q: string;
  maxPrice: number | null;
  district: string | null;
  beginner: boolean;
  format: CatalogFormat | null;
  available: boolean;
  /** Jour précis (AAAA-MM-JJ, heure de Casablanca). */
  date: string | null;
  sort: CatalogSort;
};

export const EMPTY_CATALOG_FILTERS: CatalogFilters = { q: "", maxPrice: null, district: null, beginner: false, format: null, available: false, date: null, sort: "recommended" };

type Params = Record<string, string | string[] | undefined>;

export function parseCatalogParams(sp: Params): CatalogFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? "") : "").trim();
  };
  const price = Number(one("prix"));
  const format = (Object.keys(FORMAT_PARAM) as CatalogFormat[]).find((f) => FORMAT_PARAM[f] === one("format")) ?? null;
  const sort = (Object.keys(SORT_PARAM) as CatalogSort[]).find((s) => SORT_PARAM[s] && SORT_PARAM[s] === one("tri")) ?? "recommended";
  const date = one("date");
  return {
    q: one("q").slice(0, 80),
    maxPrice: (CATALOG_MAX_PRICES as readonly number[]).includes(price) ? price : null,
    district: one("quartier").slice(0, 60) || null,
    beginner: one("debutant") === "1",
    format,
    available: one("dispo") === "1",
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ? date : null,
    sort,
  };
}

/** Inverse de parseCatalogParams (liens « retirer ce filtre », pagination…). */
export function catalogParams(f: Partial<CatalogFilters>): [string, string][] {
  const out: [string, string][] = [];
  if (f.q) out.push(["q", f.q]);
  if (f.maxPrice) out.push(["prix", String(f.maxPrice)]);
  if (f.district) out.push(["quartier", f.district]);
  if (f.beginner) out.push(["debutant", "1"]);
  if (f.format) out.push(["format", FORMAT_PARAM[f.format]]);
  if (f.available) out.push(["dispo", "1"]);
  if (f.date) out.push(["date", f.date]);
  if (f.sort && f.sort !== "recommended") out.push(["tri", SORT_PARAM[f.sort]]);
  return out;
}

export const sortParam = (s: CatalogSort) => SORT_PARAM[s];
export const formatParam = (f: CatalogFormat) => FORMAT_PARAM[f];

/** Nombre de filtres actifs (hors recherche et tri), pour le bouton « Filtres (n) ». */
export function activeFilterCount(f: CatalogFilters): number {
  return [f.maxPrice, f.district, f.beginner, f.format, f.available, f.date].filter(Boolean).length;
}

/** Prix comparable d'une place : total connu (en ligne + part fixe sur place), sinon la part en ligne. */
export function perSeatPrice(e: Pick<Experience, "price" | "pricing">, session?: Pick<Session, "price"> | null): number {
  const online = (session?.price ?? e.price).amount;
  return priceSplit(online, pricingOf(e)).totalUnit ?? online;
}

const texts = (t: LocalizedText | undefined) => (t ? [t.fr, t.ar, t.en].filter(Boolean).join(" ") : "");

export type SearchExtras = { categoryNames?: string[]; organizerName?: string };

/** Ce que la recherche regarde : titre (fort), catégorie, quartier, organisateur, mots-clés, puis accroche et description. */
export function experienceSearchFields(e: Experience, x: SearchExtras = {}): SearchField[] {
  return [
    { text: texts(e.title), weight: 3 },
    { text: (x.categoryNames ?? []).join(" "), weight: 2 },
    { text: e.district ?? "", weight: 2 },
    { text: x.organizerName ?? "", weight: 2 },
    { text: (e.tags ?? []).join(" "), weight: 2 },
    { text: texts(e.summary), weight: 1 },
    { text: texts(e.description), weight: 1 },
  ];
}

const beginnerFriendly = (e: Experience) => !e.level || e.level === "all" || e.level === "beginner";
const casablancaDay = (iso: string) => {
  const p = zonedParts(new Date(iso), MOROCCO_TIMEZONE);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

export type CatalogEntry = { experience: Experience; session: Session | null; score: number };

/**
 * Applique filtres et tri. `sessions` : dates à venir triées par début (une carte = la PREMIÈRE date qui
 * correspond aux filtres) ; `undated` : expériences sans date à venir (ignorées dès qu'un filtre porte sur
 * les dates : places disponibles ou jour précis).
 */
export function applyCatalog(input: {
  sessions: (Session & { experience: Experience })[];
  undated: Experience[];
  filters: CatalogFilters;
  extras?: (e: Experience) => SearchExtras;
  featuredIds?: string[];
}): { dated: CatalogEntry[]; undated: CatalogEntry[] } {
  const f = input.filters;
  const scoreCache = new Map<string, number>();
  const score = (e: Experience) => {
    if (!f.q) return 1;
    if (!scoreCache.has(e.id)) scoreCache.set(e.id, searchScore(f.q, experienceSearchFields(e, input.extras?.(e))));
    return scoreCache.get(e.id)!;
  };
  const keepExperience = (e: Experience, s: Session | null) =>
    (f.maxPrice == null || perSeatPrice(e, s) <= f.maxPrice * 100) &&
    (!f.district || e.district === f.district) &&
    (!f.beginner || beginnerFriendly(e)) &&
    (!f.format || (f.format === "solo" ? e.bookingMode === "social_dinner" || e.bookingMode === "group" : e.maxSeatsPerBooking >= 2)) &&
    score(e) > 0;
  const keepSession = (s: Session) => (!f.available || (s.status !== "full" && seatsAvailable(s) > 0)) && (!f.date || casablancaDay(s.startAt) === f.date);

  const seen = new Set<string>();
  const dated: CatalogEntry[] = [];
  for (const s of input.sessions) {
    if (seen.has(s.experienceId) || !keepSession(s) || !keepExperience(s.experience, s)) continue;
    seen.add(s.experienceId);
    const { experience, ...session } = s;
    dated.push({ experience, session: session as Session, score: score(experience) });
  }
  const undated: CatalogEntry[] =
    f.available || f.date
      ? []
      : input.undated.filter((e) => !seen.has(e.id) && keepExperience(e, null)).map((e) => ({ experience: e, session: null, score: score(e) }));

  const featured = new Map((input.featuredIds ?? []).map((id, i) => [id, i]));
  const featuredRank = (x: CatalogEntry) => featured.get(x.experience.id) ?? (x.session?.isFeatured ? featured.size : Number.MAX_SAFE_INTEGER);
  const isFull = (x: CatalogEntry) => (x.session ? x.session.status === "full" || seatsAvailable(x.session) === 0 : false);
  const start = (x: CatalogEntry) => x.session?.startAt ?? "9999";
  const byRating = (a: CatalogEntry, b: CatalogEntry) => b.experience.ratingAvg - a.experience.ratingAvg || b.experience.ratingCount - a.experience.ratingCount;
  const compare = (a: CatalogEntry, b: CatalogEntry): number => {
    switch (f.sort) {
      case "date":
        return start(a).localeCompare(start(b));
      case "price_asc":
        return perSeatPrice(a.experience, a.session) - perSeatPrice(b.experience, b.session) || start(a).localeCompare(start(b));
      case "price_desc":
        return perSeatPrice(b.experience, b.session) - perSeatPrice(a.experience, a.session) || start(a).localeCompare(start(b));
      case "rating":
        return byRating(a, b) || start(a).localeCompare(start(b));
      case "new":
        return (b.experience.createdAt ?? "").localeCompare(a.experience.createdAt ?? "") || start(a).localeCompare(start(b));
      default:
        return (
          featuredRank(a) - featuredRank(b) ||
          Number(isFull(a)) - Number(isFull(b)) ||
          (f.q ? b.score - a.score : 0) ||
          start(a).localeCompare(start(b)) ||
          byRating(a, b)
        );
    }
  };
  return { dated: dated.sort(compare), undated: undated.sort(compare) };
}

/** Quartiers proposés dans le filtre (ceux des expériences publiées), triés. */
export function catalogDistricts(experiences: Pick<Experience, "district">[]): string[] {
  return [...new Set(experiences.map((e) => e.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
}

/* ——— Badges ——— */

/** Une expérience publiée depuis moins de 30 jours est « Nouveau ». */
export const NEW_EXPERIENCE_DAYS = 30;
export const POPULAR_MIN_REVIEWS = 10;
export const POPULAR_MIN_RATING = 4.6;
/** Une date remplie aux trois quarts rend l'expérience « Populaire ». */
export const POPULAR_FILL_RATIO = 0.75;

export type ExperienceBadge = "featured" | "new" | "popular";

/** Badge principal d'une carte (un seul, le plus fort) : coup de cœur de l'équipe > nouveau > populaire. */
export function experienceBadge(
  e: Pick<Experience, "id" | "ratingAvg" | "ratingCount"> & { createdAt?: string },
  session: Pick<Session, "isFeatured" | "capacity" | "seatsConfirmed" | "seatsHeld"> | null | undefined,
  now: Date,
  featuredIds: string[] = [],
): ExperienceBadge | null {
  if (featuredIds.includes(e.id) || session?.isFeatured) return "featured";
  const created = e.createdAt ? Date.parse(e.createdAt) : NaN;
  if (!Number.isNaN(created) && now.getTime() - created < NEW_EXPERIENCE_DAYS * 86_400_000 && created <= now.getTime()) return "new";
  if (e.ratingCount >= POPULAR_MIN_REVIEWS && e.ratingAvg >= POPULAR_MIN_RATING) return "popular";
  if (session && session.capacity > 0 && seatsAvailable(session) > 0 && session.seatsConfirmed / session.capacity >= POPULAR_FILL_RATIO) return "popular";
  return null;
}
