import { DEFAULT_CANCELLATION_POLICY, formatMoney, refundAmountFor } from "@thecommunity/shared";
import { ArrowLeft, CalendarDays, CalendarPlus, CheckCircle2, Clock, Info, MapPin, Star } from "lucide-react";
import { MediaImage as Image } from "@/components/media";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/account/status-badge";
import { PayNowButton } from "@/components/booking/pay-now-button";
import { Stars } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getReviews } from "@/lib/data";
import { getMemberReservation } from "@/lib/data/member";
import { formatLongDate, formatTime, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { buildIcs, icsDataUri } from "@/lib/ics";
import { SITE_URL } from "@/lib/site";

export default async function ReservationDetailPage({ params, searchParams }: PageProps<"/[locale]/espace/reservations/[id]">) {
  const { locale: localeParam, id } = await params;
  const sp = await searchParams;
  const paymentFlag = typeof sp.paiement === "string" ? sp.paiement : undefined;
  const justBooked = sp.reservation === "confirmee";
  setRequestLocale(localeParam);
  const data = await getMemberReservation(id);
  if (!data) notFound();
  const { reservation: r, group, profile, now } = data;
  const [t, tl, locale] = await Promise.all([getTranslations("reservation"), getTranslations("labels.interests"), getLocale()]);
  const lang = locale as "fr" | "ar";
  const s = r.sessionSnapshot;
  const title = tr(s.title, locale);
  const isUpcoming = new Date(s.startAt).getTime() > now.getTime();
  const isActive = r.status === "confirmed";
  const refund = refundAmountFor(DEFAULT_CANCELLATION_POLICY, r.pricing.total, new Date(s.startAt), now);
  const review = r.reviewId ? (await getReviews()).find((x) => x.id === r.reviewId) : undefined;
  const venueText = r.venue ? `${r.venue.name}, ${r.venue.address}` : `${s.district}, Casablanca`;
  const ics = buildIcs({ uid: r.id, title, startAt: s.startAt, endAt: s.endAt, location: venueText, url: `${SITE_URL}/espace/reservations/${r.id}` });
  const dateFmt = (iso: string) => formatLongDate(iso, locale);
  const holdOpen = r.status === "pending_payment" && r.holdExpiresAt !== undefined && new Date(r.holdExpiresAt).getTime() > now.getTime();
  const total = formatMoney({ amount: r.pricing.total, currency: r.pricing.currency }, lang);

  return (
    <div className="space-y-6">
      <Link href="/espace/reservations" className="inline-flex items-center gap-2 text-sm font-medium text-plum-900">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("back")}
      </Link>

      {r.status === "confirmed" && (paymentFlag === "accepte" || justBooked) && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {t("confirmedBanner")}
        </p>
      )}

      {r.status === "pending_payment" && (
        <section className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="size-5 shrink-0" aria-hidden />
            {holdOpen ? t("pendingTitle") : t("pendingExpiredTitle")}
          </h2>
          {paymentFlag === "refuse" && holdOpen && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{t("paymentFailed")}</p>}
          <p className="mt-1 text-sm">
            {!holdOpen
              ? t("expiredText")
              : new Date(r.holdExpiresAt!).getTime() - now.getTime() > 3_600_000
                ? t("pendingTextLong", {
                    when:
                      locale === "fr"
                        ? `${formatLongDate(r.holdExpiresAt!, locale).toLowerCase()} à ${formatTime(r.holdExpiresAt!, locale)}`
                        : `${formatLongDate(r.holdExpiresAt!, locale)} ${formatTime(r.holdExpiresAt!, locale)}`,
                  })
                : t("pendingText", { time: formatTime(r.holdExpiresAt!, locale) })}
          </p>
          {holdOpen && (
            <div className="mt-4">
              <PayNowButton reservationId={r.id} label={t("payNow", { amount: total })} />
            </div>
          )}
        </section>
      )}

      {r.status === "expired" && (
        <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
          <p className="text-sm text-ink">{t("expiredText")}</p>
        </section>
      )}

      {r.status === "refunded" && r.cancellation?.by === "system" && (
        <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
          <p className="text-sm text-ink">{t("lateRefundText", { amount: formatMoney({ amount: r.cancellation.refundAmount, currency: r.pricing.currency }, lang) })}</p>
        </section>
      )}

      <article className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card">
        <div className="relative h-44 sm:h-56">
          <Image src={s.coverImagePath} alt="" fill sizes="(min-width: 1024px) 800px, 100vw" className="object-cover" priority />
        </div>
        <div className="space-y-4 p-5">
          <StatusBadge status={r.status} />
          <h1 className="font-display text-3xl font-medium text-plum-900">{title}</h1>
          <dl className="space-y-3">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-plum-700" aria-hidden />
              <div>
                <dt className="sr-only">{t("when")}</dt>
                <dd className="font-medium text-ink">{dateFmt(s.startAt)}</dd>
                <dd className="text-sm text-muted">{formatTimeRange(s.startAt, s.endAt, locale)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-plum-700" aria-hidden />
              <div>
                <dt className="sr-only">{t("where")}</dt>
                {r.venue ? (
                  <>
                    <dd className="font-medium text-ink">{r.venue.name}</dd>
                    <dd className="text-sm text-muted">{r.venue.address}</dd>
                  </>
                ) : (
                  <>
                    <dd className="font-medium text-ink">{s.district}, Casablanca</dd>
                    <dd className="text-sm text-muted">{t("venueHidden")}</dd>
                  </>
                )}
              </div>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 pt-1">
            {isActive && isUpcoming && (
              <a
                href={icsDataUri(ics)}
                download={`the-community-${s.slug}.ics`}
                className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-plum-800"
              >
                <CalendarPlus className="size-4" aria-hidden />
                {t("addToCalendar")}
              </a>
            )}
            <Link href={`/experiences/${s.slug}`} className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-plum-900 hover:bg-cream">
              {t("seeExperience")}
            </Link>
          </div>
        </div>
      </article>

      {group && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="font-display text-2xl font-medium text-plum-900">
            {t("group")} · {group.label}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("groupPrivacy")}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.members.map((m) => (
              <li key={m.uid} className="flex items-center gap-3 rounded-2xl bg-cream/70 p-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-plum-100 font-display text-lg text-plum-900" aria-hidden>
                  {m.firstName.charAt(0)}
                </span>
                <span>
                  <span className="block font-semibold text-ink">
                    {m.firstName} {m.uid === profile.uid && <span className="font-normal text-muted">({t("you")})</span>}
                  </span>
                  <span className="text-sm text-muted">{m.interests.map((i) => tl(i)).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("receipt")}</h2>
        <dl className="mt-3 divide-y divide-line text-[15px]">
          {r.seats > 1 && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">{t("seatsLabel")}</dt>
              <dd>{r.seats}</dd>
            </div>
          )}
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">{r.paidAt ? t("total") : t("totalDue")}</dt>
            <dd className="font-semibold">{total}</dd>
          </div>
          {r.paidAt && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">{t("paidLabel")}</dt>
              <dd>{dateFmt(r.paidAt)}</dd>
            </div>
          )}
          {r.cancellation && (
            <>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">{t("cancelledLabel")}</dt>
                <dd>{dateFmt(r.cancellation.at)}</dd>
              </div>
              <div className="flex justify-between py-2.5 text-emerald-800">
                <dt>{t("refundedLabel")}</dt>
                <dd className="font-semibold">{formatMoney({ amount: r.cancellation.refundAmount, currency: r.pricing.currency }, lang)}</dd>
              </div>
            </>
          )}
        </dl>
      </section>

      {isActive && isUpcoming && (
        <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
          <h2 className="font-semibold text-ink">{t("cancelTitle")}</h2>
          <p className="mt-1 text-sm text-muted">
            {refund > 0 ? t("cancelRefund", { amount: formatMoney({ amount: refund, currency: r.pricing.currency }, lang) }) : t("cancelNoRefund")}
          </p>
          <button type="button" disabled className="mt-4 cursor-not-allowed rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-muted">
            {t("cancelCta")}
          </button>
          <p className="mt-2 flex items-start gap-2 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("cancelNote")}
          </p>
        </section>
      )}

      {r.status === "attended" && (
        <section id="avis" className="scroll-mt-28 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="font-display text-2xl font-medium text-plum-900">{t("reviewTitle")}</h2>
          {review ? (
            <div className="mt-3 space-y-2">
              <Stars value={review.rating} />
              <p className="text-ink/85">{review.comment}</p>
              <p className="text-sm text-emerald-800">{t("reviewThanks")}</p>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex gap-1 text-plum-200" aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="size-7" />)}
              </div>
              <button type="button" disabled className="mt-4 cursor-not-allowed rounded-full bg-plum-900/40 px-5 py-2.5 text-sm font-semibold text-white">
                {t("reviewCta")}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
