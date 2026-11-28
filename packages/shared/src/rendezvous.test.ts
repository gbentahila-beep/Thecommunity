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

import { bookingWindow, collapseRendezvous, windowRefusal } from "./index";

describe("docs/25 — fenêtre de réservation et listes", () => {
  const e = { bookingMode: "social_dinner", closeRule: "eve" };
  const now = new Date("2026-11-24T10:00:00Z"); // mardi matin
  const dates = rendezvousDates({ weekday: 3, time: "20:30" }, now, 4).map((d, i) => ({ id: `s${i}`, startAt: d.toISOString() }));

  it("une date ouverte, la suivante pour les abonnés Pass, puis « ouvre le … » à la fermeture de la précédente", () => {
    const w = bookingWindow(dates, e, now, bookingClosesAt);
    expect(w.get("s0")).toMatchObject({ state: "open", opensAt: null });
    expect(w.get("s1")!.state).toBe("pass");
    expect(w.get("s1")!.opensAt!.getTime()).toBe(bookingClosesAt(new Date(dates[0]!.startAt), e).getTime()); // mardi 24 à 20h30
    expect(w.get("s2")!.state).toBe("later");
    expect(windowRefusal(w.get("s1"), false)).toBe("not_yet_open");
    expect(windowRefusal(w.get("s1"), true)).toBeNull();
    expect(windowRefusal(w.get("s2"), true)).toBe("not_yet_open");
    // Après la fermeture du mercredi 25 (mardi 24 à 20h30), le mercredi suivant s'ouvre.
    const later = bookingWindow(dates, e, new Date(bookingClosesAt(new Date(dates[0]!.startAt), e).getTime() + 60_000), bookingClosesAt);
    expect(later.get("s0")).toBeUndefined();
    expect(later.get("s1")!.state).toBe("open");
  });

  it("listes : une ligne par date de rendez-vous, gammes réunies ; les autres expériences inchangées", () => {
    const exp = (id: string, tier: "casual" | "premium" | "exclusive" | null, rv: string | null) => ({ id, rendezvousId: rv, venueTier: tier, ...e });
    const rows = [
      { experienceId: "c", startAt: dates[0]!.startAt, experience: exp("c", "casual", "rv") },
      { experienceId: "p", startAt: dates[0]!.startAt, experience: exp("p", "premium", "rv") },
      { experienceId: "x", startAt: dates[0]!.startAt, experience: { id: "x", rendezvousId: null, venueTier: null, bookingMode: "individual" } },
      { experienceId: "c", startAt: dates[1]!.startAt, experience: exp("c", "casual", "rv") },
    ];
    const out = collapseRendezvous(rows, now, bookingClosesAt);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ experienceId: "c", rendezvousTiers: ["casual", "premium"] });
    expect(out[1]!.experienceId).toBe("x");
  });
});

describe("docs/25 — dates hors calendrier", () => {
  it("une date gardée pour ses inscrits mais hors du jour/heure du rendez-vous n'est ni ouverte ni comptée", () => {
    const now = new Date("2026-11-24T10:00:00Z");
    const e = { bookingMode: "social_dinner", closeRule: "eve", rendezvousSlot: { weekday: 3, time: "20:30" } };
    const wed = rendezvousDates({ weekday: 3, time: "20:30" }, now, 2).map((d, i) => ({ id: `w${i}`, startAt: d.toISOString() }));
    const fri = { id: "fri", startAt: new Date(new Date(wed[0]!.startAt).getTime() + 2 * 86_400_000 - 30 * 60_000).toISOString() };
    const w = bookingWindow([wed[0]!, fri, wed[1]!], e, now, bookingClosesAt);
    expect(w.get("fri")!.state).toBe("off");
    expect(windowRefusal(w.get("fri"), true)).toBe("not_yet_open");
    expect(w.get("w1")!.state).toBe("pass"); // le vendredi ne prend pas la place de la semaine suivante
  });
});
