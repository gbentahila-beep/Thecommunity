import { z } from "zod";
import type { LocalizedText } from "./types";

/**
 * Textes secondaires d'un événement en arabe et en anglais (docs/22) : sur le site en arabe ou en anglais, tout
 * s'affiche dans la langue choisie. Champs concernés : « Inclus », « Pas inclus », infos pratiques, ambiance, cuisine,
 * matériel fourni, à apporter, tenue. Le français reste la référence ; un champ vide affiche le français.
 */
export const EXTRA_FIELDS = ["included", "notIncluded", "practicalInfo", "ambiance", "cuisine", "equipmentProvided", "whatToBring", "dressCode"] as const;
export type ExtraField = (typeof EXTRA_FIELDS)[number];
export type ExtraLang = "ar" | "en";
export type ExtraI18n = Partial<Record<ExtraLang, Partial<Record<ExtraField, string>>>>;

const MAX: Record<ExtraField, number> = { included: 1000, notIncluded: 1000, practicalInfo: 1000, ambiance: 60, cuisine: 60, equipmentProvided: 300, whatToBring: 300, dressCode: 200 };

/** Nom du champ de formulaire : « includedAr », « dressCodeEn »… */
export const extraKey = (f: ExtraField, l: ExtraLang) => `${f}${l === "ar" ? "Ar" : "En"}`;

/** Champs de formulaire facultatifs (à ajouter au schéma d'un événement ou d'un modèle). */
const opt = (max: number) => z.string().trim().max(max, "tooLong").optional().or(z.literal(""));
export const EXTRA_I18N_SHAPE = {
  includedAr: opt(1000),
  includedEn: opt(1000),
  notIncludedAr: opt(1000),
  notIncludedEn: opt(1000),
  practicalInfoAr: opt(1000),
  practicalInfoEn: opt(1000),
  ambianceAr: opt(60),
  ambianceEn: opt(60),
  cuisineAr: opt(60),
  cuisineEn: opt(60),
  equipmentProvidedAr: opt(300),
  equipmentProvidedEn: opt(300),
  whatToBringAr: opt(300),
  whatToBringEn: opt(300),
  dressCodeAr: opt(200),
  dressCodeEn: opt(200),
};
void MAX;
export type ExtraI18nKey = keyof typeof EXTRA_I18N_SHAPE;
export type ExtraI18nStrings = Partial<Record<ExtraI18nKey, string>>;
export const EXTRA_I18N_KEYS = Object.keys(EXTRA_I18N_SHAPE) as ExtraI18nKey[];

export type ExtraI18nValues = Partial<Record<string, unknown>>;

/** Valeurs du formulaire → traductions rangées sur l'événement (champs vides ignorés). */
export function extraI18nFrom(v: ExtraI18nValues, only: readonly ExtraField[] = EXTRA_FIELDS): ExtraI18n {
  const out: ExtraI18n = {};
  for (const l of ["ar", "en"] as const) {
    const m: Partial<Record<ExtraField, string>> = {};
    for (const f of only) {
      const raw = v[extraKey(f, l)];
      const x = typeof raw === "string" ? raw.trim() : "";
      if (x) m[f] = x;
    }
    if (Object.keys(m).length) out[l] = m;
  }
  return out;
}

/** Traductions rangées → valeurs du formulaire. */
export function extraI18nValues(t: ExtraI18n | null | undefined): Record<string, string> {
  return Object.fromEntries(EXTRA_FIELDS.flatMap((f) => (["ar", "en"] as const).map((l) => [extraKey(f, l), t?.[l]?.[f] ?? ""])));
}

/** « Inclus » : une ligne par élément, la ligne n de l'arabe et de l'anglais traduit la ligne n du français. */
export function linesI18n(fr: string | undefined, ar?: string, en?: string): LocalizedText[] {
  // Le français sans lignes vides ; l'arabe et l'anglais gardent leurs positions (ligne vide = pas traduite).
  const f = (fr ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const keep = (s?: string) => (s ?? "").split("\n").map((l) => l.trim());
  const [a, e] = [keep(ar), keep(en)];
  return f.map((x, i) => ({ fr: x, ...(a[i] ? { ar: a[i] } : {}), ...(e[i] ? { en: e[i] } : {}) }));
}

/** Texte d'un champ simple dans la langue du site (sinon le français). */
export function extraText(e: { textI18n?: ExtraI18n | null }, field: ExtraField, fr: string | null | undefined, locale: string): string {
  const l = locale === "ar" || locale === "en" ? locale : null;
  return (l && e.textI18n?.[l]?.[field]) || fr || "";
}
