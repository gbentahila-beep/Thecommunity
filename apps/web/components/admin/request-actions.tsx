"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const ERRORS: Record<string, string> = {
  full: "Plus assez de places sur cette date pour accepter cette demande.",
  closed: "Les inscriptions sont fermées pour cette date.",
  already_booked: "Cette personne a déjà une place sur cette date.",
  request_not_pending: "Cette demande a déjà été traitée (ou retirée).",
  not_open: "Cette date n'est plus ouverte.",
};

/** Accepter (place réservée 24 h pour payer) ou refuser une demande. Vérifié et journalisé par le serveur. */
export function RequestActions({ requestId, name }: { requestId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");
  const decide = async (decision: "accept" | "decline") => {
    if (decision === "decline" && !window.confirm(`Refuser la demande de ${name} ? La personne sera prévenue.`)) return;
    setBusy(decision);
    setError("");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminDecideRequest")({ requestId, decision });
      router.refresh();
    } catch (e) {
      const reason = (e as { details?: { reason?: string } }).details?.reason ?? "";
      setError(ERRORS[reason] ?? "Action impossible. Réessayez.");
      setBusy(null);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("accept")}
          disabled={busy !== null}
          className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy === "accept" ? "…" : "Accepter"}
        </button>
        <button
          type="button"
          onClick={() => decide("decline")}
          disabled={busy !== null}
          className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-cream disabled:opacity-60"
        >
          {busy === "decline" ? "…" : "Refuser"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  );
}
