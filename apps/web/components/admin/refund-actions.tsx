"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const ERRORS: Record<string, string> = {
  already_decided: "Cette demande a déjà été traitée.",
  nothing_to_refund: "Il ne reste rien à rembourser sur cette réservation.",
};

/** Étape 22 — décision sur une demande de remboursement : total, partiel (montant) ou refus motivé. */
export function RefundDecision({ requestId, maxDh, live }: { requestId: string; maxDh: number; live: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"full" | "partial" | "decline" | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const run = async (decision: "full" | "partial" | "decline") => {
    if (decision === "partial" && !(Number(amount.replace(",", ".")) > 0)) return setResult("Indiquez le montant à rembourser.");
    if (decision === "decline" && message.trim().length < 5) return setResult("Expliquez le refus (5 caractères minimum) : le message est transmis au participant.");
    if (!live) return setResult("Démonstration : rien n'est enregistré.");
    setBusy(true);
    setResult("");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminDecideRefund")({ requestId, decision, ...(decision === "partial" ? { amountDh: Number(amount.replace(",", ".")) } : {}), message: message.trim() });
      setResult("Enregistré. Le participant est prévenu.");
      router.refresh();
    } catch (e) {
      setResult(ERRORS[(e as { details?: { reason?: string } }).details?.reason ?? ""] ?? (e as { message?: string }).message ?? "Action impossible.");
    }
    setBusy(false);
  };
  return (
    <div className="space-y-2" data-testid="refund-decision">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => (mode === "full" ? void run("full") : setMode("full"))} className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">{mode === "full" ? "Confirmer le remboursement total" : "Rembourser tout"}</button>
        <button type="button" disabled={busy} onClick={() => setMode("partial")} className="rounded-full border border-brand-900 px-4 py-1.5 text-sm font-semibold text-brand-900">Rembourser en partie</button>
        <button type="button" disabled={busy} onClick={() => setMode("decline")} className="rounded-full border border-red-300 bg-white px-4 py-1.5 text-sm font-semibold text-red-800">Refuser</button>
      </div>
      {mode === "partial" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm"><span className="mb-1 block font-medium">Montant (DH, {maxDh.toLocaleString("fr-FR")} au plus)</span><input id={`refund-amount-${requestId}`} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="w-36 rounded-lg border border-line bg-white px-3 py-1.5" /></label>
          <button type="button" disabled={busy} onClick={() => run("partial")} className="rounded-full bg-brand-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">Confirmer</button>
        </div>
      )}
      {(mode === "partial" || mode === "decline" || mode === "full") && (
        <label className="block text-sm"><span className="mb-1 block font-medium">{mode === "decline" ? "Motif du refus (transmis au participant)" : "Message au participant (facultatif)"}</span>
          <textarea id={`refund-message-${requestId}`} rows={2} maxLength={800} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full max-w-xl rounded-lg border border-line bg-white px-3 py-2" />
        </label>
      )}
      {mode === "decline" && <button type="button" disabled={busy} onClick={() => run("decline")} className="rounded-full bg-red-800 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">Confirmer le refus</button>}
      {result && <p role="status" className="text-sm text-muted">{result}</p>}
    </div>
  );
}
