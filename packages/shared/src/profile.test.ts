import { describe, expect, it } from "vitest";
import { ageBand, ageOn, profileIdentitySchema, profileInterestsSchema, profileSchema } from "./profile";

const today = new Date("2026-11-07T12:00:00Z");

describe("âge", () => {
  it("calcule l'âge révolu", () => {
    expect(ageOn("2008-11-07", today)).toBe(18);
    expect(ageOn("2008-11-08", today)).toBe(17);
    expect(ageOn("1990-01-01", today)).toBe(36);
  });
  it("donne une tranche d'âge", () => {
    expect(ageBand(18)).toBe("18-24");
    expect(ageBand(31)).toBe("30-34");
    expect(ageBand(62)).toBe("50+");
  });
});

describe("questionnaire", () => {
  const identity = { firstName: "Salma", lastName: "B.", birthDate: "1994-05-12", cityId: "casablanca" };
  it("accepte une identité valide, téléphone et genre facultatifs", () => {
    expect(profileIdentitySchema.safeParse(identity).success).toBe(true);
    expect(profileIdentitySchema.safeParse({ ...identity, phone: "+212 6 12 34 56 78", gender: "undisclosed" }).success).toBe(true);
  });
  it("refuse les moins de 18 ans", () => {
    const r = profileIdentitySchema.safeParse({ ...identity, birthDate: "2015-01-01" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("tooYoung");
  });
  it("exige au moins 3 centres d'intérêt et une langue", () => {
    expect(profileInterestsSchema.safeParse({ languages: ["fr"], interests: ["art", "music"] }).success).toBe(false);
    expect(profileInterestsSchema.safeParse({ languages: [], interests: ["art", "music", "sport"] }).success).toBe(false);
    expect(profileInterestsSchema.safeParse({ languages: ["fr"], interests: ["art", "music", "sport"] }).success).toBe(true);
  });
  it("refuse les valeurs inconnues", () => {
    expect(profileInterestsSchema.safeParse({ languages: ["klingon"], interests: ["art", "music", "sport"] }).success).toBe(false);
  });
  it("valide le profil complet", () => {
    const full = { ...identity, languages: ["fr", "darija"], interests: ["gastronomy", "art", "music"], socialGoals: ["meet_new_people"], bio: "" };
    expect(profileSchema.safeParse(full).success).toBe(true);
  });
});
