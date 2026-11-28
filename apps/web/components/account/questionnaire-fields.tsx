"use client";

import { optionText, type QuestionDef, type QuestionnaireAnswers } from "@thecommunity/shared";
import { useLocale, useTranslations } from "next-intl";

/**
 * Questions à choix du questionnaire d'une expérience (18a). Réutilisé dans le tunnel de réservation
 * (avant le paiement, docs/22) et sur la réservation (pour modifier ses réponses jusqu'au début).
 */
export function QuestionnaireFields({
  questions,
  answers,
  onChange,
  missing = [],
  disabled = false,
  idPrefix = "qq",
}: {
  questions: QuestionDef[];
  answers: QuestionnaireAnswers;
  onChange: (next: QuestionnaireAnswers, answeredId: string) => void;
  missing?: string[];
  disabled?: boolean;
  idPrefix?: string;
}) {
  const t = useTranslations("questionnaire");
  const lang = useLocale() as "fr" | "ar" | "en";
  return (
    <>
      {questions.map((q, i) => {
        const label = q.label[lang] || q.label.fr;
        const isMissing = missing.includes(q.id);
        return (
          <fieldset key={q.id} id={`${idPrefix}-${q.id}`} tabIndex={-1} aria-invalid={isMissing} aria-describedby={isMissing ? `${idPrefix}-${q.id}-err` : undefined} className="space-y-2 outline-none">
            <legend className="mb-2 font-medium text-ink">
              {i + 1}. {label} {!q.required && <span className="text-sm font-normal text-muted">({t("optional")})</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {q.options.map((_, k) => {
                const on = answers[q.id] === k;
                return (
                  <label key={k} className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-700 ${on ? "border-brand-900 bg-brand-900 text-white" : "border-line bg-white text-ink hover:border-brand-700"} ${disabled ? "cursor-default opacity-70" : ""}`}>
                    <input
                      type="radio"
                      name={`${idPrefix}-${q.id}`}
                      value={k}
                      checked={on}
                      disabled={disabled}
                      onChange={() => onChange({ ...answers, [q.id]: k }, q.id)}
                      className="sr-only"
                    />
                    {optionText(q, k, lang)}
                  </label>
                );
              })}
            </div>
            {isMissing && <p id={`${idPrefix}-${q.id}-err`} role="alert" className="text-sm text-red-800">{t("required")}</p>}
          </fieldset>
        );
      })}
    </>
  );
}
