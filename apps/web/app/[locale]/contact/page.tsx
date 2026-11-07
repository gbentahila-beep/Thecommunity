import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/contact-form";
import { StaticPage } from "@/components/static-page";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("contactTitle") };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  return (
    <StaticPage title={t("contactTitle")} intro={t("contactText")}>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card transition hover:shadow-float"
      >
        <span className="grid size-12 place-items-center rounded-full bg-plum-50 text-plum-900">
          <Mail className="size-5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm text-muted">{t("contactEmailLabel")}</span>
          <span className="font-semibold text-ink" dir="ltr">{CONTACT_EMAIL}</span>
        </span>
      </a>
      {FIREBASE_ENABLED ? <ContactForm /> : <p className="text-sm text-muted">{t("contactDemo")}</p>}
    </StaticPage>
  );
}
