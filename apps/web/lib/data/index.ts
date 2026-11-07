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
import { buildDemoSessions, DEMO_CATEGORIES, DEMO_CITIES, DEMO_EXPERIENCES, DEMO_REVIEWS } from "./demo";

export const IS_DEMO = true;

export type SessionWithExperience = Session & { experience: Experience };

export type WhenFilter = "all" | "today" | "weekend" | "week";

export async function getCities() {
  return [...DEMO_CITIES].sort((a, b) => a.order - b.order);
}

export async function getCity(id: string) {
  return DEMO_CITIES.find((c) => c.id === id) ?? null;
}

export async function getCategories() {
  return DEMO_CATEGORIES.filter((c) => c.isActive).sort((a, b) => a.order - b.order);
}

export async function getCategory(id: string) {
  return DEMO_CATEGORIES.find((c) => c.id === id) ?? null;
}

export async function getExperienceBySlug(slug: string) {
  return DEMO_EXPERIENCES.find((e) => e.slug === slug && e.status === "published") ?? null;
}

export async function getPublishedExperiences() {
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
  const [session] = withExperience(buildDemoSessions().filter((s) => s.id === id));
  return session ?? null;
}

export async function getReviews(experienceId?: string) {
  return DEMO_REVIEWS.filter((r) => !experienceId || r.experienceId === experienceId);
}
