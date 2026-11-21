/**
 * Couche d'accès aux données. Toutes les pages passent par ces fonctions :
 * en phase 3, seules leurs implémentations changeront (lecture Firestore via l'Admin SDK),
 * pas les pages.
 */
import {
  applyCatalog,
  crowdSummary,
  DEFAULT_HOME_SETTINGS,
  experienceSearchFields,
  MOROCCO_TIMEZONE,
  queryTokens,
  searchScore,
  zonedDateTimeToUtc,
  zonedParts,
  type CatalogFilters,
  type Category,
  type Crowd,
  type CategoryKey,
  type Experience,
  type HomeSettings,
  type Organizer,
  type Session,
} from "@thecommunity/shared";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { buildDemoSessions, DEMO_CATEGORIES, DEMO_CITIES, DEMO_EXPERIENCES, DEMO_MEMBERSHIP_PLAN, DEMO_REVIEWS } from "./demo";
import { DEMO_ORGANIZER } from "./demo-organizer";
import * as fs from "./firestore-source";

/**
 * Bandeau « démonstration » : toujours affiché sans Firebase ; avec Firebase, affiché tant que
 * NEXT_PUBLIC_DEMO_BANNER n'est pas explicitement mis à "false" (au lancement).
 */
export const IS_DEMO = !FIREBASE_ENABLED || process.env.NEXT_PUBLIC_DEMO_BANNER !== "false";

export type SessionWithExperience = Session & { experience: Experience };

export type WhenFilter = "all" | "today" | "weekend" | "week";

export async function getCities() {
  if (FIREBASE_ENABLED) return fs.fsCities();
  return [...DEMO_CITIES].sort((a, b) => a.order - b.order);
}

export async function getCity(id: string) {
  if (FIREBASE_ENABLED) return (await fs.fsCities()).find((c) => c.id === id) ?? null;
  return DEMO_CITIES.find((c) => c.id === id) ?? null;
}

/** Toutes les catégories visibles (principales et sous-catégories), triées. */
async function activeCategories(): Promise<Category[]> {
  if (FIREBASE_ENABLED) return fs.fsCategories();
  return DEMO_CATEGORIES.filter((c) => c.isActive).sort((a, b) => a.order - b.order);
}

/** Univers / catégories principales visibles (menu, accueil, puces). Étape 19 : dynamiques. */
export async function getCategories() {
  return (await activeCategories()).filter((c) => !c.parentId);
}

/** Sous-catégories visibles d'une catégorie principale. */
export async function getSubcategories(parentId: string) {
  return (await activeCategories()).filter((c) => c.parentId === parentId);
}

/** Catégorie ou sous-catégorie visible (page /ville/catégorie). */
export async function getCategory(id: string) {
  return (await activeCategories()).find((c) => c.id === id) ?? null;
}

/** Toutes les catégories visibles, principales et sous-catégories (plan du site, libellés). */
export async function getAllCategories() {
  return activeCategories();
}

export async function getExperienceBySlug(slug: string) {
  if (FIREBASE_ENABLED) return fs.fsExperienceBySlug(slug);
  return DEMO_EXPERIENCES.find((e) => e.slug === slug && e.status === "published") ?? null;
}

/** Expérience archivée par l'équipe : la fiche indique qu'elle n'est plus proposée (pas de démo archivée). */
export async function getArchivedExperience(slug: string) {
  if (FIREBASE_ENABLED) return fs.fsArchivedExperienceBySlug(slug);
  return null;
}

/** Expériences archivées (aucune en démonstration). */
export async function getArchivedExperiences(): Promise<Experience[]> {
  if (FIREBASE_ENABLED) return fs.fsArchivedExperiences();
  return [];
}

export async function getPublishedExperiences() {
  if (FIREBASE_ENABLED) return fs.fsPublishedExperiences();
  return DEMO_EXPERIENCES.filter((e) => e.status === "published");
}

function withExperience(sessions: Session[]): SessionWithExperience[] {
  const byId = new Map(DEMO_EXPERIENCES.map((e) => [e.id, e]));
  return sessions.flatMap((s) => {
    const experience = byId.get(s.experienceId);
    return experience && experience.status === "published" ? [{ ...s, experience }] : [];
  });
}

/** Bornes [début, fin[ d'un filtre temporel, calculées en heure de Casablanca. */
function windowFor(when: WhenFilter, now: Date): [number, number] {
  const tz = MOROCCO_TIMEZONE;
  const p = zonedParts(now, tz);
  const startOfDay = (offsetDays: number) => {
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays));
    return zonedDateTimeToUtc(
      { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: 0, minute: 0 },
      tz,
    ).getTime();
  };
  const t = now.getTime();
  switch (when) {
    case "today":
      return [t, startOfDay(1)];
    case "weekend": {
      const toSaturday = p.weekday === 0 ? -1 : 6 - p.weekday;
      return [Math.max(t, startOfDay(toSaturday)), startOfDay(toSaturday + 2)];
    }
    case "week":
      return [t, startOfDay(7)];
    default:
      return [t, Number.POSITIVE_INFINITY];
  }
}

export async function getUpcomingSessions(filters: {
  cityId?: string;
  categoryId?: CategoryKey;
  /** Étape 19 : sous-catégorie (filtrée sur l'expérience). */
  subcategoryId?: string;
  experienceId?: string;
  when?: WhenFilter;
  limit?: number;
  now?: Date;
} = {}): Promise<SessionWithExperience[]> {
  const now = filters.now ?? new Date();
  const [from, to] = windowFor(filters.when ?? "all", now);
  if (FIREBASE_ENABLED) {
    // Début de fenêtre arrondi à la minute : la clé du cache reste stable entre deux visites.
    const sessions = await fs.fsUpcomingSessions({ cityId: filters.cityId, categoryId: filters.categoryId, experienceId: filters.experienceId, from: Math.floor(from / 60_000) * 60_000, to });
    const exps = await fs.fsExperiencesByIds(sessions.map((s) => s.experienceId));
    const joined = sessions.flatMap((s) => (exps.has(s.experienceId) ? [{ ...s, experience: exps.get(s.experienceId)! }] : []))
      .filter((s) => !filters.subcategoryId || s.experience.subcategoryId === filters.subcategoryId);
    return filters.limit ? joined.slice(0, filters.limit) : joined;
  }
  const result = withExperience(buildDemoSessions(now)).filter((s) => {
    const t = new Date(s.startAt).getTime();
    return (
      (s.status === "published" || s.status === "full") &&
      t >= from &&
      t < to &&
      (!filters.cityId || s.cityId === filters.cityId) &&
      (!filters.categoryId || s.categoryId === filters.categoryId) &&
      (!filters.subcategoryId || s.experience.subcategoryId === filters.subcategoryId) &&
      (!filters.experienceId || s.experienceId === filters.experienceId)
    );
  });
  return filters.limit ? result.slice(0, filters.limit) : result;
}

/** Une carte par expérience : sa prochaine date (pour les grilles du catalogue). */
export async function getNextSessionPerExperience(filters: Parameters<typeof getUpcomingSessions>[0] = {}) {
  const sessions = await getUpcomingSessions({ ...filters, limit: undefined });
  const seen = new Set<string>();
  const result = sessions.filter((s) => {
    if (seen.has(s.experienceId)) return false;
    seen.add(s.experienceId);
    return true;
  });
  return filters.limit ? result.slice(0, filters.limit) : result;
}

export async function getSession(id: string) {
  if (FIREBASE_ENABLED) {
    const s = await fs.fsSession(id);
    if (!s) return null;
    const e = (await fs.fsExperiencesByIds([s.experienceId])).get(s.experienceId);
    return e ? { ...s, experience: e } : null;
  }
  const [session] = withExperience(buildDemoSessions().filter((s) => s.id === id));
  return session ?? null;
}

/** Comme getSession, mais avec les places restantes à jour (pas de cache) : tunnel de réservation. */
export async function getSessionForBooking(id: string) {
  if (!FIREBASE_ENABLED) return getSession(id);
  const s = await fs.fsSessionFresh(id);
  if (!s) return null;
  const e = (await fs.fsExperiencesByIds([s.experienceId])).get(s.experienceId);
  return e ? { ...s, experience: e } : null;
}

/**
 * Expériences publiées SANS date à venir (jamais programmées, ou déjà vécues) : elles restent listées
 * avec leurs avis, en attendant de nouvelles dates.
 */
export async function getExperiencesWithoutUpcoming(filters: { cityId?: string; categoryId?: CategoryKey } = {}) {
  const [experiences, upcoming] = await Promise.all([getPublishedExperiences(), getUpcomingSessions({ ...filters, limit: undefined })]);
  const withDates = new Set(upcoming.map((s) => s.experienceId));
  return experiences
    .filter((e) => !withDates.has(e.id) && (!filters.cityId || e.cityId === filters.cityId) && (!filters.categoryId || e.categoryId === filters.categoryId))
    .sort((a, b) => b.ratingCount - a.ratingCount || a.title.fr.localeCompare(b.title.fr));
}

/** Dates passées d'une expérience (« éditions passées »), la plus récente d'abord. */
export async function getPastSessions(experienceId: string) {
  if (FIREBASE_ENABLED) return fs.fsPastSessions(experienceId, Math.floor(Date.now() / 3_600_000) * 3_600_000);
  return [] as Session[];
}

/** Formule d'abonnement proposée (null si l'équipe ne l'a pas activée). */
export async function getMembershipPlan() {
  if (FIREBASE_ENABLED) return fs.fsMembershipPlan();
  return DEMO_MEMBERSHIP_PLAN;
}

/** Page « Avis » : tous les avis publiés (récents d'abord). */
export async function getAllReviews() {
  if (FIREBASE_ENABLED) return fs.fsAllReviews();
  return [...DEMO_REVIEWS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReviews(experienceId?: string) {
  if (FIREBASE_ENABLED) return fs.fsReviews(experienceId);
  return DEMO_REVIEWS.filter((r) => !experienceId || r.experienceId === experienceId);
}

/* ——— Étape 23 : accueil modifiable, organisateurs, catalogue filtré, recherche ——— */

/** Réglages de l'accueil (settings/home) ; démonstration : l'accueil par défaut. */
export async function getHomeSettings(): Promise<HomeSettings> {
  if (FIREBASE_ENABLED) return fs.fsHomeSettings();
  return DEFAULT_HOME_SETTINGS;
}

/** Back-office : réglages de l'accueil sans cache. */
export async function getHomeSettingsFresh(): Promise<HomeSettings> {
  if (FIREBASE_ENABLED) return fs.fsHomeSettingsFresh();
  return DEFAULT_HOME_SETTINGS;
}

/** Organisateurs validés (profil public). */
export async function getPublicOrganizers(): Promise<Organizer[]> {
  if (FIREBASE_ENABLED) return fs.fsPublicOrganizers();
  return [DEMO_ORGANIZER];
}

export async function getPublicOrganizerBySlug(slug: string) {
  return (await getPublicOrganizers()).find((o) => o.slug === slug) ?? null;
}

export async function getPublicOrganizer(id: string | null | undefined) {
  if (!id) return null;
  return (await getPublicOrganizers()).find((o) => o.id === id) ?? null;
}

/** Ce que la recherche sait d'une expérience en plus de ses textes : noms de ses catégories, de son organisateur. */
async function searchExtras() {
  const [categories, organizers] = await Promise.all([activeCategories(), getPublicOrganizers()]);
  const catNames = new Map(categories.map((c) => [c.id, [c.name.fr, c.name.ar, c.name.en, c.shortName.fr, c.shortName.en].filter(Boolean).join(" ")]));
  const orgNames = new Map(organizers.map((o) => [o.id, o.name]));
  return (e: Experience) => ({
    categoryNames: [catNames.get(e.categoryId), e.subcategoryId ? catNames.get(e.subcategoryId) : undefined].filter((x): x is string => Boolean(x)),
    organizerName: e.organizerId ? orgNames.get(e.organizerId) : undefined,
  });
}

/** Catalogue filtré et trié (une carte par expérience : la première date qui correspond). */
export async function getCatalog(input: { cityId: string; categoryId?: CategoryKey; when: WhenFilter; filters: CatalogFilters }) {
  const [sessions, undated, extras, home] = await Promise.all([
    getUpcomingSessions({ cityId: input.cityId, categoryId: input.categoryId, when: input.when }),
    input.when === "all" ? getExperiencesWithoutUpcoming({ cityId: input.cityId, categoryId: input.categoryId }) : Promise.resolve([]),
    searchExtras(),
    getHomeSettings(),
  ]);
  return applyCatalog({ sessions, undated, filters: input.filters, extras, featuredIds: home.featuredExperienceIds });
}

export type SearchSuggestion =
  | { kind: "experience"; label: string; href: string; detail: string }
  | { kind: "category"; label: string; href: string }
  | { kind: "organizer"; label: string; href: string };

/** Suggestions de la barre de recherche : expériences (6 au plus), catégories (3), organisateurs (3). */
export async function getSearchSuggestions(q: string, locale: "fr" | "ar" | "en", cityId: string): Promise<SearchSuggestion[]> {
  const tokens = queryTokens(q);
  if (tokens.length === 0) return [];
  const [experiences, categories, organizers, extras] = await Promise.all([getPublishedExperiences(), activeCategories(), getPublicOrganizers(), searchExtras()]);
  const name = (t: { fr: string; ar?: string; en?: string }) => t[locale] || t.fr;
  const exps = experiences
    .map((e) => ({ e, score: searchScore(tokens, experienceSearchFields(e, extras(e))) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.e.ratingCount - a.e.ratingCount)
    .slice(0, 6)
    .map(({ e }) => ({ kind: "experience" as const, label: name(e.title), href: `/experiences/${e.slug}`, detail: e.district }));
  const cats = categories
    .map((c) => ({ c, score: searchScore(tokens, [{ text: [c.name.fr, c.name.ar, c.name.en, c.shortName.fr].filter(Boolean).join(" "), weight: 1 }]) }))
    .filter((x) => x.score > 0)
    .slice(0, 3)
    .map(({ c }) => ({ kind: "category" as const, label: name(c.name), href: `/${cityId}/${c.id}` }));
  const orgs = organizers
    .filter((o) => searchScore(tokens, [{ text: o.name, weight: 1 }]) > 0)
    .slice(0, 3)
    .map((o) => ({ kind: "organizer" as const, label: o.name, href: `/organisateurs/${o.slug}` }));
  return [...exps, ...cats, ...orgs];
}

/** Logo affichable publiquement : seulement depuis le dossier public de l'organisateur (jamais ses envois privés). */
export function publicLogo(path: string | null | undefined): string | null {
  return path && (path.startsWith("organizers/") || path.startsWith("/")) ? path : null;
}

/** Étape 28 : moyen de paiement ouvert sur le site (les textes d'aide et « À propos » en dépendent). */
export async function getPaymentMethod(): Promise<"card" | "bank_transfer" | "none"> {
  if (FIREBASE_ENABLED) return fs.fsPaymentMethod();
  return "none";
}

/** Étape 29 : chiffres globaux sur les inscrits d'une date (à partir de 4 inscrits). Démonstration : participants fictifs. */
export async function getSessionCrowd(sessionId: string | null | undefined): Promise<Crowd | null> {
  if (!sessionId) return null;
  if (FIREBASE_ENABLED) return fs.fsSessionCrowd(sessionId);
  const { buildAdminData } = await import("./demo-admin");
  const d = buildAdminData(new Date());
  const uids = new Set(d.reservations.filter((r) => r.sessionId === sessionId && (r.status === "confirmed" || r.status === "attended")).map((r) => r.userId));
  return crowdSummary(d.users.filter((u) => uids.has(u.uid)).map((u) => ({ birthDate: u.birthDate, interests: u.interests })), new Date());
}
