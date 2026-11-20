import { describe, expect, it } from "vitest";
import { commissionAmount, commissionRefund, commissionRuleInputSchema, DEFAULT_COMMISSION_PERCENT, resolveCommission, type CommissionRule } from "./commission";

const rules: CommissionRule[] = [
  { id: "g1", scope: "global", ratePercent: 15, effectiveFrom: "2026-01-01" },
  { id: "g2", scope: "global", ratePercent: 12, effectiveFrom: "2026-12-01" },
  { id: "c1", scope: "category", targetId: "move", ratePercent: 10, effectiveFrom: "2026-06-01" },
  { id: "o1", scope: "organizer", targetId: "orgA", ratePercent: 8, fixedPerSeat: 500, effectiveFrom: "2026-11-01" },
  { id: "e1", scope: "experience", targetId: "exp1", ratePercent: 5, effectiveFrom: "2026-11-15" },
  { id: "x", scope: "experience", targetId: "exp2", ratePercent: 1, effectiveFrom: "2026-01-01", active: false },
];
const ctx = (o: Partial<{ experienceId: string; organizerId: string; categoryId: string; at: string }> = {}) => ({ experienceId: "expZ", organizerId: "orgZ", categoryId: "eat", at: "2026-11-20", ...o });

describe("commissions (21)", () => {
  it("la règle la plus précise l'emporte : activité > organisateur > catégorie > globale", () => {
    expect(resolveCommission(rules, ctx({ experienceId: "exp1", organizerId: "orgA", categoryId: "move" })).ruleId).toBe("e1");
    expect(resolveCommission(rules, ctx({ organizerId: "orgA", categoryId: "move" })).ruleId).toBe("o1");
    expect(resolveCommission(rules, ctx({ categoryId: "move" })).ruleId).toBe("c1");
    expect(resolveCommission(rules, ctx()).ruleId).toBe("g1");
  });
  it("date d'effet : une règle future ne s'applique pas encore ; à précision égale, la plus récente en vigueur", () => {
    expect(resolveCommission(rules, ctx({ experienceId: "exp1", at: "2026-11-10", organizerId: "orgA" })).ruleId).toBe("o1");
    expect(resolveCommission(rules, ctx({ at: "2026-12-05" })).ruleId).toBe("g2");
    expect(resolveCommission(rules, ctx({ at: "2025-12-31" }))).toEqual({ ruleId: null, scope: "default", ratePercent: DEFAULT_COMMISSION_PERCENT, fixedPerSeat: 0 });
  });
  it("une règle désactivée est ignorée", () => {
    expect(resolveCommission(rules, ctx({ experienceId: "exp2" })).ruleId).toBe("g1");
  });
  it("montant : pourcentage + fixe par place, jamais plus que la base ni négatif", () => {
    expect(commissionAmount(20000, 1, { ratePercent: 15, fixedPerSeat: 0 })).toBe(3000);
    expect(commissionAmount(40000, 2, { ratePercent: 8, fixedPerSeat: 500 })).toBe(4200);
    expect(commissionAmount(1000, 1, { ratePercent: 50, fixedPerSeat: 900 })).toBe(1000);
    expect(commissionAmount(0, 1, { ratePercent: 15, fixedPerSeat: 500 })).toBe(0);
    expect(commissionAmount(33333, 1, { ratePercent: 12.5, fixedPerSeat: 0 })).toBe(4167);
  });
  it("remboursement : commission rendue au prorata ; en totalité si tout est remboursé", () => {
    expect(commissionRefund(20000, 3000, 10000)).toBe(1500);
    expect(commissionRefund(20000, 3000, 20000)).toBe(3000);
    expect(commissionRefund(30000, 1000, 10000) * 3).toBe(999);
    expect(commissionRefund(20000, 3000, 0)).toBe(0);
  });
  it("saisie d'une règle : cible obligatoire sauf pour la règle globale, taux entre 0 et 100", () => {
    expect(commissionRuleInputSchema.safeParse({ scope: "global", ratePercent: "15", effectiveFrom: "2026-12-01" }).success).toBe(true);
    expect(commissionRuleInputSchema.safeParse({ scope: "organizer", ratePercent: 10, effectiveFrom: "2026-12-01" }).success).toBe(false);
    expect(commissionRuleInputSchema.safeParse({ scope: "category", targetId: "Move!", ratePercent: 10, effectiveFrom: "2026-12-01" }).success).toBe(false);
    expect(commissionRuleInputSchema.safeParse({ scope: "global", ratePercent: 120, effectiveFrom: "2026-12-01" }).success).toBe(false);
  });
});
