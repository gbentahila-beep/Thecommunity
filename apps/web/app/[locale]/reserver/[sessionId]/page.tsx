import { bookingRefusal, formatMoney, LOW_SEATS_THRESHOLD, VENUE_REVEAL_HOURS, isMemberActive, maxSeatsFor, pricingOf, seatsAvailable, transferDeadline, TRANSFER_CUTOFF_HOURS, TRANSFER_DEADLINE_HOURS, SPOKEN_LANGUAGES, type SpokenLanguage, welcomeNeeds, restaurantBudget, placeLabel } from "@thecommunity/shared";
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
import { budgetText, memberAmountFor } from "@/components/price-tag";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getAccountState, getSessionUser } from "@/lib/auth/session";
import { getCity, getMembershipPlan, getSessionForBooking } from "@/lib/data";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { formatLongDate, formatTime, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { getCancellationPolicies, policyOf } from "@/lib/data/policies";

export const metadata: Metadata = { robots: { index: false } };

type Visitor = "anonymous" | "unverified" | "incomplete" | "suspended" | "ready";

/** Qui regarde la page ? (lu côté serveur ; le serveur de réservation revérifie de toute façon) */
type VisitorInfo = {
  state: Visitor;
  testPayments: boolean;
  /** Paiement par virement (5h) : délai et limite avant l'expérience, en heures ; null sinon. */
  transfer: { hours: number; cutoff: number } | null;
  request?: { id: string; status: string; reservationId?: string; createdAt?: string };
  /** Réservation active de cette personne sur cette date. */
  booked?: { id: string; pending: boolean };
  /** Rang sur la liste d'attente (1 = la prochaine place lui sera proposée), ou null. */
  waitPosition: number | null;
  /** Membre abonné à cet instant. */
  member: boolean;
  /** Langues du profil (proposées comme langues de table). */
  languages?: string[];
};

async function visitorState(sessionId: string): Promise<VisitorInfo> {
  const user = await getSessionUser();
  const settings = (await adminDb().doc("settings/payment").get()).data();
  const testPayments = settings?.provider === "sandbox" && settings?.mode === "test";
  const bank = settings?.provider === "bank_transfer" ? (await adminDb().doc("settings/bankTransfer").get()).data() : undefined;
  const transfer = bank ? { hours: Number(bank.deadlineHours ?? TRANSFER_DEADLINE_HOURS), cutoff: Number(bank.cutoffHours ?? TRANSFER_CUTOFF_HOURS) } : null;
  const base = { testPayments, transfer, waitPosition: null, member: false };
  if (!user) return { ...base, state: "anonymous" };
  const [record, account] = await Promise.all([adminAuth().getUser(user.uid), getAccountState(user.uid)]);
  if (account.suspended) return { ...base, state: "suspended" };
  if (!record.emailVerified) return { ...base, state: "unverified" };
  if (!account.onboardingCompleted) return { ...base, state: "incomplete" };
  const db = adminDb();
  const sessRef = db.doc(`sessions/${sessionId}`);
  const [req, lock, entry, mem, profile] = await Promise.all([
    db.doc(`bookingRequests/${sessionId}_${user.uid}`).get(),
    sessRef.collection("seatLocks").doc(user.uid).get(),
    sessRef.collection("waitlist").doc(user.uid).get(),
    db.doc(`memberships/${user.uid}`).get(),
    db.doc(`users/${user.uid}`).get(),
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
  const languages = Array.isArray(profile.data()?.languages) ? (profile.data()!.languages as string[]) : [];
  return { state: "ready", testPayments, transfer, request, booked, waitPosition, member, languages };
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
  const city = await getCity(exp.cityId);
  const lang = locale as "fr" | "ar" | "en";
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
  const twoPart = pricingOf(exp);
  const memberAmount = memberAmountFor(plan, session.price, exp);
  const isMember = Boolean(visitor?.member);
  // Accès anticipé (docs/22, décision 9) : réglé par événement en jours ; à défaut (anciennes fiches), réglage de la formule.
  const earlyHours = typeof exp.earlyAccessDays === "number" ? exp.earlyAccessDays * 24 : plan?.earlyAccessHours ?? 0;
  const earlyUntil = earlyHours > 0 && session.createdAt ? new Date(new Date(session.createdAt).getTime() + earlyHours * 3_600_000) : null;
  const earlyLocked = Boolean(earlyUntil && !isMember && isAfterNow(earlyUntil));
  const membersLocked = Boolean(exp.membersOnly && !isMember);

  const budget = restaurantBudget(exp);
  const onSiteValue =
    twoPart?.model === "fixed_partner" && twoPart.partner?.price
      ? t("onSitePerPerson", { amount: formatMoney(twoPart.partner.price, lang) })
      : twoPart?.model === "variable_consumption"
        ? budget ? t("onSiteBudget", { amount: budgetText(budget, lang) }) : t("onSiteConsumption")
        : t("onSiteNothing");
  return (
    <PageShell className="max-w-3xl py-8">
      <Link href={`/experiences/${exp.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-brand-900">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="page-title mt-4">{onRequest ? tr2("pageTitle") : t("title")}</h1>

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
              <CalendarDays className="size-4 shrink-0 text-brand-700" aria-hidden />
              {formatLongDate(session.startAt, locale)} · {formatTimeRange(session.startAt, session.endAt, locale)}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4 shrink-0 text-brand-700" aria-hidden />
              {exp.venue.revealPolicy === "on_group_reveal" ? t("secretVenueShort", { hours: VENUE_REVEAL_HOURS }) : placeLabel(exp.district, city ? tr(city.name, locale) : "Casablanca")}
            </p>
          </div>
        </div>
        {/* Étape T : l'essentiel du prix en deux lignes (en ligne, sur place), puis l'annulation en petit. */}
        <dl className="divide-y divide-line border-t border-line px-4 text-[15px]">
          <div className="flex justify-between gap-3 py-3">
            <dt className="text-muted">{t("onlineLine")}</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(session.price, lang)}</dd>
          </div>
          <div className="flex justify-between gap-3 py-3" data-testid="on-site">
            <dt className="text-muted">{t("onSiteLine")}</dt>
            <dd className="text-end">{onSiteValue}</dd>
          </div>
        </dl>
        <p className="border-t border-line px-4 py-3 text-sm text-muted">
          {tr(policyOf(await getCancellationPolicies(), session.experience.cancellationPolicyId).label, locale)}.
          {refusal === null && seatsAvailable(session) <= LOW_SEATS_THRESHOLD && <span className="font-semibold text-brand-700"> {tCard("lastSeats", { count: seatsAvailable(session) })}</span>}
        </p>
      </section>


      {onRequest && refusal === null && (
        <section role="note" className="mt-6 rounded-[var(--radius-card)] bg-brand-50 p-4 text-brand-900">
          <h2 className="font-semibold">{tr2("noteTitle")}</h2>
          <p className="mt-1 text-sm">{tr2("noteText")}</p>
        </section>
      )}

      {visitor?.transfer && refusal === null && !onRequest && (
        <p role="note" className="mt-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">{t("transferModeNote")}</p>
      )}

      {visitor?.testPayments && refusal === null && !onRequest && (
        <p role="note" className="mt-4 text-center text-xs text-amber-900">{t("testModeNote")}</p>
      )}

      {!visitor ? (
        // Mode démonstration : aucune réservation possible.
        <>
          <Notice title={refusal === "full" ? t("fullTitle") : t("demoTitle")} text={refusal === "full" ? t("fullText") : t("demoText")} />
          <button type="button" disabled aria-disabled className="mt-6 w-full cursor-not-allowed rounded-full bg-brand-900/40 px-6 py-4 font-semibold text-white">
            {t("payCta")}
          </button>
        </>
      ) : !personal && refusal === "full" && onRequest ? (
        <Notice title={t("fullTitle")} text={t("fullTextOnRequest")} />
      ) : !personal && refusal && refusal !== "full" ? (
        <Notice title={t("unavailableTitle")} text={t(`errors.${refusal}`)} />
      ) : visitor.state === "anonymous" ? (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          {refusal === "full" && <p className="mb-3 text-sm font-medium text-brand-900">{t("fullText")}</p>}
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <UserRound className="size-5 text-brand-700" aria-hidden />
            {t("signInTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("signInText")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/connexion?suite=${encodeURIComponent(here)}`} className="btn btn-primary btn-sm">
              {t("signInCta")}
            </Link>
            <Link href={`/inscription?suite=${encodeURIComponent(here)}`} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-brand-900">
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
          <Link href={`/bienvenue?suite=${encodeURIComponent(here)}`} className="btn btn-primary btn-sm mt-4">
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
                <Link href={`/espace/reservations/${visitor.request.reservationId}`} className="btn btn-primary btn-sm mt-4">
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
          <Link href={`/espace/reservations/${visitor.booked.id}`} className="btn btn-primary btn-sm mt-4">
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
          <WaitlistBox sessionId={session.id} maxSeats={maxSeatsFor(exp)} position={visitor.waitPosition} questions={exp.questionnaire ?? []} physical={exp.physicalActivity === true} />
        </>
      ) : visitor.transfer && transferClosed(new Date(session.startAt), visitor.transfer) && !onRequest ? (
        <Notice title={t("transferTooLateTitle")} text={t("transferTooLateText", { cutoff: visitor.transfer.cutoff })} />
      ) : onRequest ? (
        <RequestForm sessionId={session.id} maxSeats={maxSeats} messageRequired={Boolean(exp.requestMessageRequired)} instagramRequired={Boolean(exp.requestInstagramRequired)} defaultLanguages={profileLanguages(visitor.languages)} physical={exp.physicalActivity === true} questions={exp.questionnaire ?? []} needs={welcomeNeeds(exp)} />
      ) : (
        <BookingForm
          sessionId={session.id}
          unitAmount={isMember && memberAmount !== null ? memberAmount : session.price.amount}
          currency={session.price.currency}
          onSite={twoPart.partner ? { unit: twoPart.partner.price?.amount ?? null, partner: exp.venue.revealPolicy === "immediate" ? twoPart.partner.name : "", description: twoPart.partner.description } : null}
          maxSeats={maxSeats}
          transfer={visitor.transfer}
          defaultLanguages={profileLanguages(visitor.languages)}
          physical={exp.physicalActivity === true}
          questions={exp.questionnaire ?? []}
          needs={welcomeNeeds(exp)}
        />
      )}
    </PageShell>
  );
}

/** Virement : date trop proche pour qu'un virement arrive avant la limite (hors du rendu, comme isAfterNow). */
function transferClosed(start: Date, o: { hours: number; cutoff: number }) {
  return transferDeadline(new Date(), start, { deadlineHours: o.hours, cutoffHours: o.cutoff }) === null;
}

/** Hors du rendu (règle de pureté React) : la page est de toute façon rendue à la demande. */
function isAfterNow(d: Date) {
  return d.getTime() > Date.now();
}

function MembersOnlyNotice({ title, text, cta }: { title: string; text: string; cta: string }) {
  return (
    <section className="mt-6 rounded-[var(--radius-card)] bg-brand-50 p-5 text-ink">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink/80">{text}</p>
      <Link href="/abonnement" className="btn btn-primary mt-4 inline-flex">{cta}</Link>
    </section>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <section role="note" className="mt-6 flex gap-3 rounded-[var(--radius-card)] bg-brand-50 p-4 text-brand-900">
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm">{text}</p>
      </div>
    </section>
  );
}

/** Langues du profil reconnues comme langues de table. */
function profileLanguages(l: string[] | undefined) {
  return (l ?? []).filter((x): x is SpokenLanguage => (SPOKEN_LANGUAGES as readonly string[]).includes(x)).slice(0, 5);
}
