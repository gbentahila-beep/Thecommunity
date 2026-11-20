"use client";

import { httpsCallable } from "firebase/functions";
import { getBlob, ref } from "firebase/storage";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const LABELS = {
  approve: "Valider le compte",
  request_info: "Demander un complément",
  reject: "Refuser",
  suspend: "Suspendre",
  reactivate: "Réactiver",
} as const;
type Decision = keyof typeof LABELS;
const NEEDS_MESSAGE: Decision[] = ["request_info", "reject", "suspend"];

/** Étape 20 — décisions de l'équipe sur un compte organisateur (message transmis à l'organisateur si nécessaire). */
export function OrganizerDecision({ organizerId, status, live }: { organizerId: string; status: string; live: boolean }) {
  const router = useRouter();
  const allowed: Decision[] =
    status === "pending" ? ["approve", "request_info", "reject"] : status === "info_requested" ? ["approve", "reject"] : status === "approved" ? ["suspend"] : ["reactivate"];
  const [decision, setDecision] = useState<Decision | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const run = async (d: Decision) => {
    if (NEEDS_MESSAGE.includes(d) && message.trim().length < 5) return setResult("Écrivez un message (5 caractères minimum) : il est transmis à l'organisateur.");
    if (!live) return setResult("Démonstration : rien n'est enregistré.");
    setBusy(true);
    setResult("");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminDecideOrganizer")({ organizerId, decision: d, message: message.trim() });
      setDecision(null);
      setMessage("");
      setResult("Enregistré. L'organisateur est prévenu.");
      router.refresh();
    } catch (e) {
      setResult((e as { message?: string }).message ?? "Action impossible.");
    }
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allowed.map((d) => (
          <button
            key={d}
            type="button"
            disabled={busy}
            onClick={() => (NEEDS_MESSAGE.includes(d) ? setDecision(d) : void run(d))}
            className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${d === "approve" || d === "reactivate" ? "bg-emerald-700 text-white hover:bg-emerald-800" : d === "request_info" ? "border border-amber-400 bg-amber-50 text-amber-950" : "border border-red-300 bg-white text-red-800 hover:bg-red-50"}`}
          >
            {LABELS[d]}
          </button>
        ))}
      </div>
      {decision && (
        <div className="max-w-xl space-y-2 rounded-xl border border-line bg-cream p-3">
          <label htmlFor="org-decision-message" className="block text-sm font-medium">Message à l&apos;organisateur ({LABELS[decision].toLowerCase()})</label>
          <textarea id="org-decision-message" rows={3} maxLength={800} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" placeholder={decision === "request_info" ? "Ex. Merci d'ajouter l'attestation d'assurance responsabilité civile." : ""} />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => run(decision)} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Confirmer</button>
            <button type="button" onClick={() => setDecision(null)} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold">Annuler</button>
          </div>
        </div>
      )}
      {result && <p role="status" className="text-sm text-muted">{result}</p>}
    </div>
  );
}

/** Ouvre une pièce justificative (lecture réservée à l'équipe par les règles du stockage). */
export function OrganizerDocument({ path, name, live }: { path: string; name: string; live: boolean }) {
  const [error, setError] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <FileText className="size-4 text-plum-900" aria-hidden />
      <button
        type="button"
        className="text-sm font-medium text-plum-900 underline"
        onClick={async () => {
          if (!live) return setError("Démonstration : pas de fichier.");
          try {
            await firebase().auth.authStateReady();
            const blob = await getBlob(ref(firebase().storage, path));
            window.open(URL.createObjectURL(blob), "_blank", "noopener");
          } catch {
            setError("Ouverture impossible.");
          }
        }}
      >
        {name}
      </button>
      {error && <span className="text-xs text-red-800">{error}</span>}
    </span>
  );
}

/** Étape 20 — relecture d'une activité envoyée par un organisateur : publier ou refuser avec un message. */
export function ExperienceReview({ experienceId, status, reviewFlag, live }: { experienceId: string; status: string; reviewFlag: boolean; live: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const run = async (decision: "publish" | "reject" | "reviewed") => {
    if (decision === "reject" && message.trim().length < 5) return setResult("Écrivez ce qu'il faut corriger (5 caractères minimum).");
    if (!live) return setResult("Démonstration : rien n'est enregistré.");
    setBusy(true);
    setResult("");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminReviewExperience")({ experienceId, decision, message: message.trim() });
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      setResult(decision === "publish" ? "Publiée. L'organisateur est prévenu." : decision === "reject" ? "Refusée. L'organisateur est prévenu." : "Marquée comme relue.");
      setRejecting(false);
      router.refresh();
    } catch (e) {
      setResult((e as { message?: string }).message ?? "Action impossible.");
    }
    setBusy(false);
  };
  return (
    <div className="space-y-3" data-testid="experience-review">
      {status === "pending_review" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => run("publish")} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">Publier l&apos;activité</button>
          <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">Refuser…</button>
        </div>
      )}
      {status === "published" && reviewFlag && (
        <button type="button" disabled={busy} onClick={() => run("reviewed")} className="rounded-full border border-plum-900 px-4 py-2 text-sm font-semibold text-plum-900">Modifications relues ✓</button>
      )}
      {rejecting && (
        <div className="max-w-xl space-y-2 rounded-xl border border-line bg-cream p-3">
          <label htmlFor="review-message" className="block text-sm font-medium">Ce qu&apos;il faut corriger (transmis à l&apos;organisateur)</label>
          <textarea id="review-message" rows={3} maxLength={800} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
          <button type="button" disabled={busy} onClick={() => run("reject")} className="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Confirmer le refus</button>
        </div>
      )}
      {result && <p role="status" className="text-sm text-muted">{result}</p>}
    </div>
  );
}
