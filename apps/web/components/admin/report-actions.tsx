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

/** Audit 23/11 : compte gelé après plusieurs signalements (plus de nouvelle réservation) — lever le gel ou le poser. */
export function BookingHoldActions({ uid, active }: { uid: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    const note = window.prompt(active ? "Pourquoi lever le gel ? (note interne)" : "Pourquoi geler ce compte ? (note interne)") ?? "";
    setBusy(true);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminSetBookingHold")({ uid, active: !active, note });
      router.refresh();
    } catch {
      setBusy(false);
    }
  };
  return (
    <button type="button" disabled={busy} onClick={toggle} className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${active ? "bg-emerald-50 text-emerald-800" : "border border-red-300 text-red-800"}`}>
      {active ? "Lever le gel" : "Geler les réservations"}
    </button>
  );
}
