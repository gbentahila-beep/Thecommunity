"use client";

import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { goToCheckout } from "@/components/booking/go-to-checkout";
import { useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf } from "@/lib/booking-client";
import { firebase } from "@/lib/firebase/client";

/** Souscrire (ou renouveler) : le montant est fixé par le serveur, puis paiement chez le prestataire. */
export function SubscribeButton({ label, offerId }: { label: string; offerId?: string }) {
  const t = useTranslations("membership");
  const tb = useTranslations("booking");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
            const user = firebase().auth.currentUser;
            if (user && !user.emailVerified) {
              await user.reload();
              if (user.emailVerified) await user.getIdToken(true);
            }
            const res = await httpsCallable(firebase().functions, "startMembershipCheckout")(offerId ? { offerId } : {});
            const { redirectUrl } = res.data as { redirectUrl: string };
            goToCheckout(redirectUrl, (href) => router.push(href));
          } catch (err) {
            const reason = (err as { details?: { reason?: string } }).details?.reason;
            setError(reason === "already_member" || reason === "membership_unavailable" ? t(`errors.${reason}`) : tb(`errors.${bookingErrorOf(err)}`));
            setBusy(false);
          }
        }}
        className="btn btn-primary w-full py-4 shadow-float"
      >
        {busy ? tb("working") : label}
      </button>
      {error && <p role="alert" className="rounded-xl bg-white px-3 py-2 text-sm text-red-800 shadow-card">{error}</p>}
    </div>
  );
}
