import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Français par défaut (sans préfixe) ; arabe sous /ar (RTL). Anglais plus tard (/en).
  locales: ["fr", "ar"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

export function dirFor(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
