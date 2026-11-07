import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { FavoritesList } from "@/components/account/favorites-list";
import { ReservationCard } from "@/components/account/reservation-card";
import { getPublishedExperiences } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/historique">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "history" }))("title") };
}

export default async function HistoryPage({ params }: PageProps<"/[locale]/espace/historique">) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const [t, locale, space, experiences] = await Promise.all([getTranslations("history"), getLocale(), getMemberSpace(), getPublishedExperiences()]);
  const candidates = experiences.map((e) => ({ id: e.id, slug: e.slug, title: tr(e.title, locale), district: e.district, image: e.images[0]?.path ?? "" }));
  return (
    <div className="space-y-10">
      <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("past")}</h2>
        {space.past.map((r) => (
          <div key={r.id} className="space-y-1">
            <ReservationCard reservation={r} />
            <p className={`ps-3 text-xs font-medium ${r.reviewId ? "text-emerald-800" : "text-plum-700"}`}>
              {r.reviewId ? t("reviewed") : t("notReviewed")}
            </p>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("favorites")}</h2>
        <FavoritesList experiences={candidates} />
      </section>
    </div>
  );
}
