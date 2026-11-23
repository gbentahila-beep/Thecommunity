"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<(typeof routing.locales)[number], { short: string; name: string }> = {
  fr: { short: "FR", name: "Français" },
  ar: { short: "عربي", name: "العربية" },
  en: { short: "EN", name: "English" },
};

/** Choix de la langue, version compacte pour l'en-tête (ordinateur). */
export function LanguageMenu() {
  const locale = useLocale() as (typeof routing.locales)[number];
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-cream-deep [&::-webkit-details-marker]:hidden" aria-label={`${t("language")} : ${LABELS[locale].name}`}>
        <Globe className="size-4" aria-hidden />
        {LABELS[locale].short}
        <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden />
      </summary>
      <nav aria-label={t("language")} className="absolute end-0 z-40 mt-2 w-40 rounded-2xl border border-line bg-white p-1.5 shadow-float">
        {routing.locales.map((l) => (
          <Link key={l} href={pathname} locale={l} lang={l} aria-current={l === locale ? "true" : undefined} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-cream ${l === locale ? "font-semibold text-brand-900" : "text-ink"}`}>
            {LABELS[l].name}
            <span className="text-xs text-muted">{LABELS[l].short}</span>
          </Link>
        ))}
      </nav>
    </details>
  );
}
