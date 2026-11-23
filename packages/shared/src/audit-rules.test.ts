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

import { canReview, reviewNeedsModeration, sensitiveWordIn } from "./index";

describe("audit 23/11 — avis", () => {
  it("modération : note basse, mot sensible (accents et casse ignorés, mot entier), téléphone", () => {
    expect(reviewNeedsModeration(2, "")).toMatchObject({ pending: true, why: "low_rating" });
    expect(reviewNeedsModeration(5, "Quelle ARNAQUE")).toMatchObject({ pending: true, why: "sensitive", word: "arnaque" });
    expect(reviewNeedsModeration(5, "Il m'a harcelée toute la soirée").pending).toBe(true); // début de mot (5 lettres et plus)
    expect(sensitiveWordIn("Il m'a HARCELÉ")).toBeTruthy();
    expect(sensitiveWordIn("Volontiers, à refaire")).toBeNull(); // « vol » n'est pas un mot entier ici
    expect(sensitiveWordIn("Appelez le +212 6 12 34 56 78")).toBe("phone");
    expect(reviewNeedsModeration(4, "Très bonne soirée, merci !")).toMatchObject({ pending: false });
  });

  it("avis après remboursement : oui si remboursé après coup, non si annulé avant", () => {
    const snap = { startAt: "2026-12-01T19:00:00Z", endAt: "2026-12-01T22:00:00Z" };
    const now = new Date("2026-12-02T10:00:00Z");
    expect(canReview({ status: "refunded", sessionSnapshot: snap }, now)).toBe(true);
    expect(canReview({ status: "refunded", sessionSnapshot: snap, cancellation: { at: "2026-11-30T10:00:00Z" } }, now)).toBe(false);
    expect(canReview({ status: "refunded", sessionSnapshot: snap, cancellation: { at: "2026-12-01T20:00:00Z" } }, now)).toBe(true);
    expect(canReview({ status: "refunded", sessionSnapshot: snap }, new Date("2026-12-01T20:00:00Z"))).toBe(false);
  });
});

import { buildIcs } from "./index";

describe("audit 23/11 — invitation agenda", () => {
  it("même identifiant pour une réservation, version croissante, lieu et annulation", () => {
    const base = { uid: "res123", title: "Dîner, à table", startAt: "2026-12-01T19:00:00Z", endAt: "2026-12-01T22:00:00Z", location: "Casablanca", url: "https://wenzy.ma/espace/reservations/res123" };
    const a = buildIcs({ ...base, now: new Date("2026-11-20T10:00:00Z") });
    const b = buildIcs({ ...base, location: "Dar Lyakout, 12 rue X", geo: { lat: 33.5, lng: -7.6 }, now: new Date("2026-11-30T10:00:00Z") });
    const uid = (s: string) => s.match(/UID:(.*)/)![1];
    const seq = (s: string) => Number(s.match(/SEQUENCE:(\d+)/)![1]);
    expect(uid(a)).toBe(uid(b));
    expect(seq(b)).toBeGreaterThan(seq(a));
    expect(b).toContain("GEO:33.5;-7.6");
    expect(a).toContain("SUMMARY:Dîner\\, à table");
    expect(buildIcs({ ...base, cancelled: true })).toContain("STATUS:CANCELLED");
    expect(a.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
