import { describe, expect, it } from "vitest";
import { DEFAULT_EVENT_TEMPLATES, mergeTemplates, nextWeekdayDate, templateInputSchema, templateSlug } from "./event-templates";

describe("modèles d'événements (docs/22, étape F)", () => {
  it("les 14 modèles du lancement, tous valides", () => {
    expect(DEFAULT_EVENT_TEMPLATES).toHaveLength(14);
    for (const t of DEFAULT_EVENT_TEMPLATES) {
      const { builtIn: _b, ...doc } = t;
      const r = templateInputSchema.safeParse(doc);
      expect(r.success, `${t.id} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });
  it("Tables : 4 formats, 3 gammes, lieu secret, sans questionnaire ; réglages communs", () => {
    const tables = DEFAULT_EVENT_TEMPLATES.filter((t) => t.values.categoryId === "eat");
    expect(tables.map((t) => t.id)).toEqual(["cafe", "brunch", "dejeuner", "diner"]);
    for (const t of tables) {
      expect(Object.keys(t.tiers ?? {})).toEqual(["casual", "premium", "exclusive"]);
      expect(t.values).toMatchObject({ revealPolicy: "on_group_reveal", groupMin: 4, groupMax: 6, questionnaire: [] });
    }
    for (const t of DEFAULT_EVENT_TEMPLATES) expect(t.values).toMatchObject({ maxSeatsPerBooking: 1, alcoholServed: false, audience: "all", membersOnly: false, cancellationPolicyId: "standard-48h" });
    expect(DEFAULT_EVENT_TEMPLATES.find((t) => t.id === "diner")!.tiers!.exclusive!.practicalInfo).toBe("Tenue soignée.");
    expect(DEFAULT_EVENT_TEMPLATES.find((t) => t.id === "yoga")!.values.included).toBe("Le cours");
  });
  it("un modèle de l'appli l'emporte sur celui du site ; ordre par univers", () => {
    const edited = { ...DEFAULT_EVENT_TEMPLATES[0]!, name: "Café du samedi", builtIn: undefined };
    const custom = { ...DEFAULT_EVENT_TEMPLATES[4]!, id: "karaoke", name: "Karaoké", builtIn: undefined, values: { ...DEFAULT_EVENT_TEMPLATES[4]!.values, categoryId: "discover" } };
    const all = mergeTemplates([edited, custom]);
    expect(all).toHaveLength(15);
    expect(all.find((t) => t.id === "cafe")).toMatchObject({ name: "Café du samedi", builtIn: true });
    expect(all.find((t) => t.id === "karaoke")?.builtIn).toBe(false);
    expect(all[0]!.values.categoryId).toBe("eat");
  });
  it("identifiant lisible et prochaine date du jour conseillé", () => {
    expect(templateSlug("Soirée karaoké")).toBe("soiree-karaoke");
    expect(templateSlug("2 en 1")).toBe("modele-2-en-1");
    expect(nextWeekdayDate(3, new Date("2026-11-22T10:00:00Z"))).toBe("2026-11-25");
    expect(nextWeekdayDate(0, new Date("2026-11-22T10:00:00Z"))).toBe("2026-11-29");
  });
});

describe("vitrine (étape M)", () => {
  it("chaque modèle donne un événement valide (Tables dans chaque gamme ; activités avec un lieu)", async () => {
    const { experienceInputSchema } = await import("./experience-input");
    const { templateExperienceInput, DEFAULT_EVENT_TEMPLATES } = await import("./event-templates");
    const venue = { name: "Lieu partenaire", address: "12 rue du Test, Casablanca", district: "Maarif", partnerId: "p1" };
    for (const t of DEFAULT_EVENT_TEMPLATES) {
      const tiers = t.values.revealPolicy === "on_group_reveal" ? (["casual", "premium", "exclusive"] as const) : [null];
      for (const tier of tiers) {
        const input = templateExperienceInput(t, { tier, firstDate: "2099-01-05", weeks: 4, cityId: "casablanca", venue: t.values.revealPolicy === "immediate" ? venue : null });
        const r = experienceInputSchema.safeParse(input);
        expect(r.success ? "ok" : `${t.id}/${tier}: ${JSON.stringify(r.error.issues.slice(0, 3))}`).toBe("ok");
      }
    }
  });
});
