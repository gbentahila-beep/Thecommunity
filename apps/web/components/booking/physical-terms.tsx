"use client";

import { useTranslations } from "next-intl";
import { richText } from "@/lib/rich-text";

/**
 * 18c — Case obligatoire pour les activités physiques : la personne accepte les conditions de participation
 * (état de santé, consignes, risques). Vérifiée aussi par le serveur, qui enregistre la version et la date.
 */
export function PhysicalTermsCheckbox({ checked, onChange, error, disabled }: { checked: boolean; onChange: (v: boolean) => void; error: boolean; disabled?: boolean }) {
  const t = useTranslations("booking");
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-card" data-testid="physical-terms">
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error}
          aria-describedby={error ? "physical-terms-error" : undefined}
          className="mt-0.5 size-5 shrink-0 accent-plum-900"
        />
        <span>{richText(t.raw("physicalTerms") as string, "")}</span>
      </label>
      {error && <p id="physical-terms-error" role="alert" className="mt-2 text-sm text-red-800">{t("physicalTermsRequired")}</p>}
    </div>
  );
}
