"use client";

import { formatMoney, type CurrencyCode } from "@thecommunity/shared";
import { Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf, createReservation, startCheckout, type BookingError } from "@/lib/booking-client";
import { goToCheckout } from "./go-to-checkout";

type Props = {
  sessionId: string;
  unitAmount: number;
  currency: CurrencyCode;
  maxSeats: number;
};

/** Choix du nombre de places et lancement de la réservation (le serveur revérifie tout). */
export function BookingForm({ sessionId, unitAmount, currency, maxSeats }: Props) {
  const t = useTranslations("booking");
  const lang = useLocale() as "fr" | "ar";
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<BookingError | null>(null);
  const total = { amount: unitAmount * seats, currency };
  const free = unitAmount === 0;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await authReady();
      const r = await createReservation(sessionId, seats);
      if (r.status === "confirmed") {
        router.push(`/espace/reservations/${r.reservationId}?reservation=confirmee`);
        return;
      }
      const checkout = await startCheckout(r.reservationId);
      goToCheckout(checkout.redirectUrl, (href) => router.push(href));
    } catch (err) {
      setError(bookingErrorOf(err));
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
              onClick={() => setSeats((n) => Math.max(1, n - 1))}
              disabled={seats <= 1 || busy}
              aria-label={t("fewer")}
              className="grid size-10 place-items-center rounded-full border border-line text-plum-900 disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <output aria-live="polite" className="w-6 text-center text-lg font-semibold">{seats}</output>
            <button
              type="button"
              onClick={() => setSeats((n) => Math.min(maxSeats, n + 1))}
              disabled={seats >= maxSeats || busy}
              aria-label={t("more")}
              className="grid size-10 place-items-center rounded-full border border-line text-plum-900 disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

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
        {busy ? t("working") : free ? t("freeCta") : t("payCtaAmount", { amount: formatMoney(total, lang) })}
      </button>
      {!free && <p className="text-center text-xs text-muted">{t("holdNote")}</p>}
    </div>
  );
}
