import { bookingRefusal, DEFAULT_CANCELLATION_POLICY, formatMoney, isMemberActive, maxSeatsFor, seatsAvailable } from "@thecommunity/shared";
import { ArrowLeft, CalendarDays, Info, MapPin, MailWarning, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { MediaImage as Image } from "@/components/media";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { BookingForm } from "@/components/booking/booking-form";
import { CancelRequestButton, RequestForm } from "@/components/booking/request-form";
import { WaitlistBox } from "@/components/booking/waitlist-box";
import { memberAmountFor, PriceTag } from "@/components/price-tag";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getAccountState, getSessionUser } from "@/lib/auth/session";
import { getMembershipPlan, getSessionForBooking } from "@/lib/data";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { formatLongDate, formatTime, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

type Visitor = "anonymous" | "unverified" | "incomplete" | "suspended" | "ready";

/** Qui regarde la page ? (lu côté serveur ; le serveur de réservation revérifie de toute façon) */
type VisitorInfo = {
  state: Visitor;
  testPayments: boolean;
  request?: { id: string; status: string; reservationId?: string; createdAt?: string };
  /** Réservation active de cette personne sur cette date. */
  booked?: { id: string; pending: boolean };
  /** Rang sur la liste d'attente (1 = la prochaine place lui sera proposée), ou null. */
  waitPosition: number | null;
  /** Membre abonné à cet instant. */
  member: boolean;
};

async function visitorState(sessionId: string): Promise<VisitorInfo> {
  const user = await getSessionUser();
  const settings = (await adminDb().doc("settings/payment").get()).data();
  const testPayments = settings?.provider === "sandbox" && settings?.mode === "test";
  const base = { testPayments, waitPosition: null, member: false };
  if (!user) return { ...base, state: "anonymous" };
  const [record, account] = await Promise.all([adminAuth().getUser(user.uid), getAccountState(user.uid)]);
  if (account.suspended) return { ...base, state: "suspended" };
  if (!record.emailVerified) return { ...base, state: "unverified" };
  if (!account.onboardingCompleted) return { ...base, state: "incomplete" };
  const db = adminDb();
  const sessRef = db.doc(`sessions/${sessionId}`);
  const [req, lock, entry, mem] = await Promise.all([
    db.doc(`bookingRequests/${sessionId}_${user.uid}`).get(),
    sessRef.collection("seatLocks").doc(user.uid).get(),
    sessRef.collection("waitlist").doc(user.uid).get(),
    db.doc(`memberships/${user.uid}`).get(),
  ]);
  const m = mem.data();
  const member = isMemberActive(m ? { status: m.status, startAt: m.startAt.toDate(), endAt: m.endAt.toDate() } : null);
  const r = req.data();
  const request = r ? { id: req.id, status: r.status as string, reservationId: r.reservationId as string | undefined, createdAt: r.createdAt?.toDate().toISOString() as string | undefined } : undefined;
  let booked: VisitorInfo["booked"];
  if (lock.exists) {
    const res = (await db.doc(`reservations/${lock.data()!.reservationId}`).get()).data();
    if (res && ["confirmed", "pending_payment", "attended"].includes(res.status)) booked = { id: lock.data()!.reservationId, pending: res.status === "pending_payment" };
  }
  let waitPosition: number | null = null;
  const w = entry.data();
  if (w?.status === "waiting") {
    const ahead = await sessRef.collection("waitlist").where("status", "==", "waiting").where("createdAt", "<", w.createdAt).count().get();
    waitPosition = ahead.data().count + 1;
  }
  return { state: "ready", testPayments, request, booked, waitPosition, member };
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
  const visitor = FIREBASE_ENABLED ? await visitorState(sessionId) : null;
  const onRequest = exp.admission === "on_request";
  const tr2 = await getTranslations("request");
  // Cette personne a déjà une demande ou une place sur cette date : on lui montre d'abord SA situation,
  // même si la date est désormais complète ou fermée.
  const personal = visitor?.state === "ready" && Boolean((onRequest && visitor.request && visitor.request.status !== "cancelled") || visitor.booked);
  const here = `/reserver/${sessionId}`;
  const maxSeats = Math.min(maxSeatsFor(exp), Math.max(1, seatsAvailable(session)));
  const [plan, tCard, tm] = await Promise.all([getMembershipPlan(), getTranslations("card"), getTranslations("membership")]);
  const memberAmount = memberAmountFor(plan, session.price, exp);
  const isMember = Boolean(visitor?.member);
  // Accès anticipé : une nouvelle date est réservée aux membres pendant les premières heures.
  const earlyUntil =
    plan && plan.earlyAccessHours > 0 && session.createdAt ? new Date(new Date(session.createdAt).getTime() + plan.earlyAccessHours * 3_600_000) : null;
  const earlyLocked = Boolean(earlyUntil && !isMember && isAfterNow(earlyUntil));
  const membersLocked = Boolean(exp.membersOnly && !isMember);

  return (
    <PageShell className="max-w-3xl py-8">
      <Link href={`/experiences/${exp.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-plum-900">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="mt-4 font-display text-4xl font-medium text-plum-900">{onRequest ? tr2("pageTitle") : t("title")}</h1>

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
            <dd className="text-end">
              <PriceTag price={session.price} memberAmount={memberAmount} lang={lang} memberLabel={tCard("memberShort")} />
              {memberAmount !== null && !isMember && (
                <span className="mt-1 block text-xs text-muted">
                  {t("publicPriceNote", { price: formatMoney(session.price, lang) })}{" "}
                  <Link href="/abonnement" className="font-semibold text-plum-900 underline">{tm("become")}</Link>
                </span>
              )}
              {isMember && memberAmount !== null && <span className="mt-1 block text-xs font-medium text-emerald-800">{t("memberPriceApplied")}</span>}
            </dd>
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

      {onRequest && refusal === null && (
        <section role="note" className="mt-6 rounded-[var(--radius-card)] bg-plum-50 p-4 text-plum-900">
          <h2 className="font-semibold">{tr2("noteTitle")}</h2>
          <p className="mt-1 text-sm">{tr2("noteText")}</p>
        </section>
      )}

      {visitor?.testPayments && refusal === null && !onRequest && (
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
      ) : !personal && refusal === "full" && onRequest ? (
        <Notice title={t("fullTitle")} text={t("fullTextOnRequest")} />
      ) : !personal && refusal && refusal !== "full" ? (
        <Notice title={t("unavailableTitle")} text={t(`errors.${refusal}`)} />
      ) : visitor.state === "anonymous" ? (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          {refusal === "full" && <p className="mb-3 text-sm font-medium text-plum-900">{t("fullText")}</p>}
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
      ) : onRequest && visitor.request && visitor.request.status !== "cancelled" ? (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          {visitor.request.status === "pending" && (
            <>
              <h2 className="font-semibold text-ink">{tr2("pendingTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{tr2("pendingText")}</p>
              <div className="mt-4"><CancelRequestButton requestId={visitor.request.id} /></div>
            </>
          )}
          {visitor.request.status === "accepted" && (
            <>
              <h2 className="font-semibold text-emerald-900">{tr2("acceptedTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{tr2("acceptedText")}</p>
              {visitor.request.reservationId && (
                <Link href={`/espace/reservations/${visitor.request.reservationId}`} className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">
                  {tr2("seeReservation")}
                </Link>
              )}
            </>
          )}
          {visitor.request.status === "declined" && (
            <>
              <h2 className="font-semibold text-ink">{tr2("declinedTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{tr2("declinedText")}</p>
            </>
          )}
        </section>
      ) : visitor.booked ? (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="font-semibold text-ink">{visitor.booked.pending ? t("pendingPaymentTitle") : t("errors.already_booked")}</h2>
          <Link href={`/espace/reservations/${visitor.booked.id}`} className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">
            {visitor.booked.pending ? t("finishPayment") : t("seeMyBooking")}
          </Link>
        </section>
      ) : membersLocked ? (
        <MembersOnlyNotice title={t("membersOnlyTitle")} text={t("membersOnlyText")} cta={tm("become")} />
      ) : earlyLocked ? (
        <MembersOnlyNotice
          title={t("earlyAccessTitle")}
          text={t("earlyAccessText", { date: `${formatLongDate(earlyUntil!.toISOString(), locale)} ${formatTime(earlyUntil!.toISOString(), locale)}` })}
          cta={tm("become")}
        />
      ) : refusal === "full" ? (
        <>
          <Notice title={t("fullTitle")} text={t("fullText")} />
          <WaitlistBox sessionId={session.id} maxSeats={maxSeatsFor(exp)} position={visitor.waitPosition} />
        </>
      ) : onRequest ? (
        <RequestForm sessionId={session.id} maxSeats={maxSeats} messageRequired={Boolean(exp.requestMessageRequired)} />
      ) : (
        <BookingForm sessionId={session.id} unitAmount={isMember && memberAmount !== null ? memberAmount : session.price.amount} currency={session.price.currency} maxSeats={maxSeats} />
      )}
    </PageShell>
  );
}

/** Hors du rendu (règle de pureté React) : la page est de toute façon rendue à la demande. */
function isAfterNow(d: Date) {
  return d.getTime() > Date.now();
}

function MembersOnlyNotice({ title, text, cta }: { title: string; text: string; cta: string }) {
  return (
    <section className="mt-6 rounded-[var(--radius-card)] bg-plum-900 p-5 text-white">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-plum-50">{text}</p>
      <Link href="/abonnement" className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-plum-900">{cta}</Link>
    </section>
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
