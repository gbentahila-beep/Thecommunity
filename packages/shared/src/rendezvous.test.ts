import { describe, expect, it } from "vitest";
import { bookingClosesAt, isFirstOfMonth, missingTierDates, rendezvousDates, zonedParts, MOROCCO_TIMEZONE } from "./index";

const local = (d: Date) => zonedParts(d, MOROCCO_TIMEZONE);

describe("docs/25 — rendez-vous de la semaine", () => {
  const rv = { weekday: 3, time: "20:30", weeksAhead: 6 };
  const now = new Date("2026-11-24T10:00:00Z"); // mardi

  it("dates : chaque mercredi à 20h30 (heure du Maroc), 6 semaines devant soi", () => {
    const dates = rendezvousDates(rv, now, 6);
    expect(dates).toHaveLength(6);
    for (const d of dates) expect(local(d)).toMatchObject({ weekday: 3, hour: 20, minute: 30 });
    expect(local(dates[0]!)).toMatchObject({ year: 2026, month: 11, day: 25 });
  });

  it("Exclusive le premier mercredi du mois seulement ; dates existantes jamais recréées", () => {
    const all = rendezvousDates(rv, now, 6);
    const firsts = missingTierDates(rv, { frequency: "first_of_month" }, [], now);
    expect(firsts.map((d) => local(d).day)).toEqual([2]); // 2 décembre (le 6 janvier est au-delà des 6 semaines)
    expect(missingTierDates({ ...rv, weeksAhead: 8 }, { frequency: "first_of_month" }, [], now).map((d) => local(d).day)).toEqual([2, 6]);
    expect(firsts.every(isFirstOfMonth)).toBe(true);
    expect(missingTierDates(rv, { frequency: "weekly" }, all.slice(0, 2), now)).toHaveLength(4);
  });

  it("fermeture « veille 20h30 » ; sans règle, la fermeture habituelle du format", () => {
    const wed = rendezvousDates(rv, now, 1)[0]!;
    expect(local(bookingClosesAt(wed, { bookingMode: "social_dinner", closeRule: "eve" }))).toMatchObject({ day: 24, hour: 20, minute: 30 });
    expect(bookingClosesAt(wed, { bookingMode: "individual" }).getTime()).toBe(wed.getTime() - 2 * 3_600_000);
  });
});
