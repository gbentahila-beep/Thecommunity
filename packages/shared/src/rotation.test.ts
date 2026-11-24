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
