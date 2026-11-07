import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoBanner } from "@/components/demo-banner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { dirFor, routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

/**
 * Pages rendues à la visite (jamais pendant la compilation : en mode Firebase, la machine de build
 * n'a pas accès à la base). Le catalogue est mis en cache au niveau des données (5 min).
 */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("defaultTitle"), template: `%s · ${t("siteName")}` },
    description: t("defaultDescription"),
    applicationName: t("siteName"),
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale: locale === "ar" ? "ar_MA" : locale === "en" ? "en_GB" : "fr_MA",
      images: [{ url: "/demo/hero-diner-rooftop.webp", width: 920, height: 700 }],
    },
    alternates: { languages: { fr: "/", ar: "/ar", en: "/en" } },
  };
}

export const viewport: Viewport = {
  themeColor: "#f8efe8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${fontVariables} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <DemoBanner />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <MobileTabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
