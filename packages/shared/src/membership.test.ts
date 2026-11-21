import { describe, expect, it } from "vitest";
import { canRenewMembership, isMemberActive, memberUnitPrice, membershipPlanInputSchema, nextMembershipPeriod, planOffers, pickOffer, offerEconomics } from "./membership";

describe("abonnement", () => {
  it("prix membre : prix précis de l'expérience, sinon réduction de la formule, jamais au-dessus du public", () => {
    expect(memberUnitPrice(30000, { discountPercent: 15 })).toBe(25500);
    expect(memberUnitPrice(30000, { discountPercent: 15 }, 20000)).toBe(20000);
    expect(memberUnitPrice(30000, { discountPercent: 15 }, 40000)).toBe(30000);
    expect(memberUnitPrice(16900, { discountPercent: 15 })).toBe(14400); // 143,65 DH → arrondi à 144 DH
    expect(memberUnitPrice(13900, { discountPercent: 15 })).toBe(11800);
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

describe("formules par durée (21 novembre)", () => {
  const mad = (dh: number) => ({ amount: dh * 100, currency: "MAD" as const });
  const plan = {
    price: mad(990),
    offers: [
      { id: "12m", months: 12 as const, price: mad(990), isActive: true },
      { id: "1m", months: 1 as const, price: mad(129), isActive: true },
      { id: "3m", months: 3 as const, price: mad(339), isActive: false },
      { id: "6m", months: 6 as const, price: mad(590), isActive: true, highlight: true },
    ],
  };
  it("liste les offres actives de la plus courte à la plus longue", () => {
    expect(planOffers(plan).map((o) => o.id)).toEqual(["1m", "6m", "12m"]);
  });
  it("ancienne formule sans offres : une offre de 12 mois au prix annuel", () => {
    expect(planOffers({ price: mad(990) })).toEqual([{ id: "12m", months: 12, price: mad(990), isActive: true, highlight: true }]);
  });
  it("choisit l'offre demandée, sinon celle mise en avant ; refuse une offre désactivée", () => {
    expect(pickOffer(plan, "1m")?.id).toBe("1m");
    expect(pickOffer(plan)?.id).toBe("6m");
    expect(pickOffer(plan, "3m")).toBeNull();
  });
  it("calcule le prix par mois et l'économie par rapport au mensuel", () => {
    const offers = planOffers(plan);
    const e = offerEconomics(offers.find((o) => o.id === "12m")!, offers);
    expect(e.perMonth).toBe(8300); // 990 / 12 ≈ 82,5 → 83 DH
    expect(e.reference).toBe(154800); // 12 × 129 DH
    expect(e.saving).toBe(55800);
    expect(e.savingPercent).toBe(36);
    expect(offerEconomics(offers[0]!, offers).saving).toBe(0);
  });
  it("prolonge de la durée achetée", () => {
    const now = new Date("2026-11-21T10:00:00Z");
    expect(nextMembershipPeriod(null, now, 3).endAt.toISOString()).toBe("2027-02-21T10:00:00.000Z");
    expect(nextMembershipPeriod(null, now).endAt.toISOString()).toBe("2027-11-21T10:00:00.000Z");
  });
});
