"use client";

import { rendezvousInputSchema, VENUE_TIERS, type RendezvousFrequency, type VenueTier } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 disabled:bg-cream";
export const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIER_LABEL: Record<VenueTier, string> = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" };

export type RendezvousFormValues = {
  id?: string; titleFr: string; titleAr: string; titleEn: string; cityId: string; weekday: number; time: string; capacity: string;
  baseExperienceId: string; tiers: Partial<Record<VenueTier, RendezvousFrequency>>; status: "active" | "paused";
};

/**
 * docs/25 — créer ou modifier un rendez-vous de la semaine : jour et heure fixes, places par date, expérience de base
 * (copiée pour chaque gamme) et fréquence de chaque gamme. Les dates sont créées automatiquement 6 semaines à l'avance.
 */
export function RendezvousForm({ initial, experiences, live }: { initial: RendezvousFormValues; experiences: { id: string; label: string }[]; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const set = <K extends keyof RendezvousFormValues>(k: K, x: RendezvousFormValues[K]) => { setV((o) => ({ ...o, [k]: x })); setState("idle"); };
  const setTier = (t: VenueTier, f: RendezvousFrequency | null) => set("tiers", Object.fromEntries(Object.entries({ ...v.tiers, [t]: f }).filter(([, x]) => x)) as RendezvousFormValues["tiers"]);

  return (
    <form
      className="space-y-4 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = { ...(v.id ? { id: v.id } : {}), titleFr: v.titleFr, titleAr: v.titleAr, titleEn: v.titleEn, cityId: v.cityId, weekday: v.weekday, time: v.time, capacity: v.capacity, baseExperienceId: v.baseExperienceId, tiers: VENUE_TIERS.filter((t) => v.tiers[t]).map((t) => ({ tier: t, frequency: v.tiers[t]! })), status: v.status };
        const parsed = rendezvousInputSchema.safeParse(data);
        if (!parsed.success) { setMsg("Vérifiez le nom, l'heure (HH:MM), les places, l'expérience de base et au moins une gamme."); return setState("error"); }
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          const out = (await httpsCallable(firebase().functions, "adminSaveRendezvous")(parsed.data)).data as { created: number };
          setMsg(`Enregistré. ${out.created} date(s) créée(s).`);
          setState("saved");
          router.refresh();
        } catch {
          setMsg("Enregistrement impossible.");
          setState("error");
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 font-medium sm:col-span-3">Nom (français)<input className={input} disabled={!live} value={v.titleFr} onChange={(e) => set("titleFr", e.target.value)} placeholder="Dîner du mercredi" /></label>
        <label className="flex flex-col gap-1 font-medium">Nom (arabe)<input dir="rtl" className={input} disabled={!live} value={v.titleAr} onChange={(e) => set("titleAr", e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">Nom (anglais)<input className={input} disabled={!live} value={v.titleEn} onChange={(e) => set("titleEn", e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">Ville<input className={input} disabled={!live} value={v.cityId} onChange={(e) => set("cityId", e.target.value.trim())} /></label>
        <label className="flex flex-col gap-1 font-medium">Jour<select className={input} disabled={!live} value={v.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
        <label className="flex flex-col gap-1 font-medium">Heure<input type="time" className={input} disabled={!live} value={v.time} onChange={(e) => set("time", e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">Places par date et par gamme<input inputMode="numeric" className={input} disabled={!live} value={v.capacity} onChange={(e) => set("capacity", e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium sm:col-span-3">Expérience de base (copiée pour chaque gamme : textes, photos, prix, questionnaire)
          <select className={input} disabled={!live || Boolean(v.id)} value={v.baseExperienceId} onChange={(e) => set("baseExperienceId", e.target.value)}>
            <option value="">— Choisir —</option>
            {experiences.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="space-y-2 rounded-xl border border-line p-4">
        <legend className="px-1 font-semibold text-ink">Gammes</legend>
        {VENUE_TIERS.map((t) => (
          <div key={t} className="flex flex-wrap items-center gap-3">
            <label className="flex w-32 items-center gap-2 font-medium"><input type="checkbox" disabled={!live} checked={Boolean(v.tiers[t])} onChange={(e) => setTier(t, e.target.checked ? (t === "exclusive" ? "first_of_month" : "weekly") : null)} />{TIER_LABEL[t]}</label>
            {v.tiers[t] && (
              <select className="rounded-lg border border-line bg-white px-2 py-1" disabled={!live} value={v.tiers[t]} onChange={(e) => setTier(t, e.target.value as RendezvousFrequency)}>
                <option value="weekly">Chaque semaine</option>
                <option value="first_of_month">Le premier du mois</option>
              </select>
            )}
          </div>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 font-medium"><input type="checkbox" disabled={!live} checked={v.status === "active"} onChange={(e) => set("status", e.target.checked ? "active" : "paused")} />Actif (les dates se créent automatiquement)</label>
      <p className="text-xs text-muted">Réservations fermées la veille à 20h30. Chaque gamme est une expérience à part (onglet Événements) : son prix, ses restaurants et ses tables. Les dates déjà créées ne sont jamais supprimées.</p>
      {live && <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-60">{state === "busy" ? "Enregistrement…" : "Enregistrer le rendez-vous"}</button>}
      {msg && <p role={state === "error" ? "alert" : "status"} className={state === "error" ? "text-red-800" : "text-emerald-800"}>{msg}</p>}
    </form>
  );
}
