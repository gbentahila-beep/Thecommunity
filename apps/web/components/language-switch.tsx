"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const target = locale === "ar" ? "fr" : "ar";
  return (
    <Link
      href={pathname}
      locale={target}
      lang={target}
      className={`rounded-full px-3 py-2 text-sm font-medium text-plum-900 hover:bg-cream-deep ${className}`}
    >
      {t("language")}
    </Link>
  );
}
