import { describe, expect, it } from "vitest";
import { localDayAt, localDayKey, rotationDays, rotationPlan, type RotationConfig } from "./rotation";

const cycle = ["running", "ceramique", "padel", "yoga", "escape"].map((experienceId, i) => ({ experienceId, time: `${String(9 + i).padStart(2, "0")}:00`, capacity: 10 + i }));
const base: RotationConfig = { weekday: 6, anchor: "2026-11-28", cycle };
const sats = ["2026-11-28", "2026-12-05", "2026-12-12", "2026-12-19", "2026-12-26", "2027-01-02", "2027-01-09"];
const ids = (c: RotationConfig) => rotationPlan(c, sats).map((w) => w.entry?.experienceId ?? "—");

describe("activité du samedi (docs/25, lot D)", () => {
  it("une activité par samedi, puis on recommence", () => {
    expect(ids(base)).toEqual(["running", "ceramique", "padel", "yoga", "escape", "running", "ceramique"]);
    expect(rotationPlan(base, ["2026-11-21"])[0]!.entry?.experienceId).toBe("escape"); // avant le départ : même boucle
  });
  it("un samedi remplacé (ex. tennis d'un partenaire) : l'activité prévue saute son tour, la suite ne bouge pas", () => {
    const c = { ...base, overrides: { "2026-12-05": { experienceId: "tennis", time: "15:00", capacity: 8, note: "Club X" } } };
    const plan = rotationPlan(c, sats);
    expect(ids(c)).toEqual(["running", "tennis", "padel", "yoga", "escape", "running", "ceramique"]);
    expect(plan[1]).toMatchObject({ source: "override", entry: { experienceId: "tennis", time: "15:00", capacity: 8 }, note: "Club X" });
  });
  it("« décaler la rotation » : l'activité remplacée passe le samedi suivant, toute la suite recule d'une semaine", () => {
    const c = { ...base, overrides: { "2026-12-05": { experienceId: "tennis", shift: true } } };
    expect(ids(c)).toEqual(["running", "tennis", "ceramique", "padel", "yoga", "escape", "running"]);
  });
  it("pas d'activité un samedi ; heure et places reprises de la rotation si l'activité y figure", () => {
    const c = { ...base, overrides: { "2026-12-12": { experienceId: null }, "2026-12-19": { experienceId: "ceramique" } } };
    const plan = rotationPlan(c, sats);
    expect(plan[2]!.entry).toBeNull();
    expect(plan[3]!.entry).toEqual({ experienceId: "ceramique", time: "10:00", capacity: 11 });
  });
  it("jours et heures locales (Maroc)", () => {
    expect(rotationDays(6, new Date("2026-11-24T10:00:00Z"), 2)).toEqual(["2026-11-28", "2026-12-05"]);
    const at = localDayAt("2026-11-28", "11:00");
    expect(localDayKey(at)).toBe("2026-11-28");
  });
});

describe("gamme voisine (docs/25, lot C)", async () => {
  const { planTierFallback } = await import("./rendezvous");
  const mv = (ids: string[]) => ids.map((reservationId) => ({ reservationId, seats: 1 }));
  it("Exclusive à 2 (dont 1 d'accord) rejoint Premium déjà complet ; la personne non d'accord reste", () => {
    const moves = planTierFallback([
      { tier: "exclusive", sessionId: "x", people: 2, free: 10, movable: mv(["e1"]) },
      { tier: "premium", sessionId: "p", people: 8, free: 10, movable: [] },
      { tier: "casual", sessionId: "c", people: 9, free: 10, movable: [] },
    ], 4);
    expect(moves).toEqual([{ reservationId: "e1", from: "x", to: "p", toTier: "premium", seats: 1 }]);
  });
  it("Casual à 2 et Premium à 3 : ensemble ils font une table (la plus petite rejoint la plus grande)", () => {
    const moves = planTierFallback([
      { tier: "casual", sessionId: "c", people: 2, free: 10, movable: mv(["c1", "c2"]) },
      { tier: "premium", sessionId: "p", people: 3, free: 10, movable: mv(["p1", "p2", "p3"]) },
    ], 4);
    expect(moves.map((m) => `${m.reservationId}>${m.toTier}`)).toEqual(["c1>premium", "c2>premium"]);
  });
  it("personne d'accord, pas de place, ou rien à gagner : aucun déplacement", () => {
    expect(planTierFallback([{ tier: "casual", sessionId: "c", people: 2, free: 10, movable: [] }, { tier: "premium", sessionId: "p", people: 8, free: 10, movable: [] }], 4)).toEqual([]);
    expect(planTierFallback([{ tier: "casual", sessionId: "c", people: 2, free: 10, movable: mv(["c1", "c2"]) }, { tier: "premium", sessionId: "p", people: 8, free: 1, movable: [] }], 4)).toEqual([]);
    expect(planTierFallback([{ tier: "casual", sessionId: "c", people: 1, free: 10, movable: mv(["c1"]) }, { tier: "premium", sessionId: "p", people: 1, free: 10, movable: [] }], 4)).toEqual([]);
    expect(planTierFallback([{ tier: "casual", sessionId: "c", people: 6, free: 10, movable: mv(["c1"]) }, { tier: "premium", sessionId: "p", people: 6, free: 10, movable: [] }], 4)).toEqual([]);
  });
});

describe("mémoire des restaurants (lot C)", async () => {
  const { assignTablesAvoidingRepeats, venueKey } = await import("./venue");
  it("chaque table va dans le restaurant que ses membres connaissent le moins", () => {
    // Places : 0 → lieu A, 1 → lieu B. Table 0 connaît A (3 personnes), table 1 connaît B (1 personne).
    expect(assignTablesAvoidingRepeats([0, 1], [[3, 0], [0, 1]])).toEqual([1, 0]);
    expect(assignTablesAvoidingRepeats([0, 1], [[0, 3], [1, 0]])).toEqual([0, 1]);
    expect(venueKey({ partnerId: "p1", name: " La Sqala " })).toEqual(["p:p1", "n:la sqala"]);
  });
});

describe("équilibre hommes / femmes (lot C)", async () => {
  const { composeGroups, genderCost } = await import("./matching");
  it("une table d'un seul genre coûte cher quand la date est mixte ; chaque table vise la proportion de la date", () => {
    const f = (n: number) => Array.from({ length: n }, () => ({ gender: "female" as const, seats: 1 }));
    const m = (n: number) => Array.from({ length: n }, () => ({ gender: "male" as const, seats: 1 }));
    expect(genderCost([...f(3), ...m(3)], 0.5)).toBe(0);
    expect(genderCost(f(6), 0.5)).toBeGreaterThan(40);
    expect(genderCost(f(6), 1)).toBe(0); // Girls only
    const people = Array.from({ length: 12 }, (_, i) => ({ uid: `u${i}`, seats: 1, age: 30, gender: (i < 6 ? "female" : "male") as "female" | "male", languages: ["fr"], interests: [] }));
    const groups = composeGroups(people, { minSize: 4, targetSize: 6, maxSize: 6 });
    for (const g of groups) {
      const women = g.filter((u) => Number(u.slice(1)) < 6).length;
      expect(Math.abs(women - g.length / 2)).toBeLessThanOrEqual(1);
    }
  });
});
