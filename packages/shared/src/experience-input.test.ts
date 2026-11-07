import { describe, expect, it } from "vitest";
import { experienceInputSchema, marginPerSeat, planSessionDates } from "./experience-input";
import { zonedParts } from "./time";

const valid = {
  titleFr: "Dîner entre inconnus",
  summaryFr: "Rencontrez de nouvelles personnes autour d'un dîner.",
  descriptionFr: "Chaque jeudi, des tables de six personnes qui ne se connaissent pas.",
  categoryId: "eat",
  cityId: "casablanca",
  district: "Gauthier",
  venueName: "Restaurant partenaire",
  address: "Rue X, Gauthier, Casablanca",
  revealPolicy: "on_group_reveal",
  bookingMode: "social_dinner",
  groupMin: 5,
  groupTarget: 6,
  groupMax: 7,
  maxSeatsPerBooking: 1,
  priceDh: 169,
  durationMinutes: 150,
  languages: ["fr"],
  alcoholServed: false,
  cancellationPolicyId: "standard-48h",
  partnerId: "",
  economicsModel: "own",
  costPerSeatDh: 95,
  status: "draft",
  sessions: { firstDate: "2026-11-12", time: "19:30", weeks: 4, capacity: 30 },
};

const issues = (input: unknown) => {
  const r = experienceInputSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}:${i.message}`);
};

describe("formulaire expérience", () => {
  it("accepte un dîner social complet", () => {
    expect(issues(valid)).toEqual([]);
  });
  it("exige la taille des groupes pour les modes groupe et dîner", () => {
    expect(issues({ ...valid, groupMin: undefined })).toContain("groupMin:required");
    expect(issues({ ...valid, groupMin: 7, groupTarget: 6 })).toContain("groupTarget:groupOrder");
  });
  it("refuse une capacité inférieure à un groupe", () => {
    expect(issues({ ...valid, sessions: { ...valid.sessions, capacity: 3 } })).toContain("sessions.capacity:capacityBelowGroup");
  });
  it("exige un partenaire et un taux pour le modèle commission", () => {
    const r = issues({ ...valid, economicsModel: "commission", costPerSeatDh: undefined });
    expect(r).toContain("commissionPercent:required");
    expect(r).toContain("partnerId:partnerRequired");
  });
  it("interdit la révélation différée sans groupes", () => {
    expect(issues({ ...valid, bookingMode: "individual", groupMin: undefined, groupTarget: undefined, groupMax: undefined })).toContain(
      "revealPolicy:revealNeedsGroups",
    );
  });
  it("limite les places par réservation hors mode libre ou privatisé", () => {
    expect(issues({ ...valid, maxSeatsPerBooking: 4 })).toContain("maxSeatsPerBooking:seatsPerBookingMode");
  });
  it("convertit les champs numériques saisis en texte", () => {
    const r = experienceInputSchema.safeParse({ ...valid, priceDh: "169", sessions: { ...valid.sessions, weeks: "2" } });
    expect(r.success && r.data.priceDh).toBe(169);
  });
});

describe("récurrence hebdomadaire", () => {
  it("génère N dates à la même heure locale", () => {
    const dates = planSessionDates({ firstDate: "2026-11-12", time: "19:30", weeks: 3 }, 150, "Africa/Casablanca");
    expect(dates).toHaveLength(3);
    for (const [i, d] of dates.entries()) {
      const p = zonedParts(new Date(d.startAt), "Africa/Casablanca");
      expect([p.day, p.hour, p.minute, p.weekday]).toEqual([12 + i * 7, 19, 30, 4]);
      expect(new Date(d.endAt).getTime() - new Date(d.startAt).getTime()).toBe(150 * 60_000);
    }
  });
});

describe("marge", () => {
  it("calcule la marge par place", () => {
    expect(marginPerSeat(16900, "own", 9500)).toBe(7400);
    expect(marginPerSeat(18000, "commission", 0, 15)).toBe(2700);
  });
});
