import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage } from "@/components/static-page";

type FooterKey = "terms" | "sales" | "privacy" | "charter";

/** Fabrique les pages juridiques : contenu en attente de validation juridique (loi 09-08). */
export function legalPage(key: FooterKey) {
  async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "footer" });
    return { title: t(key) };
  }
  async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const [t, tp] = await Promise.all([getTranslations("footer"), getTranslations("pages")]);
    return (
      <StaticPage title={t(key)}>
        <p className="rounded-[var(--radius-card)] border border-dashed border-plum-200 bg-white/70 p-6 text-ink/80">{tp("legalDraft")}</p>
      </StaticPage>
    );
  }
  return { generateMetadata, Page };
}
