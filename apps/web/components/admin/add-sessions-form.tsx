"use client";

import { RECURRENCE_MAX_WEEKS, sessionPlanSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 disabled:bg-cream";

/** Rendez-vous récurrent (docs/22, décision 24) : ajouter des dates en quelques secondes. */
export function AddSessionsForm({ experienceId, defaults, live }: { experienceId: string; defaults: { firstDate: string; time: string; capacity: string }; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ ...defaults, weeks: "1" });
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [done, setDone] = useState("");
  const set = (k: keyof typeof v, value: string) => { setV((x) => ({ ...x, [k]: value })); setState("idle"); setDone(""); };
  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-3 text-sm"
      data-testid="add-sessions"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = sessionPlanSchema.safeParse(v);
        if (!parsed.success) return setState("error");
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          const res = (await httpsCallable(firebase().functions, "adminAddSessions")({ experienceId, sessions: parsed.data })).data as { created: number };
          await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
          setDone(`${res.created} date${res.created > 1 ? "s" : ""} ajoutée${res.created > 1 ? "s" : ""}.`);
          setState("idle");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <label className="flex flex-col gap-1 font-medium">Date<input type="date" className={input} disabled={!live} value={v.firstDate} onChange={(e) => set("firstDate", e.target.value)} /></label>
      <label className="flex flex-col gap-1 font-medium">Heure<input type="time" className={input} disabled={!live} value={v.time} onChange={(e) => set("time", e.target.value)} /></label>
      <label className="flex flex-col gap-1 font-medium">Chaque semaine pendant<input inputMode="numeric" className={`${input} w-24`} disabled={!live} value={v.weeks} onChange={(e) => set("weeks", e.target.value)} aria-describedby="as-weeks" /></label>
      <label className="flex flex-col gap-1 font-medium">Places<input inputMode="numeric" className={`${input} w-24`} disabled={!live} value={v.capacity} onChange={(e) => set("capacity", e.target.value)} /></label>
      {live ? (
        <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-4 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{state === "busy" ? "Ajout…" : "Ajouter"}</button>
      ) : (
        <span className="text-xs text-muted">Démonstration : les dates s&apos;ajoutent sur le site en ligne.</span>
      )}
      <span id="as-weeks" className="basis-full text-xs text-muted">1 = date unique, jusqu&apos;à {RECURRENCE_MAX_WEEKS} semaines. Prix, format et lieu habituel viennent du rendez-vous ; le lieu d&apos;une date se renseigne ensuite sur sa page.</span>
      {done && <p role="status" className="basis-full text-emerald-800">{done}</p>}
      {state === "error" && <p role="alert" className="basis-full text-red-800">Date future, heure, nombre de semaines (1 à {RECURRENCE_MAX_WEEKS}) et places (1 à 50) obligatoires.</p>}
    </form>
  );
}
