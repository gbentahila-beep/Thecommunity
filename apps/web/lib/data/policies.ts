import "server-only";
import { DEFAULT_CANCELLATION_POLICY, type CancellationPolicy } from "@thecommunity/shared";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Démonstration : trois politiques (souple, standard, stricte). */
export const DEMO_POLICIES: CancellationPolicy[] = [
  DEFAULT_CANCELLATION_POLICY,
  { id: "souple-24h", label: { fr: "Annulation gratuite jusqu'à 24 h avant", en: "Free cancellation up to 24 h before", ar: "إلغاء مجاني حتى 24 ساعة قبل الموعد" }, rules: [{ hoursBefore: 24, refundPercent: 100 }, { hoursBefore: 0, refundPercent: 0 }] },
  { id: "stricte-7j", label: { fr: "Stricte : 100 % à 7 jours, 50 % à 48 h", en: "Strict: 100% up to 7 days, 50% up to 48 h", ar: "صارمة: 100٪ حتى 7 أيام، 50٪ حتى 48 ساعة" }, rules: [{ hoursBefore: 168, refundPercent: 100 }, { hoursBefore: 48, refundPercent: 50 }, { hoursBefore: 0, refundPercent: 0 }] },
];

const fsPolicies = unstable_cache(
  async (): Promise<CancellationPolicy[]> => {
    const list = ((await adminDb().doc("settings/cancellationPolicies").get()).get("policies") as CancellationPolicy[] | undefined) ?? [];
    return list.some((p) => p.id === DEFAULT_CANCELLATION_POLICY.id) ? list : [DEFAULT_CANCELLATION_POLICY, ...list];
  },
  ["cancellation-policies"],
  { tags: ["catalog"], revalidate: 300 },
);

/** Étape 22 — politiques d'annulation (lecture publique : affichées sur les fiches). */
export async function getCancellationPolicies(): Promise<CancellationPolicy[]> {
  return FIREBASE_ENABLED ? fsPolicies() : DEMO_POLICIES;
}

/** Politique d'une activité (la standard si l'identifiant est inconnu). */
export function policyOf(list: CancellationPolicy[], id: string | undefined | null): CancellationPolicy {
  return list.find((p) => p.id === id) ?? DEFAULT_CANCELLATION_POLICY;
}
