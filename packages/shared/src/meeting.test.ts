import { describe, expect, it } from "vitest";
import { audienceRefusal, crowdSummary, meetingSummary } from "./meeting";

const now = new Date("2026-11-20T12:00:00Z");
const p = (birthDate: string, interests: string[]) => ({ birthDate, interests: interests as never });

describe("« Qui allez-vous rencontrer ? » (29)", () => {
  it("rien sur les inscrits sous 4 personnes ; âge arrondi à 5 ans ; seulement les intérêts partagés", () => {
    expect(crowdSummary([p("1995-01-01", ["sport"]), p("1990-01-01", ["sport"]), p("1992-01-01", [])], now)).toBeNull();
    const c = crowdSummary([p("1998-06-01", ["sport", "art"]), p("1994-01-01", ["sport", "travel"]), p("1991-03-01", ["sport", "travel"]), p("1999-12-01", ["music"])], now)!;
    expect(c).toEqual({ count: 4, ageMin: 25, ageMax: 40, topInterests: ["sport", "travel"] });
  });
  it("taille des groupes pour les formats composés ; public et tranche d'âge visée", () => {
    const m = meetingSummary({ bookingMode: "social_dinner", groupConfig: { minSize: 4, targetSize: 6, maxSize: 6 }, languages: ["fr", "darija"], audience: "women", targetAgeMin: 25, targetAgeMax: 40 }, { capacity: 24 }, null);
    expect(m).toMatchObject({ groupSize: { min: 4, max: 6 }, composedGroups: true, audience: "women", targetAge: { min: 25, max: 40 }, crowd: null });
    expect(meetingSummary({ bookingMode: "open", languages: ["fr"] }, { capacity: 12 }, null)).toMatchObject({ groupSize: null, capacity: 12, composedGroups: false, audience: "all", targetAge: null });
  });
  it("réservé aux femmes : refus si le profil n'indique pas « femme »", () => {
    expect(audienceRefusal("women", "female")).toBeNull();
    expect(audienceRefusal("women", "male")).toBe("audience_women_only");
    expect(audienceRefusal("women", "undisclosed")).toBe("audience_women_only");
    expect(audienceRefusal("all", "male")).toBeNull();
  });
});
