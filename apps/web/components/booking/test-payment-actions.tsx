"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf, completeTestPayment, type BookingError } from "@/lib/booking-client";

/** Les deux réponses possibles de la « banque » de test. Le serveur refuse hors du mode test. */
export function TestPaymentActions({ paymentId, reservationId }: { paymentId: string; reservationId: string }) {
  const t = useTranslations("testPayment");
  const tb = useTranslations("booking");
  const router = useRouter();
  const [busy, setBusy] = useState<"succeeded" | "failed" | null>(null);
  const [error, setError] = useState<BookingError | null>(null);

  const send = async (outcome: "succeeded" | "failed") => {
    setBusy(outcome);
    setError(null);
    try {
      await authReady();
      const res = await completeTestPayment(paymentId, outcome);
      const flag = res.outcome === "confirmed" ? "accepte" : res.outcome === "refunded" ? "rembourse" : "refuse";
      router.replace(`/espace/reservations/${reservationId}?paiement=${flag}`);
    } catch (err) {
      setError(bookingErrorOf(err));
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={() => send("succeeded")}
        disabled={busy !== null}
        className="w-full rounded-full bg-emerald-700 px-6 py-4 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {busy === "succeeded" ? tb("working") : t("succeed")}
      </button>
      <button
        type="button"
        onClick={() => send("failed")}
        disabled={busy !== null}
        className="w-full rounded-full border border-line bg-white px-6 py-4 font-semibold text-ink hover:bg-cream disabled:opacity-60"
      >
        {busy === "failed" ? tb("working") : t("fail")}
      </button>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{tb(`errors.${error}`)}</p>}
    </div>
  );
}
