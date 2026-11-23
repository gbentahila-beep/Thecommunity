"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const ERRORS: Record<string, string> = {
  too_early: "Le pointage ouvre 3 h avant le début.",
  not_checkable: "Seule une réservation confirmée se pointe.",
  not_owner: "Cette réservation ne concerne pas vos activités.",
};

/** Étape 20 — pointage par l'organisateur (même fonction serveur que l'équipe, limitée à SES activités). */
export function CheckInButtons({ reservationId, status, live, canCheckIn }: { reservationId: string; status: string; live: boolean; canCheckIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (presence: "attended" | "no_show" | "confirmed") => {
    if (!live) return setError("Démonstration : rien n'est enregistré.");
    setBusy(true);
    setError("");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminCheckIn")({ reservationId, presence });
      router.refresh();
    } catch (e) {
      setError(ERRORS[(e as { details?: { reason?: string } }).details?.reason ?? ""] ?? "Action impossible. Réessayez.");
    }
    setBusy(false);
  };
  const btn = "rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "confirmed" && (
        <>
          <button type="button" disabled={busy || !canCheckIn} onClick={() => run("attended")} className={`${btn} bg-emerald-700 text-white hover:bg-emerald-800`}>Présent</button>
          <button type="button" disabled={busy || !canCheckIn} onClick={() => run("no_show")} className={`${btn} border border-line bg-white text-ink hover:bg-cream`}>Absent</button>
        </>
      )}
      {(status === "attended" || status === "no_show") && (
        <button type="button" disabled={busy} onClick={() => run("confirmed")} className={`${btn} border border-line bg-white text-muted hover:bg-cream`}>Annuler le pointage</button>
      )}
      {!canCheckIn && status === "confirmed" && <span className="text-xs text-muted">Pointage 3 h avant le début</span>}
      {error && <span role="alert" className="text-xs text-red-800">{error}</span>}
    </div>
  );
}
