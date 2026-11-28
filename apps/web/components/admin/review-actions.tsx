"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Masquer / republier un avis (vérifié par le serveur, journalisé, note moyenne recalculée). */
export function ReviewActions({ reviewId, status }: { reviewId: string; status: "published" | "hidden" | "pending" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const set = async (to: "published" | "hidden") => {
    setBusy(true);
    setError(false);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminSetReviewStatus")({ reviewId, status: to });
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      router.refresh();
    } catch {
      setError(true);
    }
    setBusy(false);
  };
  // Audit 23/11 : avis en attente de modération → publier ou refuser.
  if (status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => set("published")} className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Publier</button>
        <button type="button" disabled={busy} onClick={() => set("hidden")} className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50">Refuser</button>
        {error && <p role="alert" className="mt-1 w-full text-xs text-red-800">Action impossible.</p>}
      </div>
    );
  }
  const next = status === "published" ? "hidden" : "published";
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            await firebase().auth.authStateReady();
            await httpsCallable(firebase().functions, "adminSetReviewStatus")({ reviewId, status: next });
            await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
            router.refresh();
          } catch {
            setError(true);
          }
          setBusy(false);
        }}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${next === "hidden" ? "border-red-300 text-red-800 hover:bg-red-50" : "border-emerald-600 text-emerald-800 hover:bg-emerald-50"}`}
      >
        {busy ? "…" : next === "hidden" ? "Masquer" : "Republier"}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-800">Action impossible.</p>}
    </div>
  );
}
