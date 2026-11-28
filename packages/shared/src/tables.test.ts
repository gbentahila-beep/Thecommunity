import { describe, expect, it } from "vitest";
import { bookingClosesAt } from "./booking";
import { MOROCCO_TIMEZONE } from "./constants";
import { zonedDateTimeToUtc, zonedParts } from "./time";
import { isTablesFlow, minimumMet, proposalResponseSchema, revealAtFor, riskDecisionSchema, tableMessageSchema, tableSummary, tablesOutOfBounds, tablesTimeline } from "./tables";

describe("parcours des Tables (docs/22 § 17.H)", () => {
  it("timeline du 24/11 : options veille 15h, appel 18h30, fermeture 20h30, dévoilement 21h30, récap J 11h", () => {
    const local = (d: Date) => { const z = zonedParts(d, MOROCCO_TIMEZONE); return `${z.day} ${z.hour}h${String(z.minute).padStart(2, "0")}`; };
    // Dîner du mercredi 25 novembre à 20h30.
    const t = tablesTimeline(zonedDateTimeToUtc({ year: 2026, month: 11, day: 25, hour: 20, minute: 30 }, MOROCCO_TIMEZONE));
    expect(local(t.optionsAt)).toBe("24 15h00");
    expect(local(t.callAt)).toBe("24 18h30");
    expect(local(t.closesAt)).toBe("24 20h30");
    expect(local(t.revealAt)).toBe("24 21h30");
    expect(local(t.recapAt)).toBe("25 11h00");
    expect(local(t.finalAt)).toBe("25 19h30");
    expect(local(t.checkInFrom)).toBe("25 20h00");
    expect(t.chatUntil.getTime() - t.chatFrom.getTime()).toBe(14 * 24 * 3_600_000 + 30 * 60_000);
  });

  it("brunch et café : mêmes heures la veille ; récap dès le dévoilement pour un début avant 14 h", () => {
    const at = (day: number, hour: number, minute = 0) => zonedDateTimeToUtc({ year: 2026, month: 11, day, hour, minute }, MOROCCO_TIMEZONE);
    const local = (d: Date) => { const z = zonedParts(d, MOROCCO_TIMEZONE); return `${z.day} ${z.hour}h${String(z.minute).padStart(2, "0")}`; };
    // Brunch du dimanche 29 à 12h30 : fermeture samedi 20h30, dévoilement et récap samedi 21h30.
    expect(local(bookingClosesAt(at(29, 12, 30), "social_dinner"))).toBe("28 20h30");
    expect(local(revealAtFor(at(29, 12, 30)))).toBe("28 21h30");
    expect(local(tablesTimeline(at(29, 12, 30)).recapAt)).toBe("28 21h30");
    // Café du samedi 28 à 16h : dévoilement vendredi 21h30, récap samedi 11h.
    expect(local(revealAtFor(at(28, 16)))).toBe("27 21h30");
    expect(local(tablesTimeline(at(28, 16)).recapAt)).toBe("28 11h00");
    // Activité : 2 h avant.
    expect(local(bookingClosesAt(at(29, 11), "group"))).toBe("29 9h00");
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
