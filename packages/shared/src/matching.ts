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
 *  6. centres d'intérêt partagés (bonus).
 * Une réservation de plusieurs places (amis) reste à la même table.
 */

export type MatchPerson = {
  uid: string;
  /** Places de la réservation (la personne + ses invités). */
  seats: number;
  age: number | null;
  gender?: "female" | "male" | "undisclosed";
  languages: string[];
  interests: string[];
};
export type MatchConfig = { minSize: number; targetSize: number; maxSize: number };
export type MatchOptions = { pastPairs?: Set<string> };

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
  const ages = g.map((p) => p.age).filter((a): a is number => a !== null);
  if (ages.length > 1) cost += 2 * Math.max(0, Math.max(...ages) - Math.min(...ages) - 12);
  const women = g.filter((p) => p.gender === "female").reduce((a, p) => a + p.seats, 0);
  const men = g.filter((p) => p.gender === "male").reduce((a, p) => a + p.seats, 0);
  if (women + men >= 4) cost += 3 * Math.max(0, Math.abs(women - men) - 2);
  const counts = new Map<string, number>();
  for (const p of g) for (const i of p.interests) counts.set(i, (counts.get(i) ?? 0) + 1);
  cost -= [...counts.values()].filter((n) => n >= 2).length;
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
  const ages = g.map((p) => p.age).filter((a): a is number => a !== null);
  if (ages.length > 1 && Math.max(...ages) - Math.min(...ages) > 20) out.push("age_gap");
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
