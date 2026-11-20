import { describe, expect, it } from "vitest";
import { composeGroups, groupWarnings, pairKey, type MatchPerson } from "./matching";
import { inviteSchema, meetAgainSchema, meetWindowOpen, otherOf } from "./meet";

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
