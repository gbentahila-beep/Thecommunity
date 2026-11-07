import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReservationCard } from "@/components/account/reservation-card";
import { Link } from "@/i18n/navigation";
import { getMemberSpace, type ReservationBucket } from "@/lib/data/member";

const TABS: { key: ReservationBucket; param: string }[] = [
  { key: "upcoming", param: "a-venir" },
  { key: "past", param: "passees" },
  { key: "cancelled", param: "annulees" },
];

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/reservations">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("navBookings") };
}

export default async function ReservationsPage({ params, searchParams }: PageProps<"/[locale]/espace/reservations">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const current = TABS.find((tab) => tab.param === sp.onglet)?.key ?? "upcoming";
  const [t, space] = await Promise.all([getTranslations("account"), getMemberSpace()]);
  const labels: Record<ReservationBucket, string> = { upcoming: t("tabUpcoming"), past: t("tabPast"), cancelled: t("tabCancelled") };
  const list = space[current];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium text-plum-900">{t("navBookings")}</h1>
      <div role="tablist" aria-label={t("navBookings")} className="flex gap-1 rounded-full bg-white/70 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            role="tab"
            aria-selected={tab.key === current}
            href={`/espace/reservations?onglet=${tab.param}`}
            className={`flex-1 rounded-full px-3 py-2 text-center text-sm font-medium transition ${
              tab.key === current ? "bg-plum-900 text-white" : "text-ink hover:bg-white"
            }`}
          >
            {labels[tab.key]} <span className="opacity-70">({space[tab.key].length})</span>
          </Link>
        ))}
      </div>
      <div role="tabpanel" className="space-y-3">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">{t("emptyTab")}</p>
        ) : (
          list.map((r) => <ReservationCard key={r.id} reservation={r} />)
        )}
      </div>
    </div>
  );
}
