import { describe, expect, it } from "vitest";
import { canRequestRefund, cancellationPolicyInputSchema, commissionOnTotal, describePolicy, refundDecisionSchema, splitForModel } from "./marketplace";

describe("modes de paiement A/B/C (22)", () => {
  const c = { ratePercent: 15, fixedPerSeat: 0 };
  it("A — tout en ligne", () => {
    expect(splitForModel("full_online", 20000, c)).toEqual({ onlineUnit: 20000, onSiteUnit: 0 });
  });
  it("B — acompte (pourcentage), au moins la commission, borné 10–90 %", () => {
    expect(splitForModel("deposit", 20000, { ...c, depositPercent: 30 })).toEqual({ onlineUnit: 6000, onSiteUnit: 14000 });
    expect(splitForModel("deposit", 20000, { ...c, depositPercent: 10 })).toEqual({ onlineUnit: 3000, onSiteUnit: 17000 });
    expect(splitForModel("deposit", 20000, { ...c, depositPercent: 99 })).toEqual({ onlineUnit: 18000, onSiteUnit: 2000 });
  });
  it("C — frais de réservation = commission (1 DH minimum), le reste sur place", () => {
    expect(splitForModel("booking_fee", 20000, c)).toEqual({ onlineUnit: 3000, onSiteUnit: 17000 });
    expect(splitForModel("booking_fee", 400, c)).toEqual({ onlineUnit: 100, onSiteUnit: 300 });
    expect(splitForModel("booking_fee", 20000, { ratePercent: 10, fixedPerSeat: 500 })).toEqual({ onlineUnit: 2500, onSiteUnit: 17500 });
  });
  it("commission sur le prix total, jamais plus que ce qui est encaissé", () => {
    expect(commissionOnTotal(6000, 40000, 2, c)).toBe(6000);
    expect(commissionOnTotal(12000, 40000, 2, c)).toBe(6000);
  });
});

describe("politiques d'annulation (22)", () => {
  const ok = { id: "stricte-7j", labelFr: "Stricte", rules: [{ hoursBefore: 168, refundPercent: 100 }, { hoursBefore: 48, refundPercent: 50 }, { hoursBefore: 0, refundPercent: 0 }] };
  it("paliers décroissants", () => {
    expect(cancellationPolicyInputSchema.safeParse(ok).success).toBe(true);
    expect(cancellationPolicyInputSchema.safeParse({ ...ok, rules: [{ hoursBefore: 168, refundPercent: 50 }, { hoursBefore: 48, refundPercent: 100 }] }).success).toBe(false);
    expect(cancellationPolicyInputSchema.safeParse({ ...ok, rules: [{ hoursBefore: 48, refundPercent: 100 }, { hoursBefore: 48, refundPercent: 50 }] }).success).toBe(false);
  });
  it("description lisible", () => {
    expect(describePolicy(ok.rules)).toBe("7 jours avant ou plus : 100 % · 48 h avant ou plus : 50 % · moins de 48 h : 0 %");
  });
});

describe("demandes de remboursement (22)", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("possible jusqu'à 7 jours après l'activité, pour une réservation payée non remboursée", () => {
    expect(canRequestRefund({ status: "attended", sessionStartAt: "2026-11-15T18:00:00Z", paidAmount: 20000 }, now)).toBe(true);
    expect(canRequestRefund({ status: "attended", sessionStartAt: "2026-11-10T18:00:00Z", paidAmount: 20000 }, now)).toBe(false);
    expect(canRequestRefund({ status: "cancelled", sessionStartAt: "2026-11-15T18:00:00Z", paidAmount: 20000 }, now)).toBe(false);
    expect(canRequestRefund({ status: "confirmed", sessionStartAt: "2026-11-25T18:00:00Z", paidAmount: 20000, refundedAmount: 20000 }, now)).toBe(false);
  });
  it("décision : montant pour un remboursement partiel, message pour un refus", () => {
    expect(refundDecisionSchema.safeParse({ requestId: "r1", decision: "partial" }).success).toBe(false);
    expect(refundDecisionSchema.safeParse({ requestId: "r1", decision: "partial", amountDh: 50 }).success).toBe(true);
    expect(refundDecisionSchema.safeParse({ requestId: "r1", decision: "decline" }).success).toBe(false);
    expect(refundDecisionSchema.safeParse({ requestId: "r1", decision: "full" }).success).toBe(true);
  });
});
