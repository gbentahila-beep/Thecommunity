import { describe, expect, it } from "vitest";
import { carnetCredits, countedAbsences, coverageFor, DEFAULT_OFFERS, isMemberActive, isSuspended, membershipPlanInputSchema, nextPassPeriod, offerEconomics, offerLabel, pickOffer, planOffers } from "./membership";

describe("Carnet et Pass (docs/22 § 17.I)", () => {
  const now = new Date("2026-11-22T10:00:00Z");
  it("offres validées : carnet 70 DH, pass 49 / 99 / 249 / 449 / 790 DH ; anciennes formules par mois → offres par défaut", () => {
    expect(DEFAULT_OFFERS.map((o) => [o.id, o.price.amount / 100])).toEqual([["carnet3", 70], ["pass7", 49], ["pass30", 99], ["pass90", 249], ["pass180", 449], ["pass365", 790]]);
    expect(planOffers({ offers: [{ id: "12m", months: 12, price: { amount: 99000, currency: "MAD" }, isActive: true } as never] }).map((o) => o.id)).toEqual(DEFAULT_OFFERS.map((o) => o.id));
    expect(pickOffer(null, "pass180")?.highlight).toBe(true);
    expect(pickOffer({ offers: DEFAULT_OFFERS.map((o) => (o.id === "pass7" ? { ...o, isActive: false } : o)) }, "pass7")).toBeNull();
    expect(offerLabel(DEFAULT_OFFERS[4]!)).toBe("Pass 6 mois");
    expect(offerLabel(DEFAULT_OFFERS[0]!)).toBe("Carnet 3 sorties");
    expect(offerLabel(DEFAULT_OFFERS[1]!, "en")).toBe("1 week pass");
    expect(offerEconomics(DEFAULT_OFFERS[2]!, 3500)).toEqual({ perMonth: 9900, breakEven: 3, saving: 0 });
    expect(offerEconomics(DEFAULT_OFFERS[0]!, 3500)).toMatchObject({ saving: 3500 });
  });
  it("pass actif seulement dans sa période, ni retiré ni suspendu ; prolongé depuis sa fin", () => {
    expect(isMemberActive({ status: "active", startAt: "2026-01-01", endAt: "2027-01-01" }, now)).toBe(true);
    expect(isMemberActive({ status: "active", startAt: "2026-01-01", endAt: "2027-01-01", suspendedUntil: "2026-11-30" }, now)).toBe(false);
    expect(isSuspended({ suspendedUntil: "2026-11-30" }, now)).toBe(true);
    expect(isMemberActive({ status: "revoked", startAt: "2026-01-01", endAt: "2027-01-01" }, now)).toBe(false);
    expect(nextPassPeriod(null, now, 30).endAt.toISOString()).toBe("2026-12-22T10:00:00.000Z");
    expect(nextPassPeriod({ status: "active", endAt: "2026-12-01T00:00:00Z" }, now, 7).endAt.toISOString()).toBe("2026-12-08T00:00:00.000Z");
  });
  it("carnet : crédits utilisables tant qu'il n'est pas expiré", () => {
    expect(carnetCredits({ credits: 2, expiresAt: "2027-01-01" }, now)).toBe(2);
    expect(carnetCredits({ credits: 2, expiresAt: "2026-11-01" }, now)).toBe(0);
    expect(carnetCredits(null, now)).toBe(0);
  });
  it("places couvertes : la sienne par le pass (2 réservations à venir au plus), le reste par le carnet si on le choisit", () => {
    expect(coverageFor({ seats: 1, pass: true, passUpcoming: 0, credits: 0, useCarnet: false })).toEqual({ passSeats: 1, carnetSeats: 0, passLimitReached: false });
    expect(coverageFor({ seats: 2, pass: true, passUpcoming: 1, credits: 3, useCarnet: true })).toEqual({ passSeats: 1, carnetSeats: 1, passLimitReached: false });
    expect(coverageFor({ seats: 1, pass: true, passUpcoming: 2, credits: 0, useCarnet: false })).toEqual({ passSeats: 0, carnetSeats: 0, passLimitReached: true });
    expect(coverageFor({ seats: 2, pass: false, passUpcoming: 0, credits: 1, useCarnet: true })).toEqual({ passSeats: 0, carnetSeats: 1, passLimitReached: false });
  });
  it("absences : 90 jours, et seulement après la dernière suspension", () => {
    const abs = [{ at: "2026-11-20" }, { at: "2026-10-01" }, { at: "2026-06-01" }];
    expect(countedAbsences(abs, now)).toBe(2);
    expect(countedAbsences(abs, now, "2026-10-15")).toBe(1);
  });
  it("réglages des offres validés", () => {
    expect(membershipPlanInputSchema.safeParse({ nameFr: "Carnet et Pass", isActive: true, offers: [{ id: "pass30", priceDh: "99", isActive: true }] }).success).toBe(true);
    expect(membershipPlanInputSchema.safeParse({ nameFr: "Carnet et Pass", isActive: true, offers: [{ id: "pass30", priceDh: 0, isActive: true }] }).success).toBe(false);
    expect(membershipPlanInputSchema.safeParse({ nameFr: "Carnet et Pass", isActive: true, offers: [{ id: "pass2", priceDh: 10, isActive: true }] }).success).toBe(false);
  });
});
