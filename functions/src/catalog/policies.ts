import { cancellationPolicyInputSchema, DEFAULT_CANCELLATION_POLICY, PAYMENT_MODELS, type CancellationPolicy } from "@thecommunity/shared";
import { z } from "zod";
import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";

/**
 * Étape 22 — politiques d'annulation à paliers (settings/cancellationPolicies), choisies sur chaque activité et
 * COPIÉES sur la réservation au moment où elle est faite : une politique modifiée ne change jamais une réservation
 * existante. La politique standard (48 h) ne peut pas être modifiée.
 */
let cache: { at: number; list: CancellationPolicy[] } | null = null;
export async function cancellationPolicies(): Promise<CancellationPolicy[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.list;
  const list = ((await db.doc("settings/cancellationPolicies").get()).get("policies") as CancellationPolicy[] | undefined) ?? [];
  const all = list.some((p) => p.id === DEFAULT_CANCELLATION_POLICY.id) ? list : [DEFAULT_CANCELLATION_POLICY, ...list];
  cache = { at: Date.now(), list: all };
  return all;
}
export const policyById = (list: CancellationPolicy[], id: string | undefined) => list.find((p) => p.id === id) ?? DEFAULT_CANCELLATION_POLICY;

export const adminSaveCancellationPolicy = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const parsed = cancellationPolicyInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  if (v.id === DEFAULT_CANCELLATION_POLICY.id) refuse("default_policy", "La politique standard ne se modifie pas : créez-en une autre.");
  const ref = db.doc("settings/cancellationPolicies");
  const policy: CancellationPolicy = {
    id: v.id,
    label: { fr: v.labelFr, ...(v.labelAr ? { ar: v.labelAr } : {}), ...(v.labelEn ? { en: v.labelEn } : {}) },
    rules: [...v.rules].sort((a, b) => b.hoursBefore - a.hoursBefore),
  };
  const created = await db.runTransaction(async (tx) => {
    const current = ((await tx.get(ref)).get("policies") as CancellationPolicy[] | undefined) ?? [DEFAULT_CANCELLATION_POLICY];
    const others = current.filter((p) => p.id !== v.id);
    tx.set(ref, { policies: [...others, policy], updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid }, { merge: true });
    return others.length === current.length;
  });
  cache = null;
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: created ? "policy.create" : "policy.update", targetType: "cancellationPolicy", targetId: v.id, after: policy });
  return { id: v.id, created };
});

/**
 * Étape 22 — modes de paiement proposés aux organisateurs (A tout en ligne, B acompte, C frais de réservation).
 * À n'ouvrir qu'avec un contrat de paiement qui autorise l'encaissement pour le compte de tiers (docs/16).
 */
export const adminSaveOrganizerPaymentModels = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const parsed = z.object({ models: z.array(z.enum(PAYMENT_MODELS)).min(1, "pickOne").max(3) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const models = [...new Set(parsed.data.models)];
  await db.doc("settings/payment").set({ organizerPaymentModels: models, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "settings.organizerPaymentModels", targetType: "settings", targetId: "payment", after: { models } });
  return { models };
});
