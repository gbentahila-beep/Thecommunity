import { describe, expect, it } from "vitest";
import { zonedDateTimeToUtc, zonedParts } from "./time";

describe("fuseau Africa/Casablanca", () => {
  it("convertit une heure locale en UTC puis revient à la même heure locale", () => {
    for (const month of [1, 3, 6, 9, 12]) {
      const utc = zonedDateTimeToUtc({ year: 2027, month, day: 14, hour: 19, minute: 30 }, "Africa/Casablanca");
      const back = zonedParts(utc, "Africa/Casablanca");
      expect([back.year, back.month, back.day, back.hour, back.minute]).toEqual([2027, month, 14, 19, 30]);
    }
  });
  it("ne suppose pas de décalage fixe", () => {
    const utc = zonedDateTimeToUtc({ year: 2027, month: 1, day: 14, hour: 19, minute: 30 }, "UTC");
    expect(utc.toISOString()).toBe("2027-01-14T19:30:00.000Z");
  });
  it("donne le jour de la semaine local", () => {
    // 1er janvier 2027 = vendredi
    expect(zonedParts(new Date("2027-01-01T12:00:00Z"), "Africa/Casablanca").weekday).toBe(5);
  });
});
