import { describe, expect, it } from "vitest";
import { DEFAULT_WENZY_PRICE, wenzyPriceInputSchema, wenzyPriceOf } from "./booking";
import { tierRange } from "./two-part";

describe("prix Wenzy unique (docs/22, étape E)", () => {
  it("35 DH par défaut, sinon le réglage enregistré", () => {
    expect(DEFAULT_WENZY_PRICE).toBe(3500);
    expect(wenzyPriceOf(undefined)).toBe(3500);
    expect(wenzyPriceOf({})).toBe(3500);
    expect(wenzyPriceOf({ wenzyPrice: 4000 })).toBe(4000);
    expect(wenzyPriceOf({ wenzyPrice: "n'importe quoi" })).toBe(3500);
    expect(wenzyPriceOf({ wenzyPrice: -100 })).toBe(3500);
  });
  it("saisie du super-admin en dirhams", () => {
    expect(wenzyPriceInputSchema.safeParse({ priceDh: "35" }).success).toBe(true);
    expect(wenzyPriceInputSchema.safeParse({ priceDh: -1 }).success).toBe(false);
  });
});

describe("gammes des Tables par format (docs/22 § 6)", () => {
  it("budgets validés", () => {
    expect(tierRange("casual", "cafe")).toEqual({ min: 30, max: 60 });
    expect(tierRange("exclusive", "brunch")).toEqual({ min: 250, max: 400 });
    expect(tierRange("premium", "dejeuner")).toEqual({ min: 150, max: 250 });
    expect(tierRange("casual", "diner")).toEqual({ min: 150, max: 250 });
    expect(tierRange("exclusive", null)).toEqual({ min: 400, max: 600 });
  });
});
