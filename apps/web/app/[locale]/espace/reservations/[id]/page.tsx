import { DayOfCard } from "@/components/account/day-of-card";
import { VenueCard } from "@/components/account/venue-card";
import { MemberAvatar } from "@/components/member-avatar";
import { mapsLinks } from "@/lib/maps";
import { VENUE_REVEAL_HOURS, bookingClosesAt, isTablesFlow, revealAtFor, seatsAvailable, canRequestRefund, canReview, formatMoney, refundAmountFor, ticketCode, ticketScanPath, type BookingPreferences, selfCheckInState, needsTicket, welcomeNeeds, canSignalLate, reportWindowOpen, refundBasisDate, isLatePassCancel, tablesTimeline } from "@thecommunity/shared";
import { ArrowLeft, CalendarDays, CalendarPlus, CheckCircle2, Clock, Info, MapPin, MessageCircle, Star } from "lucide-react";
import { MediaImage as Image } from "@/components/media";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ReviewForm } from "@/components/account/review-form";
import { StatusBadge } from "@/components/account/status-badge";
import { CancelReservationButton } from "@/components/booking/cancel-reservation-button";
import { PayNowButton } from "@/components/booking/pay-now-button";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { Stars } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getReservationInvoices } from "@/lib/data/invoices";
import { getMemberReservation, getMemberSpace, getRefundRequest } from "@/lib/data/member";
import { getCancellationPolicies, policyOf } from "@/lib/data/policies";
import { RefundRequestForm } from "@/components/account/refund-request-form";
import { ReportFromBooking } from "@/components/account/report-from-booking";
import { InvoiceList } from "@/components/account/invoice-list";
import { PreferencesEditor } from "@/components/booking/preferences-editor";
import { welcomeTitleKeys } from "@/components/booking/welcome-keys";
import { QuestionnaireForm } from "@/components/account/questionnaire-form";
import { getCity, getExperienceBySlug, getSession, getUpcomingSessions } from "@/lib/data";
import { MoveReservation, ProposalCard } from "@/components/booking/move-reservation";
import { formatLongDate, formatTime, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { buildIcs, icsDataUri } from "@/lib/ics";
import { qrSvg } from "@/lib/qr";
import { SITE_URL } from "@/lib/site";

export default async function ReservationDetailPage({ params, searchParams }: PageProps<"/[locale]/espace/reservations/[id]">) {
  const { locale: localeParam, id } = await params;
  const sp = await searchParams;
  const paymentFlag = typeof sp.paiement === "string" ? sp.paiement : undefined;
  const justBooked = sp.reservation === "confirmee";
  const justCancelled = sp.annulation === "ok";
  setRequestLocale(localeParam);
  const data = await getMemberReservation(id);
  if (!data) notFound();
  const { reservation: r, group, profile, now } = data;
  const space = await getMemberSpace();
  const [t, tl, ti, tb, tp, t2, tk, tv, tq, locale, invoices, experience] = await Promise.all([
    getTranslations("reservation"),
    getTranslations("labels.interests"),
    getTranslations("invoices"),
    getTranslations("booking"),
    getTranslations("prefs"),
    getTranslations("twoPart"),
    getTranslations("ticket"),
    getTranslations("transfer"),
    getTranslations("questionnaire"),
    getLocale(),
    space.session ? getReservationInvoices(space.session.uid, id) : Promise.resolve([]),
    getExperienceBySlug(r.sessionSnapshot.slug).catch(() => null),
  ]);
  // Étape 22 : politique d'annulation copiée sur la réservation (sinon celle de l'activité) ; demande de remboursement.
  const [policies, refundRequest, tr2] = await Promise.all([getCancellationPolicies(), getRefundRequest(space.session?.uid, r.id), getTranslations("refund")]);
  const policy = r.cancellationPolicy?.rules?.length ? r.cancellationPolicy : policyOf(policies, experience?.cancellationPolicyId);
  // 18a : questionnaire de l'expérience (s'il y en a un), rempli après la réservation.
  const questions = experience?.questionnaire ?? [];
  const lang = locale as "fr" | "ar" | "en";
  const s = r.sessionSnapshot;
  const title = tr(s.title, locale);
  const isUpcoming = new Date(s.startAt).getTime() > now.getTime();
  const isActive = r.status === "confirmed";
  const checkIn = selfCheckInState(s.startAt, now);
  // Audit 23/11 : après un changement de date fait par le membre, le remboursement suit la date d'origine.
  const refundBasis = refundBasisDate(new Date(s.startAt), r.refundBasisAt ? new Date(r.refundBasisAt) : null);
  const refund = refundAmountFor(policy, r.pricing.total, refundBasis, now);
  // Audit 23/11 : ce que coûte une annulation quand la place est couverte (crédits rendus ou perdus, absence du pass).
  const coveredCredits = r.pricing.coverage?.carnetSeats ?? 0;
  const creditsBack = refundAmountFor(policy, 100, refundBasis, now) > 0;
  const passLate = isLatePassCancel(r.pricing.coverage?.passSeats ?? 0, refundBasis, now);
  const coverageNotes = [
    ...(coveredCredits > 0 ? [creditsBack ? t("cancelCreditsBack", { count: coveredCredits }) : t("cancelCreditsLost", { count: coveredCredits })] : []),
    ...(passLate ? [t("cancelPassLate")] : []),
  ];
  const covered = Boolean(r.pricing.coverage && (r.pricing.coverage.passSeats > 0 || r.pricing.coverage.carnetSeats > 0));
  const refundable = Boolean(r.paymentId) && canRequestRefund({ status: r.status, sessionStartAt: s.startAt, paidAmount: r.pricing.total, refundedAmount: r.refundedAmount }, now);
  const review = data.review;
  // Audit 23/11 : la ville de la réservation (copiée à la réservation), même si l'expérience a été archivée.
  const city = await getCity(r.cityId ?? experience?.cityId ?? "casablanca");
  const cityName = city ? tr(city.name, locale) : "Casablanca";
  // Lieu pas encore communiqué (lieu secret) : la ville seulement, jamais le quartier (docs/22).
  const venueText = r.venue ? `${r.venue.name}, ${r.venue.address}` : cityName;
  const ics = buildIcs({ uid: r.id, title, startAt: s.startAt, endAt: s.endAt, location: venueText, geo: r.venue?.geo ?? null, url: `${SITE_URL}/espace/reservations/${r.id}` });
  const dateFmt = (iso: string) => formatLongDate(iso, locale);
  const holdOpen = r.status === "pending_payment" && r.holdExpiresAt !== undefined && new Date(r.holdExpiresAt).getTime() > now.getTime();
  const transfer = r.paymentMethod === "bank_transfer";
  const holdWhen = r.holdExpiresAt
    ? locale === "fr"
      ? `${formatLongDate(r.holdExpiresAt, locale).toLowerCase()} à ${formatTime(r.holdExpiresAt, locale)}`
      : `${formatLongDate(r.holdExpiresAt, locale)} ${formatTime(r.holdExpiresAt, locale)}`
    : "";
  const total = formatMoney({ amount: r.pricing.total, currency: r.pricing.currency }, lang);
  // Étape 11d : billet avec QR code dès la confirmation (ouvre la fiche du billet dans le back-office).
  // docs/16 : pas de billet sans accueil sur place (les participants indiquent eux-mêmes leur arrivée).
  const showTicket = r.status === "confirmed" && isUpcoming && needsTicket(experience, r);
  const needs = welcomeNeeds({ categoryId: experience?.categoryId ?? s.categoryId, bookingMode: experience?.bookingMode ?? s.bookingMode, foodServed: experience?.foodServed });
  const qr = showTicket ? await qrSvg(`${SITE_URL}${ticketScanPath(r.id)}`) : null;
  // docs/22 § 17.H : Tables — heure de révélation, déplacer sa réservation, proposition, résumé de table, prénoms au check-in.
  const tablesFlow = isTablesFlow(experience);
  const when = (iso: string) => (locale === "fr" ? `${formatLongDate(iso, locale).toLowerCase()} à ${formatTime(iso, locale)}` : `${formatLongDate(iso, locale)} ${formatTime(iso, locale)}`);
  const revealWhen = when(revealAtFor(s.startAt).toISOString());
  const closesAt = experience ? bookingClosesAt(new Date(s.startAt), experience) : null;
  const proposal = r.proposal?.status === "pending" && isActive ? r.proposal : null;
  const proposedSession = proposal ? await getSession(proposal.targetSessionId).catch(() => null) : null;
  // Lieu révélé (Tables) : la date ne se déplace plus.
  const canMove = isActive && isUpcoming && !proposal && !(tablesFlow && r.venue) && experience && closesAt !== null && closesAt.getTime() > now.getTime();
  const moveOptions = canMove
    ? (await getUpcomingSessions({ experienceId: experience!.id })).filter((x) => x.id !== r.sessionId && seatsAvailable(x) >= r.seats && bookingClosesAt(new Date(x.startAt), experience!).getTime() > now.getTime()).slice(0, 12).map((x) => ({ id: x.id, label: when(x.startAt) }))
    : [];
  const namesHidden = Boolean(group?.namesAtCheckIn) && !r.arrivedAt && r.status !== "attended";
  const summary = r.tableSummary && r.tableSummary.others > 0 && (namesHidden || !group) ? r.tableSummary : null;
  const [tlang, tsec, tts, td] = await Promise.all([getTranslations("labels.languages"), getTranslations("labels.sector"), getTranslations("tableSummary"), getTranslations("dayOf")]);
  // Étape Z : jour J, table, chat ouvert dès l'arrivée et gardé 14 jours.
  const startMs = new Date(s.startAt).getTime();
  const timeline = tablesTimeline(s.startAt);
  const meArrived = Boolean(r.arrivedAt) || (group?.arrivedUids ?? []).includes(profile.uid);
  const chatHref = group && meArrived && now.getTime() >= timeline.chatFrom.getTime() && now.getTime() <= timeline.chatUntil.getTime() ? `/espace/rencontres/table/${group.id}` : null;
  const statusOf = (uid: string) => ((group?.arrivedUids ?? []).includes(uid) ? "arrived" : group?.late?.[uid] ? "late" : "waiting") as "arrived" | "late" | "waiting";
  const mates = group && !namesHidden
    ? group.members.map((m) => ({ uid: m.uid, firstName: m.firstName, me: m.uid === profile.uid, status: statusOf(m.uid), lateMinutes: group.late?.[m.uid], avatar: <MemberAvatar uid={m.uid} photoPath={m.photoPath} size={40} /> }))
    : null;
  const dayOf = isActive && !needsTicket(experience, r) && checkIn !== "closed" && startMs - now.getTime() < 86_400_000;
  const sameDay = formatLongDate(s.startAt, locale) === formatLongDate(now.toISOString(), locale);
  const venueKind = (experience?.categoryId ?? s.categoryId) === "eat" ? "restaurant" : "venue";
  const showVenue = Boolean(r.venue) && ["confirmed", "attended", "pending_payment"].includes(r.status);

  return (
    <div className="space-y-6">
      <Link href="/espace/reservations" className="inline-flex items-center gap-2 text-sm font-medium text-brand-900">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("back")}
      </Link>

      {r.status === "confirmed" && (paymentFlag === "accepte" || justBooked) && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {t("confirmedBanner")}
        </p>
      )}

      {justCancelled && (r.status === "cancelled" || r.status === "refunded") && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium text-ink">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {r.cancellation && r.cancellation.refundAmount > 0
            ? r.status === "refunded"
              ? t("cancelDoneRefund", { amount: formatMoney({ amount: r.cancellation.refundAmount, currency: r.pricing.currency }, lang) })
              : t("cancelDonePending", { amount: formatMoney({ amount: r.cancellation.refundAmount, currency: r.pricing.currency }, lang) })
            : sp.tardive === "1" ? t("cancelDoneLate") : t("cancelDone")}
        </p>
      )}

      {r.status === "pending_payment" && (
        <section className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 text-amber-950">
          {r.fromWaitlist && holdOpen && <p className="mb-2 font-semibold">{t("waitlistOfferBanner")}</p>}
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="size-5 shrink-0" aria-hidden />
            {holdOpen ? (transfer ? tv("pendingTitle") : t("pendingTitle")) : t("pendingExpiredTitle")}
          </h2>
          {paymentFlag === "refuse" && holdOpen && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{t("paymentFailed")}</p>}
          {paymentFlag === "en-cours" && holdOpen && <p role="status" className="mt-2 text-sm font-medium text-ink">{t("paymentPending")}</p>}
          <p className="mt-1 text-sm" data-testid={transfer ? "transfer-pending" : undefined}>
            {!holdOpen
              ? t("expiredText")
              : transfer
                ? tv("pendingText", { reference: r.transferReference ?? "", amount: total, when: holdWhen })
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
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {transfer && r.paymentId ? (
                <Link href={`/paiement/virement/${r.paymentId}`} className="btn btn-primary btn-sm">{tv("seeInstructions")}</Link>
              ) : (
                <PayNowButton reservationId={r.id} label={t("payNow", { amount: total })} />
              )}
              {FIREBASE_ENABLED && <CancelReservationButton reservationId={r.id} label={t("releaseCta")} confirmText={t("releaseConfirm")} variant="quiet" />}
            </div>
          )}
        </section>
      )}

      {r.status === "expired" && (
        <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
          <p className="text-sm text-ink">{t("expiredText")}</p>
        </section>
      )}

      {(r.status === "cancelled" || r.status === "refunded") && r.cancellation?.by === "admin" && (
        <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
          <p className="text-sm text-ink">
            {r.cancellation.refundAmount > 0
              ? t("adminCancelRefund", { amount: formatMoney({ amount: r.cancellation.refundAmount, currency: r.pricing.currency }, lang) })
              : t("adminCancel")}
          </p>
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
          <h1 className="page-title text-start">{title}</h1>
          <dl className="space-y-3">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
              <div>
                <dt className="sr-only">{t("when")}</dt>
                <dd className="font-medium text-ink">{dateFmt(s.startAt)}</dd>
                <dd className="text-sm text-muted">{formatTimeRange(s.startAt, s.endAt, locale)}</dd>
              </div>
            </div>
            {!showVenue && (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                <div>
                  <dt className="sr-only">{t("where")}</dt>
                  {r.venue ? (
                    <>
                      <dd className="font-medium text-ink">{r.venue.name}</dd>
                      <dd className="text-sm text-muted">{r.venue.address}</dd>
                    </>
                  ) : (
                    <>
                      <dd className="font-medium text-ink">{cityName}</dd>
                      <dd className="text-sm text-muted" data-testid="venue-arrives">{tablesFlow ? tts("venueArrives", { when: revealWhen }) : t("venueHidden", { hours: VENUE_REVEAL_HOURS })}</dd>
                    </>
                  )}
                </div>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-3 pt-1">
            {isActive && isUpcoming && (
              <a
                href={icsDataUri(ics)}
                download={`the-community-${s.slug}.ics`}
                className="btn btn-primary btn-sm"
              >
                <CalendarPlus className="size-4" aria-hidden />
                {t("addToCalendar")}
              </a>
            )}
            <Link href={`/experiences/${s.slug}`} className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-brand-900 hover:bg-cream">
              {t("seeExperience")}
            </Link>
          </div>
        </div>
      </article>

      {proposal && proposedSession && (
        <ProposalCard reservationId={r.id} proposed={`${tr(proposedSession.experience.title, locale)} · ${when(proposedSession.startAt)}`} deadline={when(proposal.deadline)} />
      )}

      {canMove && closesAt && <MoveReservation reservationId={r.id} options={moveOptions} until={when(closesAt.toISOString())} />}

      {/* Jour J (étape Z) : la veille et le jour même, jusqu'à 1 h après le début ; jamais en même temps qu'un billet. */}
      {dayOf && (
        <DayOfCard
          reservationId={r.id}
          startAt={s.startAt}
          nowIso={now.toISOString()}
          timeLabel={formatTime(s.startAt, locale)}
          dayLabel={sameDay ? "today" : "tomorrow"}
          state={checkIn}
          arrived={meArrived}
          lateMinutes={r.lateMinutes}
          canLate={canSignalLate(s.startAt, now)}
          directionsUrl={r.venue && !showVenue ? mapsLinks(r.venue.name, r.venue.address, r.venue.geo).directions : undefined}
          table={mates ? { label: group!.label, mates } : null}
          chatHref={chatHref}
        />
      )}

      {showVenue && r.venue && (
        <VenueCard
          kind={venueKind}
          detail={(locale === "ar" || locale === "en" ? r.venue.cuisineI18n?.[locale] : undefined) || r.venue.cuisine}
          name={r.venue.name}
          address={r.venue.address}
          geo={r.venue.geo}
          table={tablesFlow && group && !namesHidden ? group.label : null}
          tableAfter={tablesFlow && isActive && namesHidden}
        />
      )}

      {summary && (
        <section className="card p-5" data-testid="table-summary">
          <h2 className="card-title">{tts("title")}</h2>
          <p className="mt-1 text-[15px] text-ink/80">{tts("others", { count: summary.others })}{summary.ageMin !== null && summary.ageMax !== null ? ` · ${summary.ageMin === summary.ageMax ? tts("age", { age: summary.ageMin }) : tts("ages", { min: summary.ageMin, max: summary.ageMax })}` : ""}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            {summary.languages.length > 0 && <div><dt className="inline font-medium text-ink">{tts("languages")} : </dt><dd className="inline text-muted">{summary.languages.map((l) => tlang(l as never)).join(", ")}</dd></div>}
            {summary.sectors.length > 0 && <div><dt className="inline font-medium text-ink">{tts("sectors")} : </dt><dd className="inline text-muted">{summary.sectors.map((x) => tsec(x as never)).join(", ")}</dd></div>}
            {summary.interests.length > 0 && <div><dt className="inline font-medium text-ink">{tts("interests")} : </dt><dd className="inline text-muted">{summary.interests.map((i) => tl(i as never)).join(", ")}</dd></div>}
          </dl>
          <p className="mt-3 text-xs text-muted">{tts("namesAtCheckIn")}</p>
        </section>
      )}

      {qr && (
        <section aria-labelledby="ticket-title" className="rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="ticket">
          <h2 id="ticket-title" className="card-title">{tk("title")}</h2>
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
            <div role="img" aria-label={tk("title")} className="size-48 shrink-0 rounded-xl ring-1 ring-line [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="space-y-2 text-sm text-ink">
              <p>{tk("text")}</p>
              <p className="font-mono text-base font-semibold tracking-wider text-brand-900">{tk("code", { code: ticketCode(r.id) })}</p>
              {r.partnerPaymentStatus === "due_on_site" && <p className="text-muted">{tk("onSite")}</p>}
            </div>
          </div>
        </section>
      )}

      {group && mates && !(dayOf && meArrived) && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="my-table">
          <h2 className="card-title">
            {t("group")} · {group.label}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("groupPrivacy")}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.members.map((m) => (
              <li key={m.uid} className="flex items-center gap-3 rounded-2xl bg-cream/70 p-3">
                <MemberAvatar uid={m.uid} photoPath={m.photoPath} size={44} />
                <span>
                  <span className="block font-semibold text-ink">
                    {m.firstName} {m.uid === profile.uid && <span className="font-normal text-muted">({t("you")})</span>}
                  </span>
                  <span className="text-sm text-muted">{m.interests.map((i) => tl(i)).join(" · ")}</span>
                  {checkIn === "open" && statusOf(m.uid) !== "waiting" && (
                    <span className={`mt-0.5 block text-xs font-semibold ${statusOf(m.uid) === "arrived" ? "text-emerald-800" : "text-amber-800"}`}>
                      {statusOf(m.uid) === "arrived" ? tts("arrived") : td("statusLate", { minutes: group.late?.[m.uid] ?? 0 })}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {chatHref && (
            <Link href={chatHref} className="btn btn-secondary btn-sm mt-4" data-testid="table-chat-link">
              <MessageCircle className="size-4" aria-hidden />
              {tts("chat")}
            </Link>
          )}
        </section>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="card-title">{t("receipt")}</h2>
        <dl className="mt-3 divide-y divide-line text-[15px]">
          {r.seats > 1 && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">{t("seatsLabel")}</dt>
              <dd>{r.seats}</dd>
            </div>
          )}
          {(r.pricing.memberDiscount ?? 0) > 0 && (
            <>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">{t("publicPrice")}</dt>
                <dd>{formatMoney({ amount: r.pricing.subtotal, currency: r.pricing.currency }, lang)}</dd>
              </div>
              <div className="flex justify-between py-2.5 text-emerald-800">
                <dt>{t("memberDiscount")}</dt>
                <dd>−{formatMoney({ amount: r.pricing.memberDiscount ?? 0, currency: r.pricing.currency }, lang)}</dd>
              </div>
            </>
          )}
          {(r.pricing.discount ?? 0) > 0 && (
            <div className="flex justify-between py-2.5 text-emerald-800">
              <dt>{tb("promoLine", { code: r.pricing.promoCode ?? "" })}</dt>
              <dd>−{formatMoney({ amount: r.pricing.discount, currency: r.pricing.currency }, lang)}</dd>
            </div>
          )}
          {(r.pricing.fees ?? 0) > 0 && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">{tb("feesLine")}</dt>
              <dd>{formatMoney({ amount: r.pricing.fees, currency: r.pricing.currency }, lang)}</dd>
            </div>
          )}
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">{r.partnerSnapshot ? (r.paidAt ? t2("paidOnline") : t2("dueOnline")) : r.paidAt ? t("total") : t("totalDue")}</dt>
            <dd className="font-semibold">{total}</dd>
          </div>
          {r.partnerSnapshot && ["pending_payment", "confirmed", "attended"].includes(r.status) && (
            <div className="py-2.5" data-testid="on-site">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{r.partnerPaymentStatus === "paid_on_site" ? t2("paidOnSite") : t2("onSiteTitle")}</dt>
                <dd className="font-semibold">
                  {r.onSiteAmount != null ? formatMoney({ amount: r.onSiteAmount, currency: r.pricing.currency }, lang) : t2("onSiteVariable")}
                  {r.partnerPaymentStatus === "paid_on_site" && <CheckCircle2 className="ms-1 inline size-4 text-emerald-700" aria-hidden />}
                </dd>
              </div>
              <p className="mt-1 text-xs text-muted">
                {r.venue && r.partnerSnapshot.name ? t2("onSiteTo", { partner: r.partnerSnapshot.name }) : t2("onSiteToVenue")}
                {r.partnerSnapshot.description ? ` ${t2("whatOnSite", { description: r.partnerSnapshot.description })}` : ""}
              </p>
            </div>
          )}
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
              {r.cancellation.refundAmount > 0 && (
                <div className="flex justify-between py-2.5 text-emerald-800">
                  <dt>{t("refundedLabel")}</dt>
                  <dd className="font-semibold">{formatMoney({ amount: r.cancellation.refundAmount, currency: r.pricing.currency }, lang)}</dd>
                </div>
              )}
              {r.cancellation.refundAmount > 0 && r.cancellation.refundStatus === "pending" && <p className="pb-2.5 text-xs text-muted">{tv("refundPending")}</p>}
            </>
          )}
        </dl>
      </section>

      {(isActive || r.status === "pending_payment") && isUpcoming && questions.length > 0 && (
        <section id="questionnaire" aria-labelledby="questionnaire-title" className="scroll-mt-28 rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="questionnaire">
          <h2 id="questionnaire-title" className="card-title">{tq("title")}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">{r.questionnaire ? tq("introDone") : tq("intro")}</p>
          <QuestionnaireForm reservationId={r.id} questions={questions} initial={r.questionnaire?.answers ?? null} editable={FIREBASE_ENABLED && isUpcoming} />
        </section>
      )}

      {(isActive || r.status === "pending_payment") && isUpcoming && (needs.food || needs.languages) && (
        <section aria-labelledby="prefs" className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 id="prefs" className="card-title">{tp(welcomeTitleKeys(needs).edit)}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">{tp(welcomeTitleKeys(needs).intro)}</p>
          <PreferencesEditor
            needs={needs}
            reservationId={r.id}
            editable={FIREBASE_ENABLED && isUpcoming}
            initial={{
              diet: (r.preferences?.diet ?? "none") as BookingPreferences["diet"],
              allergies: r.preferences?.allergies ?? "",
              languages: (r.preferences?.languages ?? []) as BookingPreferences["languages"],
              consent: r.preferences?.shareWithVenue === true,
            }}
          />
        </section>
      )}

      {invoices.length > 0 && (
        <section aria-labelledby="documents" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="documents" className="card-title">{ti("reservationDocs")}</h2>
            <Link href="/espace/factures" className="text-sm font-medium text-brand-900 underline-offset-4 hover:underline">{ti("seeAll")}</Link>
          </div>
          <InvoiceList invoices={invoices} />
        </section>
      )}

      {isActive && isUpcoming && (
        <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
          <h2 className="font-semibold text-ink">{t("cancelTitle")}</h2>
          <p className="mt-1 text-sm text-muted">
            {r.pricing.total === 0
              ? covered ? t("cancelCovered") : t("cancelFree")
              : refund > 0
                ? t("cancelRefund", { amount: formatMoney({ amount: refund, currency: r.pricing.currency }, lang) })
                : t("cancelNoRefund")}
          </p>
          {coverageNotes.map((n) => <p key={n} className={`mt-1 text-sm ${passLate || !creditsBack ? "font-medium text-amber-900" : "text-muted"}`} data-testid="cancel-coverage-note">{n}</p>)}
          {FIREBASE_ENABLED ? (
            <div className="mt-4">
              <CancelReservationButton
                reservationId={r.id}
                label={t("cancelCta")}
                confirmText={[r.pricing.total === 0 ? t("cancelConfirmFree") : refund > 0 ? t("cancelConfirmRefund", { amount: formatMoney({ amount: refund, currency: r.pricing.currency }, lang) }) : t("cancelConfirmNoRefund"), ...coverageNotes].join(" ")}
              />
            </div>
          ) : (
            <>
              <button type="button" disabled className="mt-4 cursor-not-allowed rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-muted">
                {t("cancelCta")}
              </button>
              <p className="mt-2 flex items-start gap-2 text-xs text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t("cancelNote")}
              </p>
            </>
          )}
        </section>
      )}

      {refundRequest ? (
        <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5" data-testid="refund-status">
          <p className="text-sm text-ink">{tr2(`status_${refundRequest.status}` as "status_pending", { amount: formatMoney({ amount: refundRequest.amount ?? 0, currency: r.pricing.currency }, lang) })}</p>
          {refundRequest.message && <p className="mt-1 text-sm text-muted">{tr2("teamMessage")} {refundRequest.message}</p>}
        </section>
      ) : (
        refundable && !isUpcoming && <RefundRequestForm reservationId={r.id} live={FIREBASE_ENABLED} />
      )}
      {/* Audit 23/11 : signaler quelqu'un pendant l'expérience comme après, depuis sa réservation. */}
      {["confirmed", "attended", "no_show"].includes(r.status) && reportWindowOpen(s.startAt, s.endAt, now) && (
        <ReportFromBooking
          reservationId={r.id}
          people={(group && !namesHidden ? group.members : []).filter((m) => m.uid !== profile.uid).map((m) => ({ uid: m.uid, firstName: m.firstName }))}
          live={FIREBASE_ENABLED}
          during={now.getTime() < new Date(s.endAt).getTime()}
        />
      )}
      {(review || canReview(r, now)) && (
        <section id="avis" className="scroll-mt-28 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="card-title">{t("reviewTitle")}</h2>
          {review ? (
            <div className="mt-3 space-y-2">
              <Stars value={review.rating} />
              {review.comment && <p className="text-ink/85">{review.comment}</p>}
              <p className="text-sm text-emerald-800">{review.status === "hidden" ? t("reviewHidden") : review.status === "pending" ? t("reviewPending") : t("reviewThanks")}</p>
              {review.photo?.status && (
                <p className="text-sm text-muted" data-testid="review-photo-status">{t(`reviewPhoto_${review.photo.status}`)}</p>
              )}
              {review.reply?.text && (
                <div className="rounded-xl bg-brand-50 px-4 py-3" data-testid="review-reply-member">
                  <p className="text-sm font-semibold text-brand-900">{t("reviewReplyFrom", { name: review.reply.authorName })}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink/85">{review.reply.text}</p>
                </div>
              )}
            </div>
          ) : FIREBASE_ENABLED ? (
            <ReviewForm reservationId={r.id} />
          ) : (
            <div className="mt-3">
              <div className="flex gap-1 text-brand-200" aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="size-7" />)}
              </div>
              <button type="button" disabled className="mt-4 cursor-not-allowed rounded-full bg-brand-900/40 px-5 py-2.5 text-sm font-semibold text-white">
                {t("reviewCta")}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
