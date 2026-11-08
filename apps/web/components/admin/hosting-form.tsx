"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-plum-700 disabled:bg-cream";

/** Fiche hôte : qui accueille, et le déroulé prévu (équipe). */
export function HostingForm({ sessionId, initial, live }: { sessionId: string; initial: { hostName: string; notes: string }; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  return (
    <form
      className="space-y-3 print:hidden"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "adminSaveHosting")({ sessionId, ...v });
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <div>
        <label htmlFor="host-name" className="mb-1 block text-sm font-medium">Hôte ou hôtesse</label>
        <input id="host-name" className={input} maxLength={80} value={v.hostName} disabled={!live} onChange={(e) => { setV({ ...v, hostName: e.target.value }); setState("idle"); }} />
      </div>
      <div>
        <label htmlFor="host-notes" className="mb-1 block text-sm font-medium">Déroulé et consignes</label>
        <textarea id="host-notes" rows={5} className={input} maxLength={2000} value={v.notes} disabled={!live} placeholder={"19 h 45 : accueil, prénoms sur les marque-places\n20 h 00 : tour de table (une question chacun)\n…"} onChange={(e) => { setV({ ...v, notes: e.target.value }); setState("idle"); }} />
      </div>
      {live ? (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">Enregistrer la fiche</button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">Enregistrement impossible.</p>}
        </div>
      ) : (
        <p className="text-xs text-muted">Démonstration : la fiche s&apos;enregistre sur le site en ligne.</p>
      )}
    </form>
  );
}
