import { describe, expect, it } from "vitest";
import { isLatePassCancel, refundAmountFor, refundBasisDate, DEFAULT_CANCELLATION_POLICY, reportWindowOpen, withdrawalRefusal } from "./index";

const H = 3_600_000;

describe("audit 23/11 — règles partagées", () => {
  it("remboursement : la date d'origine fait foi après un déplacement par le membre", () => {
    const now = new Date("2026-12-01T10:00:00Z");
    const original = new Date(now.getTime() + 20 * H);
    const moved = new Date(now.getTime() + 200 * H);
    expect(refundAmountFor(DEFAULT_CANCELLATION_POLICY, 3500, refundBasisDate(moved, original), now)).toBe(0);
    expect(refundAmountFor(DEFAULT_CANCELLATION_POLICY, 3500, refundBasisDate(moved, null), now)).toBe(3500);
    // Une date de référence plus tardive que la date actuelle ne sert jamais.
    expect(refundBasisDate(original, moved)).toEqual(original);
  });

  it("pass : annulation à moins de 24 h = absence, seulement si la place était incluse", () => {
    const now = new Date("2026-12-01T10:00:00Z");
    expect(isLatePassCancel(1, new Date(now.getTime() + 23 * H), now)).toBe(true);
    expect(isLatePassCancel(1, new Date(now.getTime() + 25 * H), now)).toBe(false);
    expect(isLatePassCancel(0, new Date(now.getTime() + 2 * H), now)).toBe(false);
  });

  it("signalement : de 1 h avant le début à 30 jours après la fin", () => {
    const start = "2026-12-01T20:00:00Z";
    const end = "2026-12-01T23:00:00Z";
    expect(reportWindowOpen(start, end, new Date("2026-12-01T18:30:00Z"))).toBe(false);
    expect(reportWindowOpen(start, end, new Date("2026-12-01T19:30:00Z"))).toBe(true);
    expect(reportWindowOpen(start, end, new Date("2026-12-30T20:00:00Z"))).toBe(true);
    expect(reportWindowOpen(start, end, new Date("2027-01-02T00:00:00Z"))).toBe(false);
  });

  it("rétractation : 7 jours, rien d'utilisé, une seule fois", () => {
    const purchasedAt = new Date("2026-12-01T10:00:00Z");
    const base = { status: "succeeded", kind: "pass" as const, purchasedAt, passSeatsUsedSince: 0, creditsBought: 0, creditsLeft: 0 };
    expect(withdrawalRefusal(base, new Date("2026-12-07T10:00:00Z"))).toBeNull();
    expect(withdrawalRefusal(base, new Date("2026-12-09T10:00:00Z"))).toBe("too_late");
    expect(withdrawalRefusal({ ...base, passSeatsUsedSince: 1 }, new Date("2026-12-02T10:00:00Z"))).toBe("already_used");
    expect(withdrawalRefusal({ ...base, withdrawnAt: new Date() }, new Date("2026-12-02T10:00:00Z"))).toBe("already_withdrawn");
    const carnet = { ...base, kind: "carnet" as const, creditsBought: 3 };
    expect(withdrawalRefusal({ ...carnet, creditsLeft: 3 }, new Date("2026-12-02T10:00:00Z"))).toBeNull();
    expect(withdrawalRefusal({ ...carnet, creditsLeft: 2 }, new Date("2026-12-02T10:00:00Z"))).toBe("already_used");
  });
});
