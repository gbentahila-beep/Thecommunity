/**
 * Étape 6 — composition des tables / équipes. Algorithme déterministe (mêmes entrées → mêmes groupes),
 * proposé à l'équipe qui valide toujours avant la révélation.
 *
 * Critères (du plus important au moins important) :
 *  1. tailles proches de la cible, jamais au-dessus du maximum ;
 *  2. au moins une langue commune à toute la table ;
 *  3. ne pas remettre ensemble des personnes déjà attablées ensemble ;
 *  4. écart d'âge raisonnable ;
 *  5. équilibre femmes / hommes quand le genre est connu ;
 *  6. centres d'intérêt partagés (bonus) ;
 *  7. (18a) réponses au questionnaire de l'expérience : réunir les réponses proches (« same » : niveau de padel,
 *     allure de course) ou les mélanger (« mix » : expérience au paintball, timides et bavards à table).
 * Une réservation de plusieurs places (amis) reste à la même table.
 */
import type { QuestionKind, QuestionMatch } from "./questionnaire";

export type MatchPerson = {
  uid: string;
  /** Places de la réservation (la personne + ses invités). */
  seats: number;
  age: number | null;
  gender?: "female" | "male" | "undisclosed";
  languages: string[];
  interests: string[];
  /** Réponses au questionnaire de l'expérience (numéro de la réponse par question). */
  answers?: Record<string, number>;
  /** Étape 30 : « plutôt des personnes de mon âge » (préférence souple) ; niveau sportif 1 à 3 (activités physiques). */
  agePreference?: "any" | "similar";
  sportLevel?: number | null;
};
/** Question du questionnaire utile au calcul (18a). */
export type MatchQuestion = { id: string; kind: QuestionKind; match: QuestionMatch };
export type MatchConfig = { minSize: number; targetSize: number; maxSize: number };
/** avoidPairs (étape 31) : personnes qui ont demandé à ne plus être réunies — jamais à la même table si possible. */
export type MatchOptions = { pastPairs?: Set<string>; questions?: MatchQuestion[]; avoidPairs?: Set<string> };

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Nombre de tables : le plus proche de la cible, en respectant le maximum par table. */
export function groupCount(totalSeats: number, c: MatchConfig): number {
  if (totalSeats <= 0) return 0;
  let n = Math.max(1, Math.round(totalSeats / c.targetSize));
  while (totalSeats / n > c.maxSize) n++;
  while (n > 1 && totalSeats / n < c.minSize && totalSeats / (n - 1) <= c.maxSize) n--;
  return n;
}

const seatsOf = (g: MatchPerson[]) => g.reduce((a, p) => a + p.seats, 0);

/** Langue commune à toute la table (une personne sans langue renseignée ne bloque pas). */
export function hasCommonLanguage(g: { languages: string[] }[]): boolean {
  const known = g.filter((p) => p.languages.length > 0);
  if (known.length < 2) return true;
  return known[0]!.languages.some((l) => known.every((p) => p.languages.includes(l)));
}

/** Coût d'une table (plus bas = mieux). Exporté pour l'affichage des alertes et les tests. */
export function groupCost(g: MatchPerson[], c: MatchConfig, o: MatchOptions = {}): number {
  if (g.length === 0) return 0;
  const size = seatsOf(g);
  let cost = 5 * Math.abs(size - c.targetSize);
  if (size > c.maxSize) cost += 400 * (size - c.maxSize);
  if (size < c.minSize) cost += 60 * (c.minSize - size);
  if (!hasCommonLanguage(g)) cost += 150;
  if (o.pastPairs) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (o.pastPairs.has(pairKey(g[i]!.uid, g[j]!.uid))) cost += 40;
  }
  if (o.avoidPairs) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (o.avoidPairs.has(pairKey(g[i]!.uid, g[j]!.uid))) cost += 2000;
  }
  const ages = g.map((p) => p.age).filter((a): a is number => a !== null);
  if (ages.length > 1) {
    // Étape 30 : si quelqu'un préfère des personnes de son âge, l'écart toléré se resserre.
    const similar = g.some((p) => p.agePreference === "similar");
    cost += (similar ? 4 : 2) * Math.max(0, Math.max(...ages) - Math.min(...ages) - (similar ? 8 : 12));
  }
  const levels = g.map((p) => p.sportLevel).filter((l): l is number => typeof l === "number");
  if (levels.length > 1) cost += 15 * Math.max(0, Math.max(...levels) - Math.min(...levels) - 1);
  const women = g.filter((p) => p.gender === "female").reduce((a, p) => a + p.seats, 0);
  const men = g.filter((p) => p.gender === "male").reduce((a, p) => a + p.seats, 0);
  if (women + men >= 4) cost += 3 * Math.max(0, Math.abs(women - men) - 2);
  const counts = new Map<string, number>();
  for (const p of g) for (const i of p.interests) counts.set(i, (counts.get(i) ?? 0) + 1);
  cost -= [...counts.values()].filter((n) => n >= 2).length;
  cost += questionnaireCost(g, o.questions);
  return cost;
}

/**
 * Coût lié au questionnaire (18a), par paire de personnes ayant répondu.
 * « same » + réponses ordonnées : 25 par cran d'écart (un débutant et un confirmé au même terrain = 50) ;
 * « same » + choix : 8 si les réponses diffèrent ; « mix » : 4 si les réponses sont identiques.
 */
export function questionnaireCost(g: Pick<MatchPerson, "answers">[], questions: MatchQuestion[] = []): number {
  let cost = 0;
  for (const q of questions) {
    if (q.match === "none") continue;
    const values = g.map((p) => p.answers?.[q.id]).filter((a): a is number => typeof a === "number");
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const a = values[i]!;
        const b = values[j]!;
        if (q.match === "same") cost += q.kind === "ordered" ? 25 * Math.abs(a - b) : a === b ? 0 : 8;
        else if (a === b) cost += 4;
      }
    }
  }
  return cost;
}

/** Propose des groupes (listes d'uid). */
export function composeGroups(people: MatchPerson[], c: MatchConfig, o: MatchOptions = {}): string[][] {
  const total = people.reduce((a, p) => a + p.seats, 0);
  const n = groupCount(total, c);
  if (n === 0) return [];
  const groups: MatchPerson[][] = Array.from({ length: n }, () => []);
  // Les réservations à plusieurs places d'abord, puis les langues les plus rares (plus dures à placer).
  const freq = new Map<string, number>();
  for (const p of people) for (const l of p.languages) freq.set(l, (freq.get(l) ?? 0) + 1);
  const rarity = (p: MatchPerson) => Math.min(...p.languages.map((l) => freq.get(l) ?? 0), Infinity);
  const order = [...people].sort((a, b) => b.seats - a.seats || rarity(a) - rarity(b) || (a.age ?? 0) - (b.age ?? 0) || a.uid.localeCompare(b.uid));
  const cap = Math.ceil(total / n);
  for (const p of order) {
    let best = 0;
    let bestDelta = Infinity;
    groups.forEach((g, i) => {
      const over = seatsOf(g) + p.seats > Math.max(cap, p.seats) ? 1000 : 0;
      const delta = groupCost([...g, p], c, o) - groupCost(g, c, o) + over;
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    });
    groups[best]!.push(p);
  }
  // Améliorations locales, une à la fois : échanger deux personnes (même nombre de places) entre deux tables,
  // ou déplacer une personne. On s'arrête quand plus rien n'améliore (ou après 300 essais réussis).
  const tryImprove = (): boolean => {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        const A = groups[a]!;
        const B = groups[b]!;
        const before = groupCost(A, c, o) + groupCost(B, c, o);
        for (let i = 0; i < A.length; i++) {
          if (a < b) {
            for (let j = 0; j < B.length; j++) {
              if (A[i]!.seats !== B[j]!.seats) continue;
              const nA = [...A.slice(0, i), B[j]!, ...A.slice(i + 1)];
              const nB = [...B.slice(0, j), A[i]!, ...B.slice(j + 1)];
              if (groupCost(nA, c, o) + groupCost(nB, c, o) < before - 1e-9) {
                groups[a] = nA;
                groups[b] = nB;
                return true;
              }
            }
          }
          const nA = [...A.slice(0, i), ...A.slice(i + 1)];
          const nB = [...B, A[i]!];
          if (nA.length && groupCost(nA, c, o) + groupCost(nB, c, o) < before - 1e-9) {
            groups[a] = nA;
            groups[b] = nB;
            return true;
          }
        }
      }
    }
    return false;
  };
  for (let k = 0; k < 300 && tryImprove(); k++);
  return groups.filter((g) => g.length).map((g) => g.map((p) => p.uid));
}

/** Alertes lisibles pour une table (affichées à l'équipe). */
export function groupWarnings(g: MatchPerson[], c: MatchConfig, o: MatchOptions = {}): string[] {
  const out: string[] = [];
  const size = seatsOf(g);
  if (size > c.maxSize) out.push("too_big");
  if (size < c.minSize) out.push("too_small");
  if (!hasCommonLanguage(g)) out.push("no_common_language");
  if (o.pastPairs && g.some((p, i) => g.some((q, j) => j > i && o.pastPairs!.has(pairKey(p.uid, q.uid))))) out.push("already_met");
  if (o.avoidPairs && g.some((p, i) => g.some((q, j) => j > i && o.avoidPairs!.has(pairKey(p.uid, q.uid))))) out.push("avoid_pair");
  const ages = g.map((p) => p.age).filter((a): a is number => a !== null);
  if (ages.length > 1 && Math.max(...ages) - Math.min(...ages) > 20) out.push("age_gap");
  // 18a : niveaux trop éloignés (ex. débutant avec confirmé) sur une question « réunir les réponses proches ».
  for (const q of o.questions ?? []) {
    if (q.match !== "same" || q.kind !== "ordered") continue;
    const values = g.map((p) => p.answers?.[q.id]).filter((a): a is number => typeof a === "number");
    if (values.length > 1 && Math.max(...values) - Math.min(...values) >= 2) {
      out.push("level_gap");
      break;
    }
  }
  if ((o.questions?.length ?? 0) > 0 && g.some((p) => !p.answers || Object.keys(p.answers).length === 0)) out.push("questionnaire_missing");
  return out;
}

/** Plafond de participants par date (décision du 8 novembre : rester à taille humaine). */
export const MAX_SESSION_CAPACITY = 50;

/** Questions pour briser la glace (fiche hôte). */
export const ICEBREAKERS_FR = [
  "Qu'est-ce qui vous a fait dire oui à ce soir ?",
  "Votre endroit préféré à Casablanca, et pourquoi ?",
  "La dernière chose que vous avez apprise pour le plaisir ?",
  "Un voyage qui vous a changé ?",
  "Le plat de votre enfance que vous referiez les yeux fermés ?",
  "Un talent caché que personne ne soupçonne ?",
  "Ce que vous feriez d'une journée entièrement libre ?",
  "Le meilleur conseil qu'on vous ait donné ?",
  "Un livre, un film ou une série que vous recommandez à tout le monde ?",
  "Qu'aimeriez-vous essayer cette année ?",
];
