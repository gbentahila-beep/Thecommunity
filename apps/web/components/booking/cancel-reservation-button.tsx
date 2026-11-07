"use client";

import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf } from "@/lib/booking-client";
import { firebase } from "@/lib/firebase/client";

/**
 * Annulation par le membre. Le texte de confirmation annonce le remboursement prévu ;
 * le serveur recalcule le montant au moment de l'annulation (c'est lui qui fait foi).
 */
export function CancelReservationButton({ reservationId, label, confirmText, variant = "danger" }: { reservationId: string; label: string; confirmText: string; variant?: "danger" | "quiet" }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(confirmText)) return;
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
        }}
        className={
          variant === "danger"
            ? "rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
            : "text-sm font-medium text-muted underline disabled:opacity-60"
        }
      >
        {busy ? t("working") : label}
      </button>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  );
}
