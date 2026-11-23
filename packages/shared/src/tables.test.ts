import { describe, expect, it } from "vitest";
import { bookingClosesAt } from "./booking";
import { MOROCCO_TIMEZONE } from "./constants";
import { zonedDateTimeToUtc, zonedParts } from "./time";
import { isTablesFlow, minimumMet, proposalResponseSchema, revealAtFor, riskDecisionSchema, tableMessageSchema, tableSummary, tablesOutOfBounds, tablesTimeline } from "./tables";

describe("parcours des Tables (docs/22 § 17.H)", () => {
  it("horaires d'une date : fermeture 12 h, révélation 5 h, tables 1 h avant, check-in, messages", () => {
    const t = tablesTimeline("2026-11-26T19:30:00.000Z");
    expect(t.closesAt.toISOString()).toBe("2026-11-26T07:30:00.000Z");
    expect(t.revealAt.toISOString()).toBe("2026-11-26T14:30:00.000Z");
    expect(t.finalAt.toISOString()).toBe("2026-11-26T18:30:00.000Z");
    expect(t.checkInFrom.toISOString()).toBe("2026-11-26T19:00:00.000Z");
    expect(t.checkInUntil.toISOString()).toBe("2026-11-26T20:30:00.000Z");
    expect(t.chatFrom.toISOString()).toBe("2026-11-26T19:00:00.000Z");
    expect(t.chatUntil.toISOString()).toBe("2026-12-10T19:30:00.000Z");
  });

  it("matin et midi (décision 42) : fermeture au plus tard 18 h la veille, révélation ramenée à 21 h la veille", () => {
    const at = (day: number, hour: number) => zonedDateTimeToUtc({ year: 2026, month: 11, day, hour, minute: 0 }, MOROCCO_TIMEZONE);
    const local = (d: Date) => { const z = zonedParts(d, MOROCCO_TIMEZONE); return `${z.day} ${z.hour}h`; };
    // Brunch dimanche 29 à 11 h : fermeture samedi 18 h, révélation samedi 21 h.
    expect(local(bookingClosesAt(at(29, 11), "social_dinner"))).toBe("28 18h");
    expect(local(revealAtFor(at(29, 11)))).toBe("28 21h");
    // Déjeuner 13 h : fermeture la veille 18 h ; révélation 8 h le jour même (pas la nuit).
    expect(local(bookingClosesAt(at(29, 13), "social_dinner"))).toBe("28 18h");
    expect(local(revealAtFor(at(29, 13)))).toBe("29 8h");
    // Dîner 20 h : 12 h et 5 h avant, inchangés ; activité : 2 h avant.
    expect(local(bookingClosesAt(at(29, 20), "social_dinner"))).toBe("29 8h");
    expect(local(revealAtFor(at(29, 20)))).toBe("29 15h");
    expect(local(bookingClosesAt(at(29, 11), "group"))).toBe("29 9h");
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
    expect(riskDecisionSchema.safeParse({ sessionId: "s1", action: "propose" }).success).toBe(false);
    expect(riskDecisionSchema.safeParse({ sessionId: "s1", action: "propose", targetSessionId: "s2" }).success).toBe(true);
    expect(riskDecisionSchema.safeParse({ sessionId: "s1", action: "keep" }).success).toBe(true);
    expect(proposalResponseSchema.safeParse({ reservationId: "r1", accept: true }).success).toBe(true);
    expect(tableMessageSchema.safeParse({ groupId: "g", text: " " }).success).toBe(false);
    expect(tableMessageSchema.safeParse({ groupId: "g", text: "x".repeat(501) }).success).toBe(false);
  });
});
