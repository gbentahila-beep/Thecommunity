import "server-only";
import { ORGANIZER_UNIVERSES, PAYMENT_MODELS, resolveCommission, type CommissionRule, type PaymentModel } from "@thecommunity/shared";
import { getAllCategories, getCities } from "@/lib/data";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { getCancellationPolicies } from "@/lib/data/policies";

/** Étape 20 — options du formulaire d'activité de l'espace organisateur (catégories visibles, villes ouvertes). */
export async function proFormOptions() {
  const [categories, cities, policies] = await Promise.all([getAllCategories(), getCities(), getCancellationPolicies()]);
  return {
    // Lot O (docs/26) : Activités et Événements seulement (les Tables sont les rendez-vous de Wenzy).
    categories: categories
      .filter((c) => ORGANIZER_UNIVERSES.includes(c.parentId ?? c.id))
      .map((c) => ({ id: c.id, label: c.name.fr, parentId: c.parentId ?? undefined })),
    cities: cities.filter((c) => c.isActive).map((c) => ({ id: c.id, label: c.name.fr })),
    partners: [] as { id: string; label: string }[],
    policies: policies.map((p) => ({ id: p.id, label: p.label.fr })),
  };
}

export const EXPERIENCE_STATUS_PRO: Record<string, { label: string; tone: "green" | "gray" | "amber" | "red" | "brand" }> = {
  draft: { label: "Brouillon", tone: "gray" },
  pending_review: { label: "En relecture", tone: "amber" },
  published: { label: "En ligne", tone: "green" },
  rejected: { label: "À corriger", tone: "red" },
  archived: { label: "Archivée", tone: "gray" },
};

/** Étape 22 — modes de paiement activés par l'équipe (tous par défaut, en mode test). */
export async function organizerPaymentModels(): Promise<PaymentModel[]> {
  if (!FIREBASE_ENABLED) return [...PAYMENT_MODELS];
  const list = (await adminDb().doc("settings/payment").get()).get("organizerPaymentModels") as PaymentModel[] | undefined;
  return list?.length ? list : [...PAYMENT_MODELS];
}

/** Taux de commission en vigueur pour un organisateur et une catégorie (aperçu du formulaire). */
export function currentRate(rules: CommissionRule[], organizerId: string, categoryId: string, experienceId = "-") {
  const c = resolveCommission(rules, { experienceId, organizerId, categoryId, at: new Date().toISOString().slice(0, 10) });
  return { ratePercent: c.ratePercent, fixedPerSeat: c.fixedPerSeat };
}
