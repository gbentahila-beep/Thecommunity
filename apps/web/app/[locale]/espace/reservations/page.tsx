import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CancelRequestButton } from "@/components/booking/request-form";
import { LeaveWaitlistButton } from "@/components/booking/waitlist-box";
import { formatLongDate } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
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
  const [t, tq, tw, space] = await Promise.all([getTranslations("account"), getTranslations("request"), getTranslations("waitlist"), getMemberSpace()]);
  const labels: Record<ReservationBucket, string> = { upcoming: t("tabUpcoming"), past: t("tabPast"), cancelled: t("tabCancelled") };
  const list = space[current];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium text-plum-900">{t("navBookings")}</h1>
      {space.openRequests.length > 0 && (
        <section aria-labelledby="requests-title" className="space-y-3">
          <h2 id="requests-title" className="font-semibold text-ink">{tq("listTitle")}</h2>
          {space.openRequests.map((q) => (
            <article key={q.id} className="rounded-[var(--radius-card)] bg-white p-4 shadow-card">
              <Link href={`/experiences/${q.sessionSnapshot.slug}`} className="font-semibold text-ink hover:underline">{tr(q.sessionSnapshot.title, locale)}</Link>
              <p className="text-sm text-muted">{formatLongDate(q.sessionSnapshot.startAt, locale)}</p>
              <p className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${q.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-stone-200 text-stone-700"}`}>
                {q.status === "pending" ? tq("statusPending") : tq("statusDeclined")}
              </p>
              {q.status === "pending" && <div className="mt-3"><CancelRequestButton requestId={q.id} /></div>}
            </article>
          ))}
        </section>
      )}
      {space.openWaitlists.length > 0 && (
        <section aria-labelledby="waitlists-title" className="space-y-3">
          <h2 id="waitlists-title" className="font-semibold text-ink">{tw("listTitle")}</h2>
          {space.openWaitlists.map((w) => (
            <article key={`${w.sessionId}-${w.id}`} className="rounded-[var(--radius-card)] bg-white p-4 shadow-card">
              <Link href={`/reserver/${w.sessionId}`} className="font-semibold text-ink hover:underline">{tr(w.sessionSnapshot.title, locale)}</Link>
              <p className="text-sm text-muted">{formatLongDate(w.sessionSnapshot.startAt, locale)}</p>
              <p className="mt-2 text-sm text-muted">{tw("listText")}</p>
              <div className="mt-3"><LeaveWaitlistButton sessionId={w.sessionId} /></div>
            </article>
          ))}
        </section>
      )}
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
