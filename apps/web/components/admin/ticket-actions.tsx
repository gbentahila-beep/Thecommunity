"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const ERRORS: Record<string, string> = {
  too_early: "Le pointage ouvre 3 h avant le début.",
  not_checkable: "Seule une réservation confirmée se pointe.",
  not_applicable: "Aucune part à régler sur place pour cette réservation.",
};

/**
 * Actions du billet scanné (étape 11d) : marquer présent, marquer la part partenaire réglée.
 * Vérifiées et journalisées par le serveur (adminCheckIn, adminSetPartnerPayment).
 */
export function TicketActions({
  reservationId,
  status,
  canCheckIn,
  onSite,
}: {
  reservationId: string;
  status: string;
  canCheckIn: boolean;
  onSite: { status: "due_on_site" | "paid_on_site"; fixed: boolean } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (name: string, data: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, name)(data);
      router.refresh();
    } catch (e) {
      setError(ERRORS[(e as { details?: { reason?: string } }).details?.reason ?? ""] ?? "Action impossible. Réessayez.");
    }
    setBusy(false);
  };

  const big = "w-full rounded-full px-5 py-3.5 text-base font-semibold disabled:opacity-50";
  return (
    <div className="space-y-3">
      {status === "confirmed" && (
        <button type="button" disabled={busy || !canCheckIn} onClick={() => run("adminCheckIn", { reservationId, presence: "attended" })} className={`${big} bg-emerald-700 text-white hover:bg-emerald-800`}>
          Marquer présent
        </button>
      )}
      {status === "confirmed" && !canCheckIn && <p className="text-center text-sm text-muted">Le pointage ouvre 3 h avant le début.</p>}
      {status === "attended" && (
        <button type="button" disabled={busy} onClick={() => run("adminCheckIn", { reservationId, presence: "confirmed" })} className={`${big} border border-line text-muted hover:bg-cream`}>
          Annuler le pointage
        </button>
      )}
      {onSite && onSite.fixed && (status === "confirmed" || status === "attended") && (
        onSite.status === "due_on_site" ? (
          <button type="button" disabled={busy} onClick={() => run("adminSetPartnerPayment", { reservationId, paid: true })} className={`${big} bg-plum-900 text-white hover:bg-plum-800`}>
            Part partenaire réglée
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => run("adminSetPartnerPayment", { reservationId, paid: false })} className={`${big} border border-line text-muted hover:bg-cream`}>
            Part partenaire non réglée
          </button>
        )
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
    </div>
  );
}
