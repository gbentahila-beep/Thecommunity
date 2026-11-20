import { ageOn } from "./profile";
import type { Experience, Interest } from "./types";

/**
 * Étape 29 — « Qui allez-vous rencontrer ? » : ce qu'une fiche peut dire du groupe sans jamais identifier personne.
 * Les chiffres sur les inscrits (tranche d'âge, centres d'intérêt fréquents) ne s'affichent qu'à partir de
 * MEETING_MIN_PARTICIPANTS inscrits, et l'âge est arrondi à 5 ans.
 */

export const AUDIENCES = ["all", "women"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const MEETING_MIN_PARTICIPANTS = 4;

/** Activité réservée aux femmes : seule une personne dont le profil indique « femme » peut réserver. */
export function audienceRefusal(audience: Audience | null | undefined, gender: string | null | undefined): "audience_women_only" | null {
  return audience === "women" && gender !== "female" ? "audience_women_only" : null;
}

export type CrowdPerson = { birthDate?: string | null; interests?: Interest[] | null };

export type MeetingSummary = {
  /** Taille des groupes : [min, max] pour les formats en groupes, sinon nombre de places de la date. */
  groupSize: { min: number; max: number } | null;
  capacity: number | null;
  /** On est placé dans un groupe composé par l'équipe (dîners, groupes). */
  composedGroups: boolean;
  languages: string[];
  audience: Audience;
  targetAge: { min: number | null; max: number | null } | null;
  /** Inscrits à la prochaine date (null si moins de MEETING_MIN_PARTICIPANTS : rien n'est montré). */
  crowd: Crowd | null;
};

export type Crowd = { count: number; ageMin: number | null; ageMax: number | null; topInterests: Interest[] };

/** Chiffres globaux sur les inscrits d'une date (null sous MEETING_MIN_PARTICIPANTS : rien n'est montré). */
export function crowdSummary(people: CrowdPerson[], now: Date): Crowd | null {
  if (people.length < MEETING_MIN_PARTICIPANTS) return null;
  const ages = people.map((p) => (p.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) ? ageOn(p.birthDate, now) : null)).filter((a): a is number => a !== null && a >= 18);
  const counts = new Map<Interest, number>();
  for (const p of people) for (const i of p.interests ?? []) counts.set(i, (counts.get(i) ?? 0) + 1);
  const top = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([i]) => i);
  const enoughAges = ages.length >= MEETING_MIN_PARTICIPANTS;
  return {
    count: people.length,
    ageMin: enoughAges ? Math.floor(Math.min(...ages) / 5) * 5 : null,
    ageMax: enoughAges ? Math.ceil((Math.max(...ages) + 1) / 5) * 5 : null,
    topInterests: top,
  };
}

export function meetingSummary(
  e: Pick<Experience, "bookingMode" | "groupConfig" | "languages"> & { audience?: Audience | null; targetAgeMin?: number | null; targetAgeMax?: number | null },
  session: { capacity: number } | null,
  crowd: Crowd | null,
): MeetingSummary {
  const composed = e.bookingMode === "social_dinner" || e.bookingMode === "group";
  const g = e.groupConfig;
  return {
    groupSize: composed && g ? { min: g.minSize, max: g.maxSize } : null,
    capacity: session?.capacity ?? null,
    composedGroups: composed,
    languages: e.languages ?? [],
    audience: e.audience === "women" ? "women" : "all",
    targetAge: e.targetAgeMin || e.targetAgeMax ? { min: e.targetAgeMin ?? null, max: e.targetAgeMax ?? null } : null,
    crowd,
  };
}
