import { bookingRefusal, DEFAULT_CANCELLATION_POLICY, formatMoney, maxSeatsFor, seatsAvailable } from "@thecommunity/shared";
import { ArrowLeft, CalendarDays, Info, MapPin, MailWarning, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { MediaImage as Image } from "@/components/media";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { BookingForm } from "@/components/booking/booking-form";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getAccountState, getSessionUser } from "@/lib/auth/session";
import { getSessionForBooking } from "@/lib/data";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { formatLongDate, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

type Visitor = "anonymous" | "unverified" | "incomplete" | "suspended" | "ready";

/** Qui regarde la page ? (lu côté serveur ; le serveur de réservation revérifie de toute façon) */
async function visitorState(): Promise<{ state: Visitor; testPayments: boolean }> {
  const user = await getSessionUser();
  const settings = (await adminDb().doc("settings/payment").get()).data();
  const testPayments = settings?.provider === "sandbox" && settings?.mode === "test";
  if (!user) return { state: "anonymous", testPayments };
  const [record, account] = await Promise.all([adminAuth().getUser(user.uid), getAccountState(user.uid)]);
  if (account.suspended) return { state: "suspended", testPayments };
  if (!record.emailVerified) return { state: "unverified", testPayments };
  if (!account.onboardingCompleted) return { state: "incomplete", testPayments };
  return { state: "ready", testPayments };
}

/**
 * Tunnel de réservation : récapitulatif, choix du nombre de places, puis réservation (places bloquées
 * 15 minutes) et paiement. En mode démonstration (sans Firebase), récapitulatif seul.
 */
export default async function BookingPage({ params }: PageProps<"/[locale]/reserver/[sessionId]">) {
  const { locale, sessionId } = await params;
  setRequestLocale(locale);
  await connection(); // places restantes et visiteur : toujours lus à la demande
  const session = await getSessionForBooking(sessionId);
  if (!session) notFound();
  const t = await getTranslations("booking");
  const exp = session.experience;
  const lang = locale as "fr" | "ar";
  const cover = exp.images[0];
  const refusal = bookingRefusal({ ...session, startAt: new Date(session.startAt) }, exp, 1);
  const visitor = FIREBASE_ENABLED ? await visitorState() : null;
  const here = `/reserver/${sessionId}`;
  const maxSeats = Math.min(maxSeatsFor(exp), Math.max(1, seatsAvailable(session)));

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
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-lg font-semibold text-ink">{tr(exp.title, locale)}</h2>
            <p className="flex items-center gap-2 text-sm text-muted">
              <CalendarDays className="size-4 shrink-0 text-plum-700" aria-hidden />
              {formatLongDate(session.startAt, locale)} · {formatTimeRange(session.startAt, session.endAt, locale)}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4 shrink-0 text-plum-700" aria-hidden />
              {exp.district}, Casablanca
            </p>
          </div>
        </div>
        <dl className="divide-y divide-line border-t border-line px-4 text-[15px]">
          <div className="flex justify-between py-3">
            <dt className="text-muted">{t("unitPrice")}</dt>
            <dd>{formatMoney(session.price, lang)}</dd>
          </div>
          {refusal === null && (
            <div className="flex justify-between py-3">
              <dt className="text-muted">{t("seatsLeft")}</dt>
              <dd>{seatsAvailable(session)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-white/60 p-4">
        <h2 className="font-semibold text-ink">{t("policy")}</h2>
        <p className="mt-1 text-sm text-muted">{tr(DEFAULT_CANCELLATION_POLICY.label, locale)}.</p>
      </section>

      {visitor?.testPayments && refusal === null && (
        <p role="note" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("testModeNote")}</p>
      )}

      {!visitor ? (
        // Mode démonstration : aucune réservation possible.
        <>
          <Notice title={refusal === "full" ? t("fullTitle") : t("demoTitle")} text={refusal === "full" ? t("fullText") : t("demoText")} />
          <button type="button" disabled aria-disabled className="mt-6 w-full cursor-not-allowed rounded-full bg-plum-900/40 px-6 py-4 font-semibold text-white">
            {t("payCta")}
          </button>
        </>
      ) : refusal === "full" ? (
        <Notice title={t("fullTitle")} text={t("fullText")} />
      ) : refusal ? (
        <Notice title={t("unavailableTitle")} text={t(`errors.${refusal}`)} />
      ) : visitor.state === "anonymous" ? (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <UserRound className="size-5 text-plum-700" aria-hidden />
            {t("signInTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("signInText")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/connexion?suite=${encodeURIComponent(here)}`} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">
              {t("signInCta")}
            </Link>
            <Link href={`/inscription?suite=${encodeURIComponent(here)}`} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-plum-900">
              {t("signUpCta")}
            </Link>
          </div>
        </section>
      ) : visitor.state === "unverified" ? (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
            <MailWarning className="size-5 text-amber-700" aria-hidden />
            {t("verifyTitle")}
          </h2>
          <VerifyEmailBanner />
        </div>
      ) : visitor.state === "incomplete" ? (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="font-semibold text-ink">{t("profileTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("profileText")}</p>
          <Link href="/bienvenue" className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">
            {t("profileCta")}
          </Link>
        </section>
      ) : visitor.state === "suspended" ? (
        <Notice title={t("unavailableTitle")} text={t("errors.suspended")} />
      ) : (
        <BookingForm sessionId={session.id} unitAmount={session.price.amount} currency={session.price.currency} maxSeats={maxSeats} />
      )}
    </PageShell>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <section role="note" className="mt-6 flex gap-3 rounded-[var(--radius-card)] bg-plum-50 p-4 text-plum-900">
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm">{text}</p>
      </div>
    </section>
  );
}
