"use client";

import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf } from "@/lib/booking-client";
import { firebase } from "@/lib/firebase/client";

/**
 * Annulation par le membre, confirmée DANS la page (pas de fenêtre système : certains navigateurs
 * intégrés — WhatsApp, Instagram — les bloquent sans les afficher). Le texte annonce le remboursement
 * prévu ; le serveur recalcule le montant au moment de l'annulation (c'est lui qui fait foi).
 */
export function CancelReservationButton({ reservationId, label, confirmText, variant = "danger" }: { reservationId: string; label: string; confirmText: string; variant?: "danger" | "quiet" }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await authReady();
      await httpsCallable(firebase().functions, "cancelReservation")({ reservationId });
      router.replace(`/espace/reservations/${reservationId}?annulation=ok`);
      router.refresh();
    } catch (err) {
      const reason = (err as { details?: { reason?: string } }).details?.reason;
      setError(reason === "already_started" || reason === "not_cancellable" ? t(`errors.${reason}`) : t(`errors.${bookingErrorOf(err)}`));
      setBusy(false);
    }
  };

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={
          variant === "danger"
            ? "rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50"
            : "text-sm font-medium text-muted underline"
        }
      >
        {label}
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-labelledby={`cancel-q-${reservationId}`} className="space-y-3 rounded-2xl border border-red-200 bg-red-50/70 p-4">
      <p id={`cancel-q-${reservationId}`} className="text-sm font-medium text-ink">{confirmText}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={cancel} className="rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-60">
          {busy ? t("working") : t("confirmYesCancel")}
        </button>
        <button type="button" disabled={busy} onClick={() => setAsking(false)} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-cream disabled:opacity-60">
          {t("confirmKeep")}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  );
}
