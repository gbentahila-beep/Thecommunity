"use client";

import { getDownloadURL, ref } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { firebase } from "@/lib/firebase/client";

async function call(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  await httpsCallable(firebase().functions, name)(data);
  await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
}

/** Photo encore privée (review-uploads/…) : lue avec les droits de l'équipe, jamais par une adresse publique. */
export function PrivatePhoto({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(path.startsWith("/") ? path : null);
  useEffect(() => {
    if (path.startsWith("/")) return;
    let alive = true;
    firebase().auth.authStateReady()
      .then(() => getDownloadURL(ref(firebase().storage, path)))
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(""));
    return () => {
      alive = false;
    };
  }, [path]);
  if (url === null) return <div className="h-32 w-48 animate-pulse rounded-xl bg-cream" />;
  if (!url) return <p className="text-xs text-red-800">Photo introuvable.</p>;
  // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée, hors optimiseur d'images
  return <img src={url} alt={alt} className="h-32 w-48 rounded-xl object-cover" data-testid="pending-photo" />;
}

/** Étape 24 — l'équipe traite les signalements (garder / masquer) et la photo (accepter / refuser avec motif). */
export function ReviewModeration({ reviewId, reportsOpen, photoPending, live }: { reviewId: string; reportsOpen: number; photoPending: boolean; live: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (name: string, data: Record<string, unknown>, done: string) => {
    if (!live) return setMsg({ ok: true, text: "Démonstration : rien n'est enregistré." });
    setBusy(true);
    setMsg(null);
    try {
      await call(name, { reviewId, ...data, note: note.trim() });
      setMsg({ ok: true, text: done });
      setNote("");
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as { message?: string }).message ?? "Action impossible." });
    }
    setBusy(false);
  };
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Note (historique ; transmise à la personne si la photo est refusée)</span>
        <input id={`mod-note-${reviewId}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="w-full max-w-xl rounded-lg border border-line bg-white px-3 py-1.5 text-sm" />
      </label>
      <div className="flex flex-wrap gap-2">
        {reportsOpen > 0 && (
          <>
            <button type="button" disabled={busy} onClick={() => run("adminResolveReviewReports", { outcome: "keep" }, "Signalements traités : avis gardé.")} className="rounded-full border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-800">Garder l&apos;avis</button>
            <button type="button" disabled={busy} onClick={() => run("adminResolveReviewReports", { outcome: "hide" }, "Avis masqué.")} className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800">Masquer l&apos;avis</button>
          </>
        )}
        {photoPending && (
          <>
            <button type="button" disabled={busy} onClick={() => run("adminDecideReviewPhoto", { decision: "approve" }, "Photo publiée.")} className="rounded-full border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-800">Publier la photo</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => (note.trim().length < 5 ? setMsg({ ok: false, text: "Indiquez pourquoi la photo est refusée (transmis à la personne)." }) : run("adminDecideReviewPhoto", { decision: "reject" }, "Photo refusée, la personne est prévenue."))}
              className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800"
            >
              Refuser la photo
            </button>
          </>
        )}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </div>
  );
}
