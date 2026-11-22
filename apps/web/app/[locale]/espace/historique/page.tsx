import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { FavoritesList } from "@/components/account/favorites-list";
import { EmptyState } from "@/components/empty-state";
import { Bab } from "@/components/brand/bab";
import { babForCategory } from "@/components/brand/bab-art";
import { MediaImage as Image } from "@/components/media";
import { Link } from "@/i18n/navigation";
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
  const [t, te, locale, space, experiences, archived, nextSessions] = await Promise.all([
    getTranslations("history"),
    getTranslations("emptyStates"),
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
    <div className="space-y-10" data-testid="history">
      <h1 className="page-title">{t("title")}</h1>
      <section className="space-y-3">
        <h2 className="section-title">
          {t("past")}
          {space.past.length > 0 && <Bab name="wen" mood="party" className="ms-2 inline-block w-11 align-[-6px]" />}
        </h2>
        {space.past.length === 0 ? (
          <EmptyState bab="memo" prop="notebook" title={te("pastTitle")} text={t("pastEmpty")} action={{ href: "/experiences", label: te("firstOuting") }} />
        ) : (
          <ul className="card divide-y divide-line/70 overflow-hidden" data-testid="past-list">
            {space.past.map((r) => (
              <li key={r.id} className="relative flex min-w-0 items-center gap-3.5 px-4 py-3.5">
                <div className="relative shrink-0">
                  <div className="relative size-16 overflow-hidden rounded-xl bg-cream-deep">
                    <Image src={r.sessionSnapshot.coverImagePath} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                  <Bab name={babForCategory(r.sessionSnapshot.categoryId)} className="absolute -end-2 -bottom-2 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/espace/reservations/${r.id}`} className="block truncate text-[15px] font-semibold text-ink after:absolute after:inset-0">
                    {tr(r.sessionSnapshot.title, locale)}
                  </Link>
                  <p className="truncate text-sm text-muted">{formatLongDate(r.sessionSnapshot.startAt, locale)} · {r.sessionSnapshot.district}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.reviewId ? "bg-emerald-50 text-emerald-800" : "bg-brand-50 text-brand-800"}`}>
                    {r.reviewId ? t("reviewed") : t("notReviewed")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="section-title">{t("favorites")}</h2>
        <FavoritesList experiences={candidates} />
      </section>
    </div>
  );
}
