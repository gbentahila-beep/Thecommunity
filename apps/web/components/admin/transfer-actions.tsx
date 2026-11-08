"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const ERRORS: Record<string, string> = {
  already_processed: "Déjà traité (par quelqu'un d'autre ?). La page va se mettre à jour.",
  not_found: "Introuvable.",
};

/**
 * « Virement reçu » / « Remboursement effectué » (étape 5h), avec confirmation dans la page :
 * l'équipe vérifie le montant et la référence sur le relevé avant de valider. Journalisé par le serveur.
 */
export function TransferAction({ kind, id, amount, reference, live }: { kind: "receive" | "refund"; id: string; amount: string; reference?: string; live: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = kind === "receive" ? "Virement reçu" : "Remboursement effectué";
  if (!live) return <span className="text-xs text-muted">Démonstration</span>;

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await firebase().auth.authStateReady();
      if (kind === "receive") await httpsCallable(firebase().functions, "adminConfirmTransfer")({ paymentId: id });
      else await httpsCallable(firebase().functions, "adminCompleteManualRefund")({ refundId: id });
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      router.refresh();
      setConfirm(false);
    } catch (e) {
      setError(ERRORS[(e as { details?: { reason?: string } }).details?.reason ?? ""] ?? "Action impossible. Réessayez.");
      router.refresh();
    }
    setBusy(false);
  };

  return (
    <div className="space-y-1.5">
      {!confirm ? (
        <button type="button" onClick={() => setConfirm(true)} className="rounded-full bg-plum-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-plum-800">
          {label}
        </button>
      ) : (
        <div className="rounded-xl bg-cream p-2.5 text-xs text-ink">
          <p>
            {kind === "receive"
              ? <>Confirmez : <strong>{amount}</strong> reçus avec la référence <strong className="font-mono">{reference}</strong>.</>
              : <>Confirmez : <strong>{amount}</strong> remboursés par virement à la personne.</>}
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={run} className="rounded-full bg-plum-900 px-3 py-1.5 font-semibold text-white disabled:opacity-60">{busy ? "…" : "Confirmer"}</button>
            <button type="button" disabled={busy} onClick={() => setConfirm(false)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted">Annuler</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    </div>
  );
}
