import { describe, expect, it } from "vitest";
import { isTablesFlow, minimumChoiceSchema, minimumMet, tableMessageSchema, tableSummary, tablesOutOfBounds, tablesTimeline } from "./tables";

describe("parcours des Tables (docs/22 § 17.H)", () => {
  it("horaires d'une date : fermeture 12 h, révélation 5 h, tables 1 h avant, check-in, messages", () => {
    const t = tablesTimeline("2026-11-26T19:30:00.000Z");
    expect(t.closesAt.toISOString()).toBe("2026-11-26T07:30:00.000Z");
    expect(t.revealAt.toISOString()).toBe("2026-11-26T14:30:00.000Z");
    expect(t.finalAt.toISOString()).toBe("2026-11-26T18:30:00.000Z");
    expect(t.checkInFrom.toISOString()).toBe("2026-11-26T19:00:00.000Z");
    expect(t.checkInUntil.toISOString()).toBe("2026-11-26T20:30:00.000Z");
    expect(t.chatFrom.toISOString()).toBe("2026-11-26T21:30:00.000Z");
    expect(t.chatUntil.toISOString()).toBe("2026-12-10T21:30:00.000Z");
  });

  it("seules les tables composées suivent ce parcours", () => {
    expect(isTablesFlow({ bookingMode: "social_dinner", groupConfig: { minSize: 4 } })).toBe(true);
    expect(isTablesFlow({ bookingMode: "group", groupConfig: { minSize: 4 } })).toBe(false);
    expect(isTablesFlow({ bookingMode: "social_dinner" })).toBe(false);
  });

  it("minimum : au moins une table complète ; tables hors limites signalées (table de 7)", () => {
    expect(minimumMet(3, { minSize: 4 })).toBe(false);
    expect(minimumMet(4, { minSize: 4 })).toBe(true);
    expect(tablesOutOfBounds([5, 7, 4], { minSize: 4, maxSize: 6 })).toEqual([1]);
    expect(tablesOutOfBounds([3, 6], { minSize: 4, maxSize: 6 })).toEqual([0]);
  });

  it("résumé sans les noms : âges, langues, secteurs et centres d'intérêt les plus partagés", () => {
    const s = tableSummary(
      [
        { birthDate: "1990-05-10", languages: ["fr", "en"], sector: "tech", interests: ["food", "travel"] },
        { birthDate: "1996-01-02", languages: ["fr"], sector: "student", interests: ["food", "music"], seats: 2 },
        { birthDate: null, languages: ["ar", "fr"], sector: "tech", interests: ["food"] },
      ],
      new Date("2026-11-26T12:00:00Z"),
    );
    expect(s).toEqual({ others: 4, ageMin: 30, ageMax: 36, languages: ["fr", "ar", "en"], sectors: ["tech"], interests: ["food", "music", "travel"] });
    expect(JSON.stringify(s)).not.toMatch(/firstName|uid/);
  });

  it("choix minimum et messages : validés", () => {
    expect(minimumChoiceSchema.safeParse({ reservationId: "r1", choice: "move" }).success).toBe(false);
    expect(minimumChoiceSchema.safeParse({ reservationId: "r1", choice: "move", targetSessionId: "s2" }).success).toBe(true);
    expect(minimumChoiceSchema.safeParse({ reservationId: "r1", choice: "refund" }).success).toBe(true);
    expect(tableMessageSchema.safeParse({ groupId: "g", text: " " }).success).toBe(false);
    expect(tableMessageSchema.safeParse({ groupId: "g", text: "x".repeat(501) }).success).toBe(false);
  });
});
