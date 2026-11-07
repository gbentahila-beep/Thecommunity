/**
 * Couche d'accès aux données. Toutes les pages passent par ces fonctions :
 * en phase 3, seules leurs implémentations changeront (lecture Firestore via l'Admin SDK),
 * pas les pages.
 */
import {
  MOROCCO_TIMEZONE,
  zonedDateTimeToUtc,
  zonedParts,
  type CategoryKey,
  type Experience,
  type Session,
} from "@thecommunity/shared";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { buildDemoSessions, DEMO_CATEGORIES, DEMO_CITIES, DEMO_EXPERIENCES, DEMO_REVIEWS } from "./demo";
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

export async function getCategories() {
  if (FIREBASE_ENABLED) return fs.fsCategories();
  return DEMO_CATEGORIES.filter((c) => c.isActive).sort((a, b) => a.order - b.order);
}

export async function getCategory(id: string) {
  if (FIREBASE_ENABLED) return (await fs.fsCategories()).find((c) => c.id === id) ?? null;
  return DEMO_CATEGORIES.find((c) => c.id === id) ?? null;
}

export async function getExperienceBySlug(slug: string) {
  if (FIREBASE_ENABLED) return fs.fsExperienceBySlug(slug);
  return DEMO_EXPERIENCES.find((e) => e.slug === slug && e.status === "published") ?? null;
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
    const joined = sessions.flatMap((s) => (exps.has(s.experienceId) ? [{ ...s, experience: exps.get(s.experienceId)! }] : []));
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

export async function getReviews(experienceId?: string) {
  if (FIREBASE_ENABLED) return fs.fsReviews(experienceId);
  return DEMO_REVIEWS.filter((r) => !experienceId || r.experienceId === experienceId);
}
