"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Libellé court affiché + nom complet lu par les lecteurs d'écran (dans la langue elle-même). */
const LABELS: Record<
  (typeof routing.locales)[number],
  { short: string; name: string }
> = {
  fr: { short: "FR", name: "Français" },
  ar: { short: "عربي", name: "العربية" },
  en: { short: "EN", name: "English" },
};

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <div className={`rounded-full ${className}`}>
      <nav
        aria-label={t("language")}
        className="inline-flex items-center gap-0.5 rounded-full p-0.5"
      >
        {routing.locales.map((l) => {
          const current = l === locale;
          return (
            <Link
              key={l}
              href={pathname}
              locale={l}
              lang={l}
              aria-label={LABELS[l].name}
              aria-current={current ? "true" : undefined}
              className={`rounded-full px-2.5 py-1.5 text-sm font-medium transition ${
                current
                  ? "bg-plum-900 text-white"
                  : "text-plum-900 hover:bg-cream-deep"
              }`}
            >
              {LABELS[l].short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
