import "server-only";
import { DEFAULT_CANCELLATION_POLICY } from "@thecommunity/shared";
import { getAllCategories, getCities } from "@/lib/data";

/** Étape 20 — options du formulaire d'activité de l'espace organisateur (catégories visibles, villes ouvertes). */
export async function proFormOptions() {
  const [categories, cities] = await Promise.all([getAllCategories(), getCities()]);
  return {
    categories: categories.map((c) => ({ id: c.id, label: c.name.fr, parentId: c.parentId ?? undefined })),
    cities: cities.filter((c) => c.isActive).map((c) => ({ id: c.id, label: c.name.fr })),
    partners: [] as { id: string; label: string }[],
    policies: [{ id: DEFAULT_CANCELLATION_POLICY.id, label: DEFAULT_CANCELLATION_POLICY.label.fr }],
  };
}

export const EXPERIENCE_STATUS_PRO: Record<string, { label: string; tone: "green" | "gray" | "amber" | "red" | "plum" }> = {
  draft: { label: "Brouillon", tone: "gray" },
  pending_review: { label: "En relecture", tone: "amber" },
  published: { label: "En ligne", tone: "green" },
  rejected: { label: "À corriger", tone: "red" },
  archived: { label: "Archivée", tone: "gray" },
};
