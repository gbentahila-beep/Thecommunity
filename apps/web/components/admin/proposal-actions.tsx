"use client";

import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/**
 * 18d — Actions sur une sortie proposée : la transformer en expérience (formulaire pré-rempli, rien n'est publié
 * tant que l'équipe n'a pas enregistré la fiche) ou la refuser avec un message transmis au membre.
 */
export function ProposalActions({ proposalId, live }: { proposalId: string; live: boolean }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const decline = async () => {
    if (message.trim().length < 5) return setError("Écrivez un court message pour le membre (5 caractères au moins).");
    setBusy(true);
    setError("");
    try {
      await httpsCallable(firebase().functions, "adminDecideProposal")({ proposalId, decision: "declined", message: message.trim() });
      router.refresh();
    } catch (e) {
      setError((e as { details?: { reason?: string } }).details?.reason === "proposal_not_pending" ? "Cette proposition a déjà été traitée." : "Refus impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/experiences/nouvelle?proposition=${proposalId}`} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white hover:bg-plum-800">
          Créer l&apos;expérience à partir de la proposition
        </Link>
        {!declining && (
          <button type="button" disabled={!live} onClick={() => setDeclining(true)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-cream disabled:opacity-40">
            Refuser
          </button>
        )}
      </div>
      {declining && (
        <div className="space-y-2 rounded-xl bg-cream p-3">
          <label htmlFor={`decline-${proposalId}`} className="block text-sm font-medium text-ink">Message pour le membre</label>
          <textarea id={`decline-${proposalId}`} value={message} maxLength={500} rows={2} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" placeholder="Ex. Le lieu n'est pas disponible en décembre : proposez-nous une autre date !" />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={decline} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Envoyer le refus</button>
            <button type="button" onClick={() => setDeclining(false)} className="rounded-full border border-line bg-white px-4 py-2 text-sm">Annuler</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
