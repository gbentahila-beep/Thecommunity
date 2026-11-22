"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Clôturer un signalement (traité ou sans suite) avec une note interne. */
export function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const close = async (status: "resolved" | "dismissed") => {
    const note = window.prompt("Note interne (facultatif)") ?? "";
    setBusy(true);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminResolveReport")({ reportId, status, note });
      router.refresh();
    } catch {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => close("resolved")} className="rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Traité</button>
      <button type="button" disabled={busy} onClick={() => close("dismissed")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50">Sans suite</button>
    </div>
  );
}
