import { describe, expect, it } from "vitest";
import { DEFAULT_EVENT_TEMPLATES, mergeTemplates, templateExperienceInput } from "./event-templates";
import { experienceInputSchema } from "./experience-input";
import { extraI18nFrom, extraText, linesI18n } from "./extra-i18n";

describe("textes secondaires en arabe et en anglais", () => {
  it("« Inclus » : la ligne n traduit la ligne n du français, une ligne vide n'est pas traduite", () => {
    expect(linesI18n("Les jeux\nLes règles", "الألعاب\nشرح القواعد", "\nRules")).toEqual([
      { fr: "Les jeux", ar: "الألعاب" },
      { fr: "Les règles", ar: "شرح القواعد", en: "Rules" },
    ]);
  });
  it("texte affiché dans la langue du site, sinon le français", () => {
    const e = { textI18n: extraI18nFrom({ dressCodeAr: "لباس رياضي", dressCodeEn: "" }) };
    expect(extraText(e, "dressCode", "Tenue de sport", "ar")).toBe("لباس رياضي");
    expect(extraText(e, "dressCode", "Tenue de sport", "en")).toBe("Tenue de sport");
    expect(extraText(e, "dressCode", "Tenue de sport", "fr")).toBe("Tenue de sport");
  });
  it("un événement créé depuis un modèle reçoit l'arabe et l'anglais (gamme comprise)", () => {
    const diner = DEFAULT_EVENT_TEMPLATES.find((t) => t.id === "diner")!;
    const input = templateExperienceInput(diner, { tier: "exclusive", firstDate: "2026-12-02", weeks: 1, cityId: "casablanca" });
    expect(experienceInputSchema.safeParse(input).success).toBe(true);
    expect(input).toMatchObject({ includedAr: "حجز المطعم", ambianceEn: "Upscale", practicalInfoEn: "Smart dress." });
  });
  it("modèle enregistré : la traduction livrée n'est reprise que si le français n'a pas changé", () => {
    const padel = DEFAULT_EVENT_TEMPLATES.find((t) => t.id === "padel")!;
    const changed = { ...padel, values: { ...padel.values, dressCode: "Tenue blanche", dressCodeAr: undefined, dressCodeEn: undefined } };
    const merged = mergeTemplates([changed]).find((t) => t.id === "padel")!;
    expect(merged.values.dressCodeEn).toBe("");
    expect(merged.values.includedEn).toBe("The booked court");
  });
});
