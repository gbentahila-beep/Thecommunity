/**
 * docs/25 (24/11) — 3 univers au lancement : Tables (eat), Activités (move : Bouger et Découvrir réunis, le rendez-vous
 * du samedi) et Événements (discover : éditions spéciales). « create » n'est plus proposé ; l'escape game, activité du
 * samedi, passe de Sortir à Activités. Utilisé par la démonstration et par la mise à jour des données (seed-content).
 */
const ACTIVITY_FORMATS: [RegExp, string][] = [
  [/escape/, "escape-game"],
  [/running|course|corniche/, "running"],
  [/yoga/, "yoga"],
  [/c[ée]ramique|poterie/, "ceramique"],
  [/padel/, "padel"],
];

export function launchUniverse(e: { id?: string; slug?: string; categoryId: string; subcategoryId?: string | null; templateId?: string | null }): { categoryId: string; subcategoryId: string | null } {
  const key = [e.templateId, e.subcategoryId, e.slug, e.id].filter(Boolean).join(" ").toLowerCase();
  const format = ACTIVITY_FORMATS.find(([re]) => re.test(key))?.[1] ?? null;
  if (e.categoryId === "create" || (e.categoryId === "discover" && format === "escape-game")) {
    return { categoryId: "move", subcategoryId: format ?? e.subcategoryId ?? null };
  }
  if (e.categoryId === "move" && !e.subcategoryId && format) return { categoryId: "move", subcategoryId: format };
  return { categoryId: e.categoryId, subcategoryId: e.subcategoryId ?? null };
}
