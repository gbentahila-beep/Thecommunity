import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataExport } from "@/components/account/data-export";
import { PreferencesForm } from "@/components/account/preferences-form";
import { LanguageSwitch } from "@/components/language-switch";
import { getMemberSpace } from "@/lib/data/member";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/preferences">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "preferences" }))("title") };
}

export default async function PreferencesPage({ params }: PageProps<"/[locale]/espace/preferences">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, space] = await Promise.all([getTranslations("preferences"), getMemberSpace()]);
  const { profile, reservations, notifications } = space;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("notifications")}</h2>
        <PreferencesForm initial={profile.notificationPrefs} />
      </section>
      <section className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("language")}</h2>
        <LanguageSwitch className="border border-line" />
      </section>
      <section className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("myData")}</h2>
        <p className="text-sm text-muted">{t("myDataText")}</p>
        <DataExport data={{ exportedAt: new Date().toISOString(), profile, reservations, notifications }} />
        <div className="border-t border-line pt-4">
          <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-full px-1 py-2 text-sm font-semibold text-muted">
            <Trash2 className="size-4" aria-hidden />
            {t("delete")}
          </button>
          <p className="text-xs text-muted">{t("deleteNote")}</p>
        </div>
      </section>
    </div>
  );
}
