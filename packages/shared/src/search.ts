/**
 * Étape 23 — recherche tolérante : minuscules, accents et voyelles arabes retirés, formes de l'alif
 * unifiées ; chaque mot cherché doit correspondre à un mot de l'activité (début du mot, ou une faute
 * de frappe au plus pour les mots de 4 lettres et plus : « padle » trouve « padel »).
 */

const STOP_WORDS = new Set([
  "de", "du", "des", "la", "le", "les", "un", "une", "et", "au", "aux", "en", "a", "l", "d",
  "the", "of", "and", "an", "in", "at", "to",
  "في", "من", "على", "و",
]);

/** « Céramique à l'Atelier » → « ceramique a l atelier » ; « الخزَف » → « الخزف ». */
export function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchTokens(s: string): string[] {
  return normalizeSearch(s).split(" ").filter(Boolean);
}

/** Mots utiles d'une recherche (au moins 2 caractères, sans les mots vides). */
export function queryTokens(q: string): string[] {
  return searchTokens(q).filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/** Distance d'édition (deux lettres inversées comptent pour une faute), arrêtée dès qu'elle dépasse `max` (renvoie alors max + 1). */
export function levenshtein(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return Math.min(prev[b.length]!, max + 1);
}

/** 3 = mot identique, 2 = début du mot, 1 = une faute de frappe, 0 = aucun rapport. */
export function tokenMatch(q: string, word: string): number {
  if (word === q) return 3;
  if (word.startsWith(q)) return 2;
  if (q.length >= 4) {
    if (levenshtein(q, word) <= 1) return 1;
    if (word.length > q.length && levenshtein(q, word.slice(0, q.length)) <= 1) return 1;
  }
  return 0;
}

export type SearchField = { text: string; weight: number };

/**
 * Pertinence d'un document pour une recherche : 0 si un des mots cherchés ne correspond à rien
 * (tous les mots doivent être trouvés), sinon la somme des meilleures correspondances pondérées.
 */
export function searchScore(query: string | string[], fields: SearchField[]): number {
  const qs = Array.isArray(query) ? query : queryTokens(query);
  if (qs.length === 0) return 0;
  const words = fields.map((f) => ({ weight: f.weight, tokens: searchTokens(f.text) }));
  let total = 0;
  for (const q of qs) {
    let best = 0;
    for (const f of words) for (const w of f.tokens) best = Math.max(best, tokenMatch(q, w) * f.weight);
    if (best === 0) return 0;
    total += best;
  }
  return total;
}
