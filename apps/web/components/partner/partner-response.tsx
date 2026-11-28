"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Accepter ou refuser une demande Wenzy depuis le lien sécurisé (sans compte, docs/22 décision 45). */
export function PartnerResponse({ requestId, token }: { requestId: string; token: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error" | "demo">("idle");
  const answer = async (accept: boolean) => {
    if (!FIREBASE_ENABLED) return setState("demo");
    setState("busy");
    try {
      await httpsCallable(firebase().functions, "partnerRespondRequest")({ requestId, token, accept, note });
      router.refresh();
    } catch {
      setState("error");
    }
  };
  return (
    <div className="space-y-3" data-testid="partner-response">
      <label htmlFor="pr-note" className="block text-sm font-medium">Un mot pour l&apos;équipe (facultatif)</label>
      <input id="pr-note" maxLength={300} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. tables en terrasse" />
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={state === "busy"} onClick={() => answer(true)} className="rounded-full bg-emerald-700 px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60">Accepter</button>
        <button type="button" disabled={state === "busy"} onClick={() => answer(false)} className="rounded-full border border-red-300 bg-white px-4 py-3.5 text-base font-semibold text-red-800 disabled:opacity-60">Refuser</button>
      </div>
      {state === "error" && <p role="alert" className="text-sm text-red-800">Réponse impossible pour le moment. Réessayez, ou appelez l&apos;équipe Wenzy.</p>}
      {state === "demo" && <p role="status" className="text-sm text-brand-900">Démonstration : la réponse s&apos;enregistre sur le site en ligne.</p>}
    </div>
  );
}
