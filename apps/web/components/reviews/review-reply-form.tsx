"use client";

import { REVIEW_REPLY_MAX } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Étape 24 — réponse publique à un avis (organisateur de l'activité, ou équipe). Vide = réponse retirée. */
export function ReviewReplyForm({ reviewId, initial, live }: { reviewId: string; initial: string; live: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (value: string) => {
    if (value && value.trim().length < 2) return setMsg({ ok: false, text: "Réponse trop courte." });
    if (!live) return setMsg({ ok: true, text: "Démonstration : rien n'est enregistré." });
    setBusy(true);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "replyToReview")({ reviewId, text: value.trim() });
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      setMsg({ ok: true, text: value ? "Réponse publiée sous l'avis. La personne est prévenue." : "Réponse retirée." });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as { message?: string }).message ?? "Action impossible." });
    }
    setBusy(false);
  };
  if (!open)
    return (
      <div className="space-y-1">
        <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-plum-900 px-4 py-1.5 text-sm font-semibold text-plum-900">
          {initial ? "Modifier la réponse" : "Répondre"}
        </button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
      </div>
    );
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save(text);
      }}
    >
      <label htmlFor={`reply-${reviewId}`} className="block text-sm font-medium">Votre réponse (publique, sous l&apos;avis)</label>
      <textarea id={`reply-${reviewId}`} rows={3} maxLength={REVIEW_REPLY_MAX} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
      <p className="text-xs text-muted">Restez courtois : remerciez, répondez sur les faits, sans donnée personnelle. La personne est prévenue.</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-full bg-plum-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">Publier la réponse</button>
        {initial && <button type="button" disabled={busy} onClick={() => void save("")} className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-800">Retirer la réponse</button>}
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted underline">Annuler</button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </form>
  );
}
