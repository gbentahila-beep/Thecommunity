import { describe, expect, it } from "vitest";
import { composeGroups, groupCount, groupWarnings, pairKey, type MatchPerson } from "./matching";

const cfg = { minSize: 5, targetSize: 6, maxSize: 7 };
const person = (uid: string, o: Partial<MatchPerson> = {}): MatchPerson => ({ uid, seats: 1, age: 30, gender: "undisclosed", languages: ["fr"], interests: [], ...o });

describe("composition des tables", () => {
  it("nombre de tables proche de la cible, jamais au-dessus du maximum", () => {
    expect(groupCount(0, cfg)).toBe(0);
    expect(groupCount(6, cfg)).toBe(1);
    expect(groupCount(12, cfg)).toBe(2);
    expect(groupCount(15, cfg)).toBe(3); // 3 × 5 plutôt que 2 × 7,5
    expect(groupCount(30, cfg)).toBe(5);
  });

  it("tout le monde est placé, une seule fois, et les tables respectent le maximum", () => {
    const people = Array.from({ length: 23 }, (_, i) => person(`u${i}`, { age: 22 + (i % 20) }));
    const groups = composeGroups(people, cfg);
    expect(groups.flat().sort()).toEqual(people.map((p) => p.uid).sort());
    for (const g of groups) expect(g.length).toBeLessThanOrEqual(7);
    expect(groups.length).toBe(4);
  });

  it("chaque table partage une langue", () => {
    const people = [
      ...Array.from({ length: 6 }, (_, i) => person(`en${i}`, { languages: ["en"] })),
      ...Array.from({ length: 6 }, (_, i) => person(`ar${i}`, { languages: ["ar", "darija"] })),
    ];
    const groups = composeGroups(people, cfg);
    expect(groups).toHaveLength(2);
    for (const g of groups) {
      const ms = g.map((uid) => people.find((p) => p.uid === uid)!);
      expect(groupWarnings(ms, cfg)).not.toContain("no_common_language");
    }
  });

  it("évite de remettre ensemble des personnes déjà attablées ensemble", () => {
    const people = Array.from({ length: 12 }, (_, i) => person(`u${i}`));
    const past = new Set<string>();
    // u0..u5 se sont déjà rencontrés : on les sépare.
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) past.add(pairKey(`u${i}`, `u${j}`));
    const groups = composeGroups(people, cfg, { pastPairs: past });
    for (const g of groups) expect(g.filter((u) => Number(u.slice(1)) < 6).length).toBeLessThanOrEqual(3);
  });

  it("une réservation de plusieurs places reste ensemble et compte pour ses places", () => {
    const people = [person("duo", { seats: 2 }), ...Array.from({ length: 10 }, (_, i) => person(`u${i}`))];
    const groups = composeGroups(people, cfg);
    expect(groups).toHaveLength(2);
    expect(groups.flat().filter((u) => u === "duo")).toHaveLength(1);
  });

  it("une personne sans langue renseignée ne bloque pas la langue commune", () => {
    const g = [person("a", { languages: ["en"] }), person("b", { languages: [] }), person("c", { languages: ["fr", "en"] })];
    expect(groupWarnings(g, cfg)).not.toContain("no_common_language");
  });

  it("résultat déterministe", () => {
    const people = Array.from({ length: 17 }, (_, i) => person(`u${i}`, { age: 20 + i, gender: i % 2 ? "female" : "male", interests: i % 3 ? ["food"] : ["sport"] }));
    expect(composeGroups(people, cfg)).toEqual(composeGroups(people, cfg));
  });
});
