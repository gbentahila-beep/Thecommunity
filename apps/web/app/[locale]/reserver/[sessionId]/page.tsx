import { DEFAULT_CANCELLATION_POLICY, formatMoney, seatsAvailable } from "@thecommunity/shared";
import { ArrowLeft, CalendarDays, Info, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { MediaImage as Image } from "@/components/media";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/data";
import { formatLongDate, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Tunnel de réservation — PHASE 2 : récapitulatif uniquement.
 * La réservation (callable reservations-create) et le paiement arrivent en phases 4 et 5.
 */
export default async function BookingPage({ params }: PageProps<"/[locale]/reserver/[sessionId]">) {
  const { locale, sessionId } = await params;
  setRequestLocale(locale);
  const session = await getSession(sessionId);
  if (!session) notFound();
  const t = await getTranslations("booking");
  const exp = session.experience;
  const lang = locale as "fr" | "ar";
  const full = seatsAvailable(session) === 0;
  const cover = exp.images[0];

  return (
    <PageShell className="max-w-3xl py-8">
      <Link href={`/experiences/${exp.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-plum-900">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="mt-4 font-display text-4xl font-medium text-plum-900">{t("title")}</h1>

      <section className="mt-6 overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card">
        <div className="flex gap-4 p-4">
          {cover && (
            <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl">
              <Image src={cover.path} alt={tr(cover.alt, locale)} fill sizes="96px" className="object-cover" />
            </div>
          )}
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-ink">{tr(exp.title, locale)}</h2>
            <p className="flex items-center gap-2 text-sm text-muted">
              <CalendarDays className="size-4 text-plum-700" aria-hidden />
              {formatLongDate(session.startAt, locale)} · {formatTimeRange(session.startAt, session.endAt, locale)}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4 text-plum-700" aria-hidden />
              {exp.district}, Casablanca
            </p>
          </div>
        </div>
        <dl className="divide-y divide-line border-t border-line px-4 text-[15px]">
          <div className="flex justify-between py-3">
            <dt className="text-muted">{t("unitPrice")}</dt>
            <dd>{formatMoney(session.price, lang)}</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-muted">{t("seats")}</dt>
            <dd>1</dd>
          </div>
          <div className="flex justify-between py-3 text-lg font-bold">
            <dt>{t("total")}</dt>
            <dd>{formatMoney(session.price, lang)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-white/60 p-4">
        <h2 className="font-semibold text-ink">{t("policy")}</h2>
        <p className="mt-1 text-sm text-muted">{tr(DEFAULT_CANCELLATION_POLICY.label, locale)}.</p>
      </section>

      <section role="note" className="mt-6 flex gap-3 rounded-[var(--radius-card)] bg-plum-50 p-4 text-plum-900">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <h2 className="font-semibold">{full ? t("fullTitle") : t("demoTitle")}</h2>
          <p className="mt-1 text-sm">{full ? t("fullText") : t("demoText")}</p>
        </div>
      </section>

      <button
        type="button"
        disabled
        aria-disabled
        className="mt-6 w-full cursor-not-allowed rounded-full bg-plum-900/40 px-6 py-4 font-semibold text-white"
      >
        {t("payCta")}
      </button>
    </PageShell>
  );
}
