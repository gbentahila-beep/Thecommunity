import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { FavoritesList } from "@/components/account/favorites-list";
import { ReservationCard } from "@/components/account/reservation-card";
import { getArchivedExperiences, getNextSessionPerExperience, getPublishedExperiences } from "@/lib/data";
import { formatLongDate } from "@/lib/format";
import { getMemberSpace } from "@/lib/data/member";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/historique">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "history" }))("title") };
}

export default async function HistoryPage({ params }: PageProps<"/[locale]/espace/historique">) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const [t, locale, space, experiences, archived, nextSessions] = await Promise.all([
    getTranslations("history"),
    getLocale(),
    getMemberSpace(),
    getPublishedExperiences(),
    getArchivedExperiences(),
    getNextSessionPerExperience(),
  ]);
  const nextAt = new Map(nextSessions.map((s) => [s.experienceId, s.startAt]));
  // Favoris (5j) : d'abord ceux qui ont une date à venir (la plus proche en premier), puis sans date, puis archivés.
  const candidates = [
    ...experiences
      .map((e) => ({ e, at: nextAt.get(e.id) ?? null }))
      .sort((a, b) => (a.at && b.at ? a.at.localeCompare(b.at) : a.at ? -1 : b.at ? 1 : 0))
      .map(({ e, at }) => ({ id: e.id, slug: e.slug, title: tr(e.title, locale), district: e.district, image: e.images[0]?.path ?? "", status: at ? ("dated" as const) : ("noDate" as const), when: at ? formatLongDate(at, locale) : null })),
    ...archived.map((e) => ({ id: e.id, slug: e.slug, title: tr(e.title, locale), district: e.district, image: e.images[0]?.path ?? "", status: "archived" as const, when: null })),
  ];
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
