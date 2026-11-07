import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANCELLATION_POLICY,
  formatMoney,
  isBookable,
  mad,
  refundAmountFor,
  refundPercentFor,
  seatsAvailable,
  type Session,
} from "./index";

describe("money", () => {
  it("stocke les montants en centimes", () => {
    expect(mad(169)).toEqual({ amount: 16900, currency: "MAD" });
    expect(mad(169.5).amount).toBe(16950);
    expect(mad(0.1 + 0.2).amount).toBe(30);
  });
  it("formate en DH", () => {
    expect(formatMoney(mad(169))).toBe("169 DH");
    expect(formatMoney(mad(169.5))).toBe("169,50 DH");
    expect(formatMoney(mad(1250)).replace(/\s/g, " ")).toBe("1 250 DH");
  });
});

describe("places", () => {
  const base: Session = {
    id: "s",
    experienceId: "e",
    cityId: "casablanca",
    categoryId: "eat",
    startAt: "2030-01-01T19:30:00.000Z",
    endAt: "2030-01-01T22:00:00.000Z",
    price: mad(169),
    capacity: 12,
    seatsConfirmed: 9,
    seatsHeld: 2,
    waitlistCount: 0,
    status: "published",
    isFeatured: false,
  };
  it("déduit les places confirmées et bloquées", () => {
    expect(seatsAvailable(base)).toBe(1);
    expect(seatsAvailable({ ...base, seatsConfirmed: 12 })).toBe(0);
    expect(seatsAvailable({ ...base, seatsConfirmed: 15 })).toBe(0);
  });
  it("n'est réservable que publiée, future et avec des places", () => {
    const now = new Date("2029-12-31T00:00:00Z");
    expect(isBookable(base, now)).toBe(true);
    expect(isBookable({ ...base, status: "draft" }, now)).toBe(false);
    expect(isBookable({ ...base, seatsHeld: 3 }, now)).toBe(false);
    expect(isBookable(base, new Date("2030-01-02T00:00:00Z"))).toBe(false);
  });
});

describe("politique d'annulation 48 h", () => {
  const start = new Date("2030-01-10T19:30:00Z");
  const hoursBefore = (h: number) => new Date(start.getTime() - h * 3_600_000);
  it("rembourse 100 % à 48 h ou plus", () => {
    expect(refundPercentFor(DEFAULT_CANCELLATION_POLICY, start, hoursBefore(72))).toBe(100);
    expect(refundPercentFor(DEFAULT_CANCELLATION_POLICY, start, hoursBefore(48))).toBe(100);
  });
  it("ne rembourse rien à moins de 48 h ou après le début", () => {
    expect(refundPercentFor(DEFAULT_CANCELLATION_POLICY, start, hoursBefore(47.9))).toBe(0);
    expect(refundPercentFor(DEFAULT_CANCELLATION_POLICY, start, hoursBefore(-1))).toBe(0);
  });
  it("calcule le montant en centimes", () => {
    expect(refundAmountFor(DEFAULT_CANCELLATION_POLICY, 16900, start, hoursBefore(50))).toBe(16900);
    const half = { ...DEFAULT_CANCELLATION_POLICY, rules: [{ hoursBefore: 24, refundPercent: 50 }] };
    expect(refundAmountFor(half, 16901, start, hoursBefore(30))).toBe(8450);
  });
});
