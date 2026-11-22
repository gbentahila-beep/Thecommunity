"use client";

import { answerIssues, formatMoney, type BookingPreferences, type CurrencyCode, type Pricing, type QuestionDef, type QuestionnaireAnswers } from "@thecommunity/shared";
import { Minus, Plus, Tag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { QuestionnaireFields } from "@/components/account/questionnaire-fields";
import { PhysicalTermsCheckbox } from "@/components/booking/physical-terms";
import { authReady, bookingErrorOf, createReservation, previewBooking, promoErrorOf, startCheckout, type BookingError } from "@/lib/booking-client";
import { goToCheckout } from "./go-to-checkout";
import { EMPTY_PREFERENCES, needsConsent, PreferencesFields, welcomeTitleKeys, type WelcomeNeeds } from "./preferences-fields";

type Props = {
  sessionId: string;
  unitAmount: number;
  currency: CurrencyCode;
  maxSeats: number;
  /** Part réglée sur place au partenaire (étape 11) : prix fixe par place, ou null pour une consommation libre. Absent = tout en ligne.
   *  `partner` vide quand le lieu n'est révélé que la veille (on ne le dévoile pas avant). */
  /** 18c : activité physique → conditions de participation à accepter avant de réserver. */
  physical?: boolean;
  onSite?: { unit: number | null; partner: string; description: string } | null;
  /** Paiement par virement (5h) : délai et limite avant l'expérience, en heures. */
  transfer?: { hours: number; cutoff: number } | null;
  /** Langues du profil, proposées par défaut comme langues de table. */
  defaultLanguages?: BookingPreferences["languages"];
  /** Questionnaire de l'expérience : rempli ici, avant le paiement (docs/22). */
  questions?: QuestionDef[];
};

/**
 * Choix du nombre de places, code promo, préférences pour l'accueil, puis réservation.
 * Le prix affiché vient du serveur (prix membre, code, frais) ; la réservation le recalcule.
 */
export function BookingForm({ sessionId, unitAmount, currency, maxSeats, onSite = null, transfer = null, defaultLanguages = [], physical = false, questions = [], needs = { food: true, languages: true } }: Props & { needs?: WelcomeNeeds }) {
  const t = useTranslations("booking");
  const t2 = useTranslations("twoPart");
  const tp = useTranslations("prefs");
  const tq = useTranslations("questionnaire");
  const lang = useLocale() as "fr" | "ar" | "en";
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<BookingError | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<string | undefined>(undefined);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<BookingPreferences>({ ...EMPTY_PREFERENCES, languages: defaultLanguages });
  const [consentError, setConsentError] = useState(false);
  const [physicalOk, setPhysicalOk] = useState(false);
  const [physicalError, setPhysicalError] = useState(false);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [missing, setMissing] = useState<string[]>([]);
  const request = useRef(0);
  // docs/22 § 17.I : pass (place incluse, garde-fou) et carnet (crédits), d'après le serveur.
  const [useCarnet, setUseCarnet] = useState(true);
  const [sub, setSub] = useState<{ pass: boolean; passLimitReached: boolean; credits: number }>({ pass: false, passLimitReached: false, credits: 0 });
  const money = (amount: number) => formatMoney({ amount, currency }, lang);

  /** Demande le prix au serveur ; seule la dernière réponse compte. Un code refusé est retiré. */
  const quote = async (n: number, code: string | undefined, carnet: boolean = useCarnet) => {
    const id = ++request.current;
    try {
      await authReady();
      const res = await previewBooking(sessionId, n, code, carnet);
      const p = res.pricing;
      if (id !== request.current) return;
      setSub({ pass: Boolean(res.pass), passLimitReached: Boolean(res.passLimitReached), credits: Number(res.credits ?? 0) });
      setPricing(p);
      setPromo(code);
      setPromoError(null);
    } catch (err) {
      if (id !== request.current) return;
      const why = promoErrorOf(err);
      // Code refusé : on garde le prix affiché (sans ce code) et on explique pourquoi.
      if (code && why) setPromoError(why);
      else setPricing(null);
    }
  };
  useEffect(() => {
    // Premier prix au chargement (hors du rendu : la réponse arrive de toute façon plus tard).
    const timer = setTimeout(() => void quote(1, undefined), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- premier prix au chargement uniquement
  }, []);

  const changeSeats = (n: number) => {
    setSeats(n);
    void quote(n, promo);
  };
  const total = pricing && pricing.seats === seats ? pricing.total : unitAmount * seats;
  const free = total === 0;

  const submit = async () => {
    // Questionnaire d'abord (docs/22) : tout le monde répond avant de payer.
    const issues = answerIssues(questions, answers);
    if (issues.length) {
      setMissing(issues.map((i) => i.id));
      requestAnimationFrame(() => document.getElementById(`bq-${issues[0]!.id}`)?.focus());
      return;
    }
    const shared = prefs.diet !== "none" || prefs.allergies.trim() || prefs.languages.length;
    if (needsConsent(prefs) && !prefs.consent) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    if (physical && !physicalOk) {
      setPhysicalError(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authReady();
      const r = await createReservation(sessionId, seats, { promoCode: promo, preferences: shared ? { ...prefs, allergies: prefs.allergies.trim() } : undefined, physicalTermsAccepted: physical ? true : undefined, answers: questions.length ? answers : undefined, useCarnet: useCarnet && sub.credits > 0 ? true : undefined });
      if (r.status === "confirmed") {
        router.push(`/espace/reservations/${r.reservationId}?reservation=confirmee`);
        return;
      }
      const checkout = await startCheckout(r.reservationId);
      goToCheckout(checkout.redirectUrl, (href) => router.push(href));
    } catch (err) {
      const why = promoErrorOf(err);
      if (why) {
        setPromoError(why);
        setPromo(undefined);
        void quote(seats, undefined);
      } else setError(bookingErrorOf(err));
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {maxSeats === 2 && (
        <fieldset className="rounded-[var(--radius-card)] bg-white p-4 shadow-card" data-testid="seats-choice">
          <legend className="sr-only">{t("seatsLabel")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((n) => (
              <label key={n} className={`flex cursor-pointer items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold ${seats === n ? "border-brand-900 bg-brand-50 text-brand-900" : "border-line text-ink"}`}>
                <input type="radio" name="seats" className="sr-only" checked={seats === n} disabled={busy} onChange={() => changeSeats(n)} />
                {n === 1 ? t("seatsSolo") : t("seatsPlusOne")}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {maxSeats > 2 && (
        <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-white p-4 shadow-card">
          <span id="seats-label" className="font-medium text-ink">{t("seatsLabel")}</span>
          <div className="flex items-center gap-3" role="group" aria-labelledby="seats-label">
            <button
              type="button"
              onClick={() => changeSeats(Math.max(1, seats - 1))}
              disabled={seats <= 1 || busy}
              aria-label={t("fewer")}
              className="grid size-10 place-items-center rounded-full border border-line text-brand-900 disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <output aria-live="polite" className="w-6 text-center text-lg font-semibold">{seats}</output>
            <button
              type="button"
              onClick={() => changeSeats(Math.min(maxSeats, seats + 1))}
              disabled={seats >= maxSeats || busy}
              aria-label={t("more")}
              className="grid size-10 place-items-center rounded-full border border-line text-brand-900 disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {pricing && pricing.seats === seats && (pricing.memberDiscount || pricing.discount || pricing.fees) ? (
        <dl aria-label={t("summary")} className="space-y-1.5 rounded-[var(--radius-card)] bg-white p-4 text-sm shadow-card">
          <div className="flex justify-between"><dt>{t("subtotal")} ({seats})</dt><dd className="tabular-nums">{money(pricing.subtotal)}</dd></div>
          {pricing.memberDiscount ? (
            <div className="flex justify-between text-emerald-800">
              <dt>{pricing.coverage ? [pricing.coverage.passSeats ? t("passIncluded") : null, pricing.coverage.carnetSeats ? t("carnetUsed", { count: pricing.coverage.carnetSeats }) : null].filter(Boolean).join(" · ") : t("memberDiscountLine")}</dt>
              <dd className="tabular-nums">−{money(pricing.memberDiscount)}</dd>
            </div>
          ) : null}
          {pricing.discount ? <div className="flex justify-between text-emerald-800"><dt>{t("promoLine", { code: pricing.promoCode ?? "" })}</dt><dd className="tabular-nums">−{money(pricing.discount)}</dd></div> : null}
          {pricing.fees ? <div className="flex justify-between"><dt>{t("feesLine")}</dt><dd className="tabular-nums">{money(pricing.fees)}</dd></div> : null}
          <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><dt>{onSite ? t2("payNowLine") : t("totalLine")}</dt><dd className="tabular-nums">{money(pricing.total)}</dd></div>
        </dl>
      ) : null}

      {onSite && (
        <section aria-label={t2("onSiteTitle")} className="rounded-[var(--radius-card)] bg-white p-4 text-sm shadow-card" data-testid="on-site">
          <div className="flex justify-between gap-3 font-semibold text-ink">
            <span>{t2("onSiteTitle")}</span>
            <span className="tabular-nums">{onSite.unit != null ? money(onSite.unit * seats) : t2("onSiteVariable")}</span>
          </div>
          {onSite.unit != null && seats > 1 && <p className="text-end text-xs text-muted tabular-nums">{money(onSite.unit)} × {seats}</p>}
          <p className="mt-1 text-xs text-muted">
            {onSite.partner ? t2("onSiteTo", { partner: onSite.partner }) : t2("onSiteToVenue")}
            {onSite.description ? ` ${t2("whatOnSite", { description: onSite.description })}` : ""}
          </p>
        </section>
      )}

      {(sub.pass || sub.credits > 0) && (
        <section className="space-y-2 rounded-[var(--radius-card)] bg-white p-4 text-sm shadow-card" data-testid="booking-subscription">
          {sub.pass && <p className={sub.passLimitReached ? "text-amber-900" : "font-semibold text-emerald-800"}>{sub.passLimitReached ? t("passLimit") : t("passCovers")}</p>}
          {sub.credits > 0 && (
            <label className="flex items-center gap-2 font-medium text-ink">
              <input type="checkbox" checked={useCarnet} disabled={busy} onChange={(e) => { setUseCarnet(e.target.checked); void quote(seats, promo, e.target.checked); }} />
              {t("useCarnet", { count: sub.credits })}
            </label>
          )}
        </section>
      )}
      {!sub.pass && total > 0 && (
        <p className="text-sm text-muted" data-testid="week-pass">{t("weekPassHint")} <Link href="/abonnement" className="font-semibold text-brand-900 underline underline-offset-4">{t("weekPassCta")}</Link></p>
      )}

      <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-card">
        {promo ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p role="status" className="flex items-center gap-2 text-emerald-800">
              <Tag className="size-4" aria-hidden />
              {t("promoApplied", { code: promo, amount: money(pricing?.discount ?? 0) })}
            </p>
            <button type="button" disabled={busy} onClick={() => { setPromoInput(""); void quote(seats, undefined); }} className="font-semibold text-brand-900 underline">{t("promoRemove")}</button>
          </div>
        ) : !promoOpen ? (
          <button type="button" onClick={() => setPromoOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Tag className="size-4" aria-hidden />
            {t("promoToggle")}
          </button>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = promoInput.trim().toUpperCase();
              if (!/^[A-Z0-9-]{3,20}$/.test(code)) return setPromoError("promoFormat");
              void quote(seats, code);
            }}
          >
            <div className="min-w-40 flex-1">
              <label htmlFor="promo-code" className="mb-1.5 block text-sm font-medium">{t("promoLabel")}</label>
              <input
                id="promo-code"
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value); setPromoError(null); }}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={20}
                aria-invalid={Boolean(promoError) || undefined}
                aria-describedby={promoError ? "promo-err" : undefined}
                className="w-full rounded-2xl border border-line px-4 py-3 text-[15px] uppercase focus:border-brand-700 focus:outline-none"
              />
            </div>
            <button type="submit" disabled={busy || !promoInput.trim()} className="btn btn-secondary btn-sm">{t("promoApply")}</button>
          </form>
        )}
        {promoError && <p id="promo-err" role="alert" className="mt-2 text-sm text-red-800">{t(`promoErrors.${promoError}`)}</p>}
      </div>

      {questions.length > 0 && (
        <section aria-labelledby="booking-questions" className="space-y-5 rounded-[var(--radius-card)] bg-white p-4 shadow-card" data-testid="booking-questionnaire">
          <div>
            <h2 id="booking-questions" className="font-medium text-ink">{tq("bookingTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted">{tq("bookingIntro")}</p>
          </div>
          <QuestionnaireFields idPrefix="bq" questions={questions} answers={answers} missing={missing} disabled={busy} onChange={(next, id) => { setAnswers(next); setMissing((m) => m.filter((x) => x !== id)); }} />
        </section>
      )}

      {(needs.food || needs.languages) && (
      <details className="group rounded-[var(--radius-card)] bg-white p-4 shadow-card">
        <summary className="cursor-pointer list-none font-medium text-ink [&::-webkit-details-marker]:hidden">
          {tp(welcomeTitleKeys(needs).title)}
          <span className="mt-0.5 block text-xs font-normal text-muted">{tp(welcomeTitleKeys(needs).intro)}</span>
        </summary>
        <div className="mt-4">
          <PreferencesFields value={prefs} onChange={(v) => { setPrefs(v); setConsentError(false); }} disabled={busy} consentError={consentError} needs={needs} />
        </div>
      </details>
      )}
      {consentError && <p role="alert" className="text-sm text-red-800">{tp("consentRequired")}</p>}
      {physical && <PhysicalTermsCheckbox checked={physicalOk} onChange={(v) => { setPhysicalOk(v); setPhysicalError(false); }} error={physicalError} disabled={busy} />}

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
          <p>{t(`errors.${error}`)}</p>
          {error === "already_booked" && (
            <Link href="/espace/reservations" className="mt-1 inline-block font-semibold underline">{t("seeMyBookings")}</Link>
          )}
          {error === "signin" && (
            <Link href={`/connexion?suite=${encodeURIComponent(`/reserver/${sessionId}`)}`} className="mt-1 inline-block font-semibold underline">{t("signInCta")}</Link>
          )}
          {error === "profile_incomplete" && (
            <Link href="/bienvenue" className="mt-1 inline-block font-semibold underline">{t("profileCta")}</Link>
          )}
        </div>
      )}

      {/* docs/22 § 8 : barre fixe en bas sur téléphone, « 35 DH · 1 place · Continuer ». */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0" data-testid="booking-bar">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-ink sm:hidden">
            <span className="block font-semibold tabular-nums">{free ? t("freeShort") : money(total)}</span>
            <span className="text-muted">{t("seatsCount", { count: seats })}</span>
          </p>
          <button type="button" onClick={submit} disabled={busy} className="btn btn-primary flex-1 sm:w-full">
            {busy ? t("working") : free ? t("freeCta") : transfer ? t("payCtaTransfer", { amount: money(total) }) : t("payCtaAmount", { amount: money(total) })}
          </button>
        </div>
      </div>
      {!free && <p className="text-center text-xs text-muted">{transfer ? t("holdNoteTransfer", { hours: transfer.hours, cutoff: transfer.cutoff }) : t("holdNote")}</p>}
    </div>
  );
}
