"use client";

import { DIETS, SPOKEN_LANGUAGES, type BookingPreferences } from "@thecommunity/shared";
import { useTranslations } from "next-intl";

export const EMPTY_PREFERENCES: BookingPreferences = { diet: "none", allergies: "", languages: [], consent: false };
export const needsConsent = (p: BookingPreferences) => p.diet !== "none" || p.allergies.trim() !== "";

const input = "w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] focus:border-plum-700 focus:outline-none";

/** Régime, allergies, langues de table (facultatif). L'accord n'est demandé que s'il y a quelque chose à transmettre. */
export function PreferencesFields({ value, onChange, disabled, consentError, idPrefix = "pref" }: {
  value: BookingPreferences;
  onChange: (v: BookingPreferences) => void;
  disabled?: boolean;
  consentError?: boolean;
  idPrefix?: string;
}) {
  const t = useTranslations("prefs");
  const tl = useTranslations("labels.languages");
  const set = (patch: Partial<BookingPreferences>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-diet`} className="mb-1.5 block text-sm font-medium">{t("diet")}</label>
        <select id={`${idPrefix}-diet`} className={input} value={value.diet} disabled={disabled} onChange={(e) => set({ diet: e.target.value as BookingPreferences["diet"] })}>
          {DIETS.map((d) => <option key={d} value={d}>{t(`diets.${d}`)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-allergies`} className="mb-1.5 block text-sm font-medium">{t("allergies")}</label>
        <input id={`${idPrefix}-allergies`} className={input} maxLength={200} value={value.allergies} disabled={disabled} aria-describedby={`${idPrefix}-allergies-hint`} onChange={(e) => set({ allergies: e.target.value })} />
        <span id={`${idPrefix}-allergies-hint`} className="mt-1 block text-xs text-muted">{t("allergiesHint")}</span>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {SPOKEN_LANGUAGES.map((l) => {
            const on = value.languages.includes(l);
            return (
              <label key={l} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-plum-900 bg-plum-900 text-white" : "border-line bg-white text-ink"}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={disabled}
                  onChange={() => set({ languages: on ? value.languages.filter((x) => x !== l) : [...value.languages, l].slice(0, 5) })}
                />
                {tl(l)}
              </label>
            );
          })}
        </div>
      </fieldset>
      {needsConsent(value) && (
        <div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={value.consent} disabled={disabled} onChange={(e) => set({ consent: e.target.checked })} aria-invalid={consentError || undefined} aria-describedby={consentError ? `${idPrefix}-consent-err` : undefined} />
            <span>{t("consent")}</span>
          </label>
          {consentError && <p id={`${idPrefix}-consent-err`} role="alert" className="mt-1 text-xs text-red-800">{t("consentRequired")}</p>}
        </div>
      )}
    </div>
  );
}
