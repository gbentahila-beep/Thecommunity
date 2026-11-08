"use client";

import { formatMoney, type BookingPreferences, type CurrencyCode, type Pricing } from "@thecommunity/shared";
import { Minus, Plus, Tag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf, createReservation, previewPricing, promoErrorOf, startCheckout, type BookingError } from "@/lib/booking-client";
import { goToCheckout } from "./go-to-checkout";
import { EMPTY_PREFERENCES, needsConsent, PreferencesFields } from "./preferences-fields";

type Props = {
  sessionId: string;
  unitAmount: number;
  currency: CurrencyCode;
  maxSeats: number;
  /** Part réglée sur place au partenaire (étape 11) : prix fixe par place, ou null pour une consommation libre. Absent = tout en ligne.
   *  `partner` vide quand le lieu n'est révélé que la veille (on ne le dévoile pas avant). */
  onSite?: { unit: number | null; partner: string; description: string } | null;
  /** Paiement par virement (5h) : délai et limite avant l'expérience, en heures. */
  transfer?: { hours: number; cutoff: number } | null;
  /** Langues du profil, proposées par défaut comme langues de table. */
  defaultLanguages?: BookingPreferences["languages"];
};

/**
 * Choix du nombre de places, code promo, préférences pour l'accueil, puis réservation.
 * Le prix affiché vient du serveur (prix membre, code, frais) ; la réservation le recalcule.
 */
export function BookingForm({ sessionId, unitAmount, currency, maxSeats, onSite = null, transfer = null, defaultLanguages = [] }: Props) {
  const t = useTranslations("booking");
  const t2 = useTranslations("twoPart");
  const tp = useTranslations("prefs");
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
  const request = useRef(0);
  const money = (amount: number) => formatMoney({ amount, currency }, lang);

  /** Demande le prix au serveur ; seule la dernière réponse compte. Un code refusé est retiré. */
  const quote = async (n: number, code: string | undefined) => {
    const id = ++request.current;
    try {
      await authReady();
      const p = await previewPricing(sessionId, n, code);
      if (id !== request.current) return;
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
    const shared = prefs.diet !== "none" || prefs.allergies.trim() || prefs.languages.length;
    if (needsConsent(prefs) && !prefs.consent) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    setBusy(true);
    setError(null);
    try {
      await authReady();
      const r = await createReservation(sessionId, seats, { promoCode: promo, preferences: shared ? { ...prefs, allergies: prefs.allergies.trim() } : undefined });
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
      {maxSeats > 1 && (
        <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-white p-4 shadow-card">
          <span id="seats-label" className="font-medium text-ink">{t("seatsLabel")}</span>
          <div className="flex items-center gap-3" role="group" aria-labelledby="seats-label">
            <button
              type="button"
              onClick={() => changeSeats(Math.max(1, seats - 1))}
              disabled={seats <= 1 || busy}
              aria-label={t("fewer")}
              className="grid size-10 place-items-center rounded-full border border-line text-plum-900 disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <output aria-live="polite" className="w-6 text-center text-lg font-semibold">{seats}</output>
            <button
              type="button"
              onClick={() => changeSeats(Math.min(maxSeats, seats + 1))}
              disabled={seats >= maxSeats || busy}
              aria-label={t("more")}
              className="grid size-10 place-items-center rounded-full border border-line text-plum-900 disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {pricing && pricing.seats === seats && (pricing.memberDiscount || pricing.discount || pricing.fees) ? (
        <dl aria-label={t("summary")} className="space-y-1.5 rounded-[var(--radius-card)] bg-white p-4 text-sm shadow-card">
          <div className="flex justify-between"><dt>{t("subtotal")} ({seats})</dt><dd className="tabular-nums">{money(pricing.subtotal)}</dd></div>
          {pricing.memberDiscount ? <div className="flex justify-between text-emerald-800"><dt>{t("memberDiscountLine")}</dt><dd className="tabular-nums">−{money(pricing.memberDiscount)}</dd></div> : null}
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
          <p className="mt-1 text-xs text-muted">{t2("discountNote")}</p>
        </section>
      )}

      <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-card">
        {promo ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p role="status" className="flex items-center gap-2 text-emerald-800">
              <Tag className="size-4" aria-hidden />
              {t("promoApplied", { code: promo, amount: money(pricing?.discount ?? 0) })}
            </p>
            <button type="button" disabled={busy} onClick={() => { setPromoInput(""); void quote(seats, undefined); }} className="font-semibold text-plum-900 underline">{t("promoRemove")}</button>
          </div>
        ) : !promoOpen ? (
          <button type="button" onClick={() => setPromoOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-plum-900">
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
                className="w-full rounded-2xl border border-line px-4 py-3 text-[15px] uppercase focus:border-plum-700 focus:outline-none"
              />
            </div>
            <button type="submit" disabled={busy || !promoInput.trim()} className="rounded-full border border-plum-900 px-5 py-3 text-sm font-semibold text-plum-900 disabled:opacity-50">{t("promoApply")}</button>
          </form>
        )}
        {promoError && <p id="promo-err" role="alert" className="mt-2 text-sm text-red-800">{t(`promoErrors.${promoError}`)}</p>}
      </div>

      <details className="group rounded-[var(--radius-card)] bg-white p-4 shadow-card">
        <summary className="cursor-pointer list-none font-medium text-ink [&::-webkit-details-marker]:hidden">
          {tp("title")}
          <span className="mt-0.5 block text-xs font-normal text-muted">{tp("intro")}</span>
        </summary>
        <div className="mt-4">
          <PreferencesFields value={prefs} onChange={(v) => { setPrefs(v); setConsentError(false); }} disabled={busy} consentError={consentError} />
        </div>
      </details>
      {consentError && <p role="alert" className="text-sm text-red-800">{tp("consentRequired")}</p>}

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

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="w-full rounded-full bg-plum-900 px-6 py-4 font-semibold text-white shadow-card transition hover:bg-plum-800 disabled:opacity-60"
      >
        {busy ? t("working") : free ? t("freeCta") : transfer ? t("payCtaTransfer", { amount: money(total) }) : t("payCtaAmount", { amount: money(total) })}
      </button>
      {!free && <p className="text-center text-xs text-muted">{transfer ? t("holdNoteTransfer", { hours: transfer.hours, cutoff: transfer.cutoff }) : t("holdNote")}</p>}
    </div>
  );
}
