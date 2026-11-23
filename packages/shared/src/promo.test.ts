import { describe, expect, it } from "vitest";
import { computePricing } from "./booking";
import { bookingPreferencesSchema, promoCodeSchema, promoDiscount, promoInputSchema, promoRefusal, readServiceFee, serviceFeeAmount } from "./promo";

const now = new Date("2026-11-10T12:00:00Z");
const promo = { isActive: true, validTo: new Date("2026-12-31T23:59:59Z"), maxRedemptions: 10, redemptionsCount: 3, firstBookingOnly: false };

describe("codes promo", () => {
  it("format : majuscules, 3 à 20 caractères", () => {
    expect(promoCodeSchema.parse(" bienvenue20 ")).toBe("BIENVENUE20");
    expect(promoCodeSchema.safeParse("ab").success).toBe(false);
    expect(promoCodeSchema.safeParse("PROMO 20").success).toBe(false);
  });
  it("remise : pourcentage arrondi au dirham, montant fixe plafonné", () => {
    expect(promoDiscount({ type: "percent", value: 20 }, 16900)).toBe(3400); // 33,80 → 34 DH
    expect(promoDiscount({ type: "fixed", value: 5000 }, 3000)).toBe(3000);
    expect(promoDiscount({ type: "percent", value: 100 }, 16900)).toBe(16900);
  });
  it("conditions d'utilisation", () => {
    const o = { now, alreadyUsedByUser: false, hasPastBooking: false };
    expect(promoRefusal(promo, o)).toBeNull();
    expect(promoRefusal(null, o)).toBe("promo_unknown");
    expect(promoRefusal({ ...promo, isActive: false }, o)).toBe("promo_inactive");
    expect(promoRefusal({ ...promo, validFrom: new Date("2026-12-01") }, o)).toBe("promo_not_started");
    expect(promoRefusal({ ...promo, validTo: new Date("2026-11-01") }, o)).toBe("promo_expired");
    expect(promoRefusal({ ...promo, redemptionsCount: 10 }, o)).toBe("promo_exhausted");
    expect(promoRefusal(promo, { ...o, alreadyUsedByUser: true })).toBe("promo_already_used");
    expect(promoRefusal({ ...promo, firstBookingOnly: true }, { ...o, hasPastBooking: true })).toBe("promo_first_booking_only");
  });
  it("saisie du back-office", () => {
    const v = { code: "amis50", type: "fixed", value: "50", validFrom: "", validTo: "2026-12-31", maxRedemptions: "50", firstBookingOnly: false, isActive: true, description: "" };
    expect(promoInputSchema.parse(v).code).toBe("AMIS50");
    expect(promoInputSchema.safeParse({ ...v, type: "percent", value: "150" }).success).toBe(false);
    expect(promoInputSchema.safeParse({ ...v, validFrom: "2027-01-01" }).success).toBe(false);
  });
});

describe("frais de service et prix", () => {
  it("frais : aucun, par place, pourcentage", () => {
    expect(readServiceFee(0)).toEqual({ mode: "none", amount: 0, percent: 0 });
    expect(serviceFeeAmount({ mode: "per_seat", amount: 1000, percent: 0 }, 30000, 2)).toBe(2000);
    expect(serviceFeeAmount({ mode: "percent", amount: 0, percent: 5 }, 16900, 1)).toBe(800);
  });
  it("prix membre, puis code promo, puis frais ; pas de frais sur une place gratuite", () => {
    const p = computePricing(20000, 2, "MAD", { memberUnitAmount: 17000, promo: { code: "AMIS50", type: "fixed", value: 5000 }, serviceFee: { mode: "per_seat", amount: 1000, percent: 0 } });
    expect(p).toMatchObject({ subtotal: 40000, memberDiscount: 6000, discount: 5000, promoCode: "AMIS50", fees: 2000, total: 31000 });
    const free = computePricing(20000, 1, "MAD", { promo: { code: "OFFERT", type: "percent", value: 100 }, serviceFee: { mode: "per_seat", amount: 1000, percent: 0 } });
    expect(free).toMatchObject({ discount: 20000, fees: 0, total: 0 });
    expect(computePricing(20000, 1, "MAD")).toMatchObject({ discount: 0, fees: 0, total: 20000 });
  });
});

describe("préférences pour l'accueil", () => {
  it("accord obligatoire dès qu'un régime ou une allergie est transmis", () => {
    expect(bookingPreferencesSchema.safeParse({ diet: "none", allergies: "", languages: ["fr"], consent: false }).success).toBe(true);
    expect(bookingPreferencesSchema.safeParse({ diet: "vegetarian", allergies: "", languages: [], consent: false }).success).toBe(false);
    expect(bookingPreferencesSchema.safeParse({ diet: "none", allergies: "Arachides", languages: [], consent: true }).success).toBe(true);
  });
});
