"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf, startCheckout, type BookingError } from "@/lib/booking-client";
import { goToCheckout } from "./go-to-checkout";

/** Reprendre le paiement d'une réservation encore bloquée (depuis « Mes réservations »). */
export function PayNowButton({ reservationId, label }: { reservationId: string; label: string }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<BookingError | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await authReady();
            const c = await startCheckout(reservationId);
            goToCheckout(c.redirectUrl, (href) => router.push(href));
          } catch (err) {
            setError(bookingErrorOf(err));
            setBusy(false);
            router.refresh();
          }
        }}
        className="btn btn-primary btn-sm"
      >
        {busy ? t("working") : label}
      </button>
      {error && <p role="alert" className="text-sm text-red-800">{t(`errors.${error}`)}</p>}
    </div>
  );
}
