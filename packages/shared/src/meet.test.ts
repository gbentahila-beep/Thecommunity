import { describe, expect, it } from "vitest";
import { composeGroups, groupWarnings, pairKey, type MatchPerson } from "./matching";
import { inviteSchema, meetAgainSchema, meetWindowOpen, otherOf } from "./meet";
import { recommendFor } from "./recommend";

const person = (uid: string): MatchPerson => ({ uid, seats: 1, age: 30, gender: "undisclosed", languages: ["fr"], interests: [] });

describe("« Mes rencontres » (31)", () => {
  it("on peut dire « revoir » après l'expérience, pendant 60 jours", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    expect(meetWindowOpen("2026-11-21T10:00:00Z", now)).toBe(false);
    expect(meetWindowOpen("2026-11-19T22:00:00Z", now)).toBe(true);
    expect(meetWindowOpen("2026-09-22T12:00:00Z", now)).toBe(true);
    expect(meetWindowOpen("2026-09-20T12:00:00Z", now)).toBe(false);
  });
  it("schémas : souhait, invitation (1 à 10 personnes)", () => {
    expect(meetAgainSchema.safeParse({ groupId: "g1", otherUid: "u2", wish: true }).success).toBe(true);
    expect(meetAgainSchema.safeParse({ groupId: "g1", otherUid: "../u2", wish: true }).success).toBe(false);
    expect(inviteSchema.safeParse({ sessionId: "s1", toUids: [] }).success).toBe(false);
    expect(inviteSchema.safeParse({ sessionId: "s1", toUids: Array.from({ length: 11 }, (_, i) => `u${i}`) }).success).toBe(false);
  });
  it("l'autre personne d'une connexion", () => {
    expect(otherOf({ uids: ["a", "b"], names: { a: "Salma", b: "Lina" } }, "a")).toEqual({ uid: "b", firstName: "Lina" });
  });
  it("composition : deux personnes qui ne veulent plus être réunies sont séparées", () => {
    const cfg = { minSize: 5, targetSize: 6, maxSize: 7 };
    const people = Array.from({ length: 12 }, (_, i) => person(`u${i}`));
    const avoid = new Set([pairKey("u0", "u1"), pairKey("u2", "u3")]);
    const groups = composeGroups(people, cfg, { avoidPairs: avoid });
    for (const g of groups) {
      expect(g.includes("u0") && g.includes("u1")).toBe(false);
      expect(g.includes("u2") && g.includes("u3")).toBe(false);
    }
    expect(groupWarnings([person("u0"), person("u1")], cfg, { avoidPairs: avoid })).toContain("avoid_pair");
  });
});

describe("composition et profil (30)", () => {
  const cfg = { minSize: 3, targetSize: 3, maxSize: 3 };
  it("préférence « personnes de mon âge » : les âges sont regroupés", () => {
    const ages = [22, 23, 24, 40, 41, 42];
    const people = ages.map((age, i) => ({ ...person(`u${i}`), age, agePreference: "similar" as const }));
    const groups = composeGroups(people, cfg);
    for (const g of groups) {
      const a = g.map((uid) => people.find((p) => p.uid === uid)!.age!);
      expect(Math.max(...a) - Math.min(...a)).toBeLessThanOrEqual(4);
    }
  });
  it("niveau sportif : débutants et confirmés séparés quand c'est possible", () => {
    const levels = [1, 1, 1, 3, 3, 3];
    const people = levels.map((sportLevel, i) => ({ ...person(`u${i}`), sportLevel }));
    for (const g of composeGroups(people, cfg)) {
      const l = g.map((uid) => people.find((p) => p.uid === uid)!.sportLevel!);
      expect(Math.max(...l) - Math.min(...l)).toBe(0);
    }
  });
});

describe("suggestions « Pour vous » (30)", () => {
  const s = (id: string, categoryId: string, o: Record<string, unknown> = {}) =>
    ({ id: `s-${id}`, experienceId: id, categoryId, startAt: `2026-12-0${id.length}T10:00:00Z`, status: "published", capacity: 10, seatsConfirmed: 0, seatsHeld: 0, experience: { id, categoryId, district: "Maarif", ...o } }) as never;
  it("univers préférés d'abord, puis centres d'intérêt ; jamais une activité réservée aux femmes pour un homme", () => {
    const list = [s("a", "eat"), s("bb", "move"), s("ccc", "play"), s("dddd", "move", { audience: "women" })];
    const r = recommendFor({ favoriteCategories: ["play"], interests: ["sport"], gender: "male" }, list);
    expect(r.map((x: { experienceId: string }) => x.experienceId)).toEqual(["ccc", "bb"]);
    const her = recommendFor({ favoriteCategories: ["play"], interests: ["sport"], gender: "female" }, list);
    expect(her.map((x: { experienceId: string }) => x.experienceId)).toContain("dddd");
    expect(recommendFor({ interests: ["sport"] }, list, { exclude: new Set(["bb"]) }).map((x: { experienceId: string }) => x.experienceId)).toEqual([]);
  });
});
