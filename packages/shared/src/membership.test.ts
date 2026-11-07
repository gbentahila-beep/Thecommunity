import { describe, expect, it } from "vitest";
import { canRenewMembership, isMemberActive, memberUnitPrice, membershipPlanInputSchema, nextMembershipPeriod } from "./membership";

describe("abonnement", () => {
  it("prix membre : prix précis de l'expérience, sinon réduction de la formule, jamais au-dessus du public", () => {
    expect(memberUnitPrice(30000, { discountPercent: 15 })).toBe(25500);
    expect(memberUnitPrice(30000, { discountPercent: 15 }, 20000)).toBe(20000);
    expect(memberUnitPrice(30000, { discountPercent: 15 }, 40000)).toBe(30000);
    expect(memberUnitPrice(16900, { discountPercent: 15 })).toBe(14365);
    expect(memberUnitPrice(30000, null)).toBe(30000);
  });
  it("membre actif seulement entre le début et l'échéance, et non retiré", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(isMemberActive({ status: "active", startAt: "2026-01-01", endAt: "2027-01-01" }, now)).toBe(true);
    expect(isMemberActive({ status: "active", startAt: "2025-01-01", endAt: "2026-01-01" }, now)).toBe(false);
    expect(isMemberActive({ status: "revoked", startAt: "2026-01-01", endAt: "2027-01-01" }, now)).toBe(false);
    expect(isMemberActive(null, now)).toBe(false);
  });
  it("renouvellement : 12 mois à partir de l'échéance si encore actif, sinon de maintenant ; possible 30 jours avant", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(nextMembershipPeriod(null, now).endAt.toISOString()).toBe("2027-11-10T12:00:00.000Z");
    expect(nextMembershipPeriod({ status: "active", endAt: "2026-11-30T00:00:00Z" }, now)).toEqual({ startAt: new Date("2026-11-30T00:00:00Z"), endAt: new Date("2027-11-30T00:00:00Z") });
    expect(canRenewMembership({ status: "active", endAt: "2026-11-30T00:00:00Z" }, now)).toBe(true);
    expect(canRenewMembership({ status: "active", endAt: "2027-06-01T00:00:00Z" }, now)).toBe(false);
    expect(canRenewMembership(null, now)).toBe(true);
  });
  it("réglages de la formule validés", () => {
    expect(membershipPlanInputSchema.safeParse({ nameFr: "Membre", priceDh: "990", discountPercent: "15", earlyAccessHours: "48", isActive: true }).success).toBe(true);
    expect(membershipPlanInputSchema.safeParse({ nameFr: "Membre", priceDh: 0, discountPercent: 15, earlyAccessHours: 0, isActive: true }).success).toBe(false);
    expect(membershipPlanInputSchema.safeParse({ nameFr: "Membre", priceDh: 990, discountPercent: 95, earlyAccessHours: 0, isActive: true }).success).toBe(false);
  });
});
