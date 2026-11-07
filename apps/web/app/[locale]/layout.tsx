import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoBanner } from "@/components/demo-banner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { dirFor, routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"], display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

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
      locale: locale === "ar" ? "ar_MA" : "fr_MA",
      images: [{ url: "/demo/hero-diner-rooftop.webp", width: 920, height: 700 }],
    },
    alternates: { languages: { fr: "/", ar: "/ar" } },
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
      className={`${fraunces.variable} ${inter.variable} ${arabic.variable} antialiased`}
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
