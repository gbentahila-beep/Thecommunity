import { describe, expect, it } from "vitest";
import { partnerInputSchema } from "./admin-catalog";
import { allocateTables, allocationSettingsOf, partnerMatches, partnerUnitsAt, peopleFor, reliabilityOf, venueRecapText, venueRequestText, waNumber, whatsappWebUrl } from "./allocation";
import { MOROCCO_TIMEZONE } from "./constants";
import { zonedDateTimeToUtc } from "./time";

const at = (day: number, hour: number) => zonedDateTimeToUtc({ year: 2026, month: 11, day, hour, minute: 0 }, MOROCCO_TIMEZONE);
// Lundi 23 novembre 2026.
const host = { id: "a", name: "Maison A", status: "active", cityId: "casablanca", tiers: ["premium" as const], formats: ["diner"], unitMax: 6, slots: [{ weekday: 1, from: "19:00", to: "21:00", units: 4 }], exceptions: [{ date: "2026-11-30", units: 0 }] };

describe("attribution des lieux (docs/22, décisions 41 à 45)", () => {
  it("capacité d'un lieu à une date : créneau habituel, sinon rien ; exception du jour d'abord", () => {
    expect(partnerUnitsAt(host, at(23, 20))).toBe(4);
    expect(partnerUnitsAt(host, at(23, 22))).toBe(0);
    expect(partnerUnitsAt(host, at(24, 20))).toBe(0);
    expect(partnerUnitsAt(host, at(30, 20))).toBe(0);
    expect(peopleFor(host, 4, 6)).toBe(24);
    expect(peopleFor({ ...host, unitMax: 4 }, 4, 6)).toBe(16);
  });

  it("lieu compatible : actif, même ville, format et gamme", () => {
    expect(partnerMatches(host, { templateId: "diner", venueTier: "premium", cityId: "casablanca" })).toBe(true);
    expect(partnerMatches(host, { templateId: "diner", venueTier: "casual" })).toBe(false);
    expect(partnerMatches(host, { templateId: "brunch", venueTier: "premium" })).toBe(false);
    expect(partnerMatches({ ...host, status: "prospect" }, { templateId: "diner", venueTier: "premium" })).toBe(false);
    expect(partnerMatches(host, { subcategoryId: "diner", venueTier: "premium", cityId: "rabat" })).toBe(false);
  });

  it("répartition équilibrée sans dépasser les capacités ; lieux réguliers d'abord ; tables manquantes signalées", () => {
    const c = [
      { partnerId: "a", name: "A", units: 8, regular: true, reliability: 0.5 },
      { partnerId: "b", name: "B", units: 8, regular: true, reliability: 0.9 },
      { partnerId: "c", name: "C", units: 10, regular: false, reliability: 1 },
    ];
    const r = allocateTables(25, c);
    expect(r.missing).toBe(0);
    expect(Object.fromEntries(r.lines.map((l) => [l.partnerId, l.tables]))).toEqual({ b: 8, a: 8, c: 9 });
    expect(allocateTables(3, c).lines).toEqual([{ partnerId: "b", name: "B", tables: 1 }, { partnerId: "a", name: "A", tables: 1 }, { partnerId: "c", name: "C", tables: 1 }]);
    expect(allocateTables(30, c).missing).toBe(4);
    expect(allocateTables(2, [{ partnerId: "x", name: "X", units: 0, regular: true, reliability: 1 }])).toEqual({ lines: [], missing: 2 });
    expect(reliabilityOf({ requests: 4, accepted: 3 })).toBe(0.75);
    expect(reliabilityOf(null)).toBe(0.5);
  });

  it("WhatsApp : numéro marocain normalisé et lien WhatsApp Web pré-rempli", () => {
    expect(waNumber("06 12 34 56 78")).toBe("212612345678");
    expect(waNumber("+212 6 12 34 56 78")).toBe("212612345678");
    expect(waNumber("abc")).toBeNull();
    expect(whatsappWebUrl("0612345678", "Bonjour")).toBe("https://web.whatsapp.com/send?phone=212612345678&text=Bonjour");
    expect(whatsappWebUrl("", "x")).toBeNull();
  });

  it("messages prédéfinis : demande et récapitulatif", () => {
    const t = venueRequestText({ venue: "Maison A", title: "Dîner", when: "lundi 23 novembre à 20h00", format: "Dîner", tier: "Premium", tables: 3, people: 16, unit: "table", reference: "W-AB12", link: "https://wenzy.ma/partenaire/demande/x?t=y" });
    expect(t).toContain("3 tables pour 16 personnes (Dîner Premium)");
    expect(t).toContain("https://wenzy.ma/partenaire/demande/x?t=y");
    const r = venueRecapText({ venue: "Maison A", when: "lundi", title: "Dîner", tables: [{ label: "Table 1", names: ["Salma", "Karim (+1)"] }], people: 3, notes: ["Salma : végétarien"], unit: "table", link: "l" });
    expect(r).toContain("Table 1 : Salma, Karim (+1)");
    expect(r).toContain("Régimes et allergies : Salma : végétarien.");
  });

  it("fiche du lieu et réglages : validés", () => {
    const base = { name: "Maison A", type: "restaurant", status: "active", cityId: "casablanca", district: "", address: "", contactName: "", contactEmail: "", contactPhone: "", link: "", model: "purchase", defaultCommissionPercent: 0, notes: "" };
    expect(partnerInputSchema.safeParse({ ...base, slots: [{ weekday: 1, from: "21:00", to: "19:00", units: 2 }] }).success).toBe(false);
    expect(partnerInputSchema.safeParse({ ...base, unitMin: 6, unitMax: 4 }).success).toBe(false);
    const ok = partnerInputSchema.safeParse({ ...base, tiers: ["premium"], formats: ["diner"], slots: [{ weekday: 1, from: "19:00", to: "21:00", units: 4 }] });
    expect(ok.success && ok.data.unit).toBe("table");
    expect(allocationSettingsOf({ remindAfterMinutes: 90, expireAfterMinutes: 60 })).toEqual({ remindAfterMinutes: 60, expireAfterMinutes: 120 });
  });
});
