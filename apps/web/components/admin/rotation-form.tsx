"use client";

import { rotationInputSchema, rotationWeekInputSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 disabled:bg-cream";
const small = "rounded-lg border border-line bg-white px-2 py-1.5 outline-none focus:border-brand-700 disabled:bg-cream";

export type ActivityOption = { id: string; label: string; time: string; capacity: number };
export type RotationFormValues = {
  id?: string; titleFr: string; titleAr: string; titleEn: string; cityId: string; anchor: string; status: "active" | "paused";
  cycle: { experienceId: string; time: string; capacity: string }[];
};

async function call(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  return (await httpsCallable(firebase().functions, name, { timeout: 120_000 })(data)).data as { created?: number; removed?: number; kept?: number };
}
const summary = (o: { created?: number; removed?: number; kept?: number }) =>
  [`${o.created ?? 0} date(s) créée(s)`, `${o.removed ?? 0} retirée(s)`, o.kept ? `${o.kept} gardée(s) car des personnes sont inscrites` : ""].filter(Boolean).join(", ");

/** docs/25, lot D — l'activité du samedi : ordre de la rotation, heure et places de chaque activité, premier samedi. */
export function RotationForm({ initial, activities, live }: { initial: RotationFormValues; activities: ActivityOption[]; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const set = <K extends keyof RotationFormValues>(k: K, x: RotationFormValues[K]) => { setV((o) => ({ ...o, [k]: x })); setState("idle"); };
  const setRow = (i: number, patch: Partial<RotationFormValues["cycle"][number]>) => set("cycle", v.cycle.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const c = [...v.cycle];
    const j = i + d;
    if (j < 0 || j >= c.length) return;
    [c[i], c[j]] = [c[j]!, c[i]!];
    set("cycle", c);
  };
  const free = activities.filter((a) => !v.cycle.some((c) => c.experienceId === a.id));

  return (
    <form
      className="space-y-4 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = rotationInputSchema.safeParse({ ...(v.id ? { id: v.id } : {}), titleFr: v.titleFr, titleAr: v.titleAr, titleEn: v.titleEn, cityId: v.cityId, weekday: 6, anchor: v.anchor, cycle: v.cycle, status: v.status });
        if (!parsed.success) { setMsg("Vérifiez le nom, le premier samedi, et pour chaque activité l'heure (HH:MM) et les places."); return setState("error"); }
        setState("busy");
        try {
          setMsg(`Enregistré : ${summary(await call("adminSaveRotation", parsed.data))}.`);
          setState("saved");
          router.refresh();
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Enregistrement impossible.");
          setState("error");
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 font-medium sm:col-span-3">Nom (français)<input className={input} disabled={!live} value={v.titleFr} onChange={(e) => set("titleFr", e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">Nom (arabe)<input dir="rtl" className={input} disabled={!live} value={v.titleAr} onChange={(e) => set("titleAr", e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">Nom (anglais)<input className={input} disabled={!live} value={v.titleEn} onChange={(e) => set("titleEn", e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">La rotation commence le (un samedi)<input type="date" className={input} disabled={!live} value={v.anchor} onChange={(e) => set("anchor", e.target.value)} /></label>
      </div>
      <fieldset className="space-y-2 rounded-xl border border-line p-4" data-testid="rotation-cycle">
        <legend className="px-1 font-semibold text-ink">Ordre de la rotation (une activité par samedi, puis on recommence)</legend>
        {v.cycle.map((r, i) => (
          <div key={r.experienceId} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-muted">{i + 1}.</span>
            <span className="min-w-40 flex-1 font-medium text-ink">{activities.find((a) => a.id === r.experienceId)?.label ?? r.experienceId}</span>
            <label className="flex items-center gap-1">Heure<input type="time" className={small} disabled={!live} value={r.time} onChange={(e) => setRow(i, { time: e.target.value })} /></label>
            <label className="flex items-center gap-1">Places<input inputMode="numeric" className={`${small} w-16`} disabled={!live} value={r.capacity} onChange={(e) => setRow(i, { capacity: e.target.value })} /></label>
            <button type="button" disabled={!live || i === 0} onClick={() => move(i, -1)} className="rounded-lg px-2 py-1 hover:bg-cream disabled:opacity-30" aria-label="Monter">↑</button>
            <button type="button" disabled={!live || i === v.cycle.length - 1} onClick={() => move(i, 1)} className="rounded-lg px-2 py-1 hover:bg-cream disabled:opacity-30" aria-label="Descendre">↓</button>
            <button type="button" disabled={!live} onClick={() => set("cycle", v.cycle.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-red-700 hover:bg-cream">Retirer</button>
          </div>
        ))}
        {free.length > 0 && (
          <select
            className={small}
            disabled={!live}
            value=""
            onChange={(e) => {
              const a = activities.find((x) => x.id === e.target.value);
              if (a) set("cycle", [...v.cycle, { experienceId: a.id, time: a.time, capacity: String(a.capacity) }]);
            }}
          >
            <option value="">+ Ajouter une activité à la rotation</option>
            {free.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        )}
      </fieldset>
      <label className="flex items-center gap-2 font-medium"><input type="checkbox" disabled={!live} checked={v.status === "active"} onChange={(e) => set("status", e.target.checked ? "active" : "paused")} />Actif (les dates se créent automatiquement, 6 semaines à l&apos;avance)</label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={!live || state === "busy"} className="rounded-full bg-brand-900 px-5 py-2.5 font-semibold text-white disabled:opacity-40">{state === "busy" ? "Enregistrement…" : "Enregistrer la rotation"}</button>
        {msg && <p role="status" className={state === "error" ? "text-red-700" : "text-green-700"}>{msg}</p>}
      </div>
    </form>
  );
}

export type WeekRow = {
  date: string; label: string; source: "cycle" | "override"; experienceId: string | null; activity: string; time: string; capacity: number;
  shift: boolean; note: string; booked: number; conflicts: string[];
  /** Ouverture des réservations : ouvert à tous, aux abonnés Pass seulement, plus tard ; heure limite pour changer. */
  state?: "open" | "pass" | "later" | "none"; opens?: string; deadline?: string; sessionId?: string | null;
};

const STATE = {
  open: { label: "Ouvert", cls: "bg-emerald-100 text-emerald-900" },
  pass: { label: "Abonnés Pass", cls: "bg-brand-100 text-brand-900" },
  later: { label: "S'ouvre le", cls: "bg-stone-200 text-stone-700" },
  none: { label: "—", cls: "bg-stone-100 text-stone-500" },
} as const;

/** Un samedi du planning : garder la rotation, choisir une autre activité (ex. la proposition d'un partenaire) ou rien. */
export function RotationWeek({ rotationId, row, activities, live }: { rotationId: string; row: WeekRow; activities: ActivityOption[]; live: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>(row.source === "override" ? (row.experienceId ?? "none") : "");
  const [time, setTime] = useState(row.time);
  const [capacity, setCapacity] = useState(String(row.capacity));
  const [shift, setShift] = useState(row.shift);
  const [note, setNote] = useState(row.note);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (override: unknown) => {
    const parsed = rotationWeekInputSchema.safeParse({ id: rotationId, date: row.date, override });
    if (!parsed.success) return setMsg("Vérifiez l'heure (HH:MM) et les places.");
    setBusy(true);
    try {
      setMsg(summary(await call("adminSetRotationWeek", parsed.data)));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-3" data-testid="rotation-week">
      <div className="grid gap-x-3 gap-y-1 md:grid-cols-[7rem_1fr_9rem_7rem] md:items-center">
        <span className="font-semibold text-ink">{row.label.charAt(0).toUpperCase() + row.label.slice(1)}</span>
        <span className="min-w-0">
          {row.sessionId ? <a href={`/admin/sessions/${row.sessionId}`} className="font-medium text-ink hover:text-brand-900">{row.activity}</a> : <span className={row.experienceId ? "font-medium text-ink" : "text-muted"}>{row.activity}</span>}
          {row.experienceId && <span className="text-sm text-muted"> · {row.time.replace(":", "h")} · {row.booked}/{row.capacity} inscrits</span>}
          {row.source === "override" && <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Changé{row.shift ? " · rotation décalée" : ""}</span>}
          {row.note && <span className="block text-xs text-muted">{row.note}</span>}
          {row.conflicts.length > 0 && <span className="block text-xs font-semibold text-amber-700">Gardé car des personnes sont inscrites : {row.conflicts.join(", ")}</span>}
        </span>
        <span className="text-xs" data-testid="rotation-opens" title={row.deadline || undefined}>
          {row.state && <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${STATE[row.state].cls}`}>{STATE[row.state].label}</span>}
          {row.opens && <span className="block text-muted">{row.opens}</span>}
        </span>
        <span className="md:text-end">{live && <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-brand-900 hover:border-brand-700">{open ? "Fermer" : "Changer"}</button>}</span>
      </div>
      {open && row.deadline && <p className="mt-2 text-xs text-muted">{row.deadline}.</p>}
      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-cream p-4 text-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 font-medium">Activité
              <select
                className={small}
                value={choice}
                onChange={(e) => {
                  setChoice(e.target.value);
                  const a = activities.find((x) => x.id === e.target.value);
                  if (a) { setTime(a.time); setCapacity(String(a.capacity)); }
                }}
              >
                <option value="">— Choisir —</option>
                {activities.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                <option value="none">Pas d&apos;activité ce samedi</option>
              </select>
            </label>
            {choice && choice !== "none" && (
              <>
                <label className="flex flex-col gap-1 font-medium">Heure<input type="time" className={small} value={time} onChange={(e) => setTime(e.target.value)} /></label>
                <label className="flex flex-col gap-1 font-medium">Places<input inputMode="numeric" className={`${small} w-20`} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></label>
              </>
            )}
          </div>
          <label className="flex flex-col gap-1 font-medium">Note pour l&apos;équipe (facultatif)<input className={small} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. proposition du club de tennis X" /></label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" checked={shift} onChange={(e) => setShift(e.target.checked)} />
            <span><strong>Décaler la rotation</strong> : l&apos;activité prévue ({row.source === "cycle" ? row.activity : "celle dont c'était le tour"}) passe au samedi suivant, et toute la suite recule d&apos;une semaine. Sinon, elle saute son tour et la rotation continue normalement.</span>
          </label>
          <p className="text-xs text-muted">Pour une proposition d&apos;un partenaire (ex. du tennis) : créez d&apos;abord l&apos;événement dans l&apos;univers Activités, publiez-le, puis choisissez-le ici. Si des personnes sont déjà inscrites à l&apos;activité prévue, sa date est gardée.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || !choice}
              onClick={() => save({ experienceId: choice === "none" ? null : choice, ...(choice !== "none" ? { time, capacity } : {}), shift, note })}
              className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Enregistrement…" : "Enregistrer ce samedi"}
            </button>
            {row.source === "override" && <button type="button" disabled={busy} onClick={() => save(null)} className="font-semibold text-brand-900 underline">Revenir à la rotation</button>}
          </div>
        </div>
      )}
      {msg && <p role="status" className="mt-1 text-xs text-muted">{msg}</p>}
    </li>
  );
}

export type SaturdayOption = { date: string; label: string; planned: string; booked: number; locked: boolean };

/**
 * Fiche d'une activité (univers Activités) : sa place dans l'activité du samedi. L'ajouter à la rotation (elle revient
 * à son tour) ou la programmer un samedi précis (à la place de l'activité prévue, sans toucher aux inscrits).
 */
export function SaturdayActivityCard({ rotationId, experienceId, inCycle, defaults, saturdays, live }: {
  rotationId: string; experienceId: string; inCycle: boolean; defaults: { time: string; capacity: number }; saturdays: SaturdayOption[]; live: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"" | "cycle" | "once">("");
  const [time, setTime] = useState(defaults.time);
  const [capacity, setCapacity] = useState(String(defaults.capacity));
  const free = saturdays.filter((s) => !s.locked);
  const [date, setDate] = useState(free[0]?.date ?? "");
  const [shift, setShift] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const run = async (name: string, data: unknown, ok: string) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await call(name, data);
      setMsg(`${ok} ${summary(r)}.`);
      setMode("");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };
  const fields = (
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 font-medium">Heure<input type="time" className={small} value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label className="flex flex-col gap-1 font-medium">Places<input inputMode="numeric" className={`${small} w-20`} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></label>
    </div>
  );
  return (
    <div className="space-y-3 text-sm" data-testid="saturday-activity">
      {live && (
        <div className="flex flex-wrap gap-2">
          {!inCycle && <button type="button" onClick={() => setMode(mode === "cycle" ? "" : "cycle")} className="rounded-full border border-brand-900 px-4 py-2 font-semibold text-brand-900">Ajouter à la rotation</button>}
          <button type="button" onClick={() => setMode(mode === "once" ? "" : "once")} className="rounded-full border border-brand-900 px-4 py-2 font-semibold text-brand-900">Programmer un samedi</button>
        </div>
      )}
      {mode === "cycle" && (
        <div className="space-y-3 rounded-xl bg-cream p-4">
          <p className="text-muted">Elle passe en dernière position de la rotation et revient ensuite à son tour. L&apos;ordre se règle dans le planning.</p>
          {fields}
          <button type="button" disabled={busy} onClick={() => run("adminRotationAddActivity", { id: rotationId, experienceId, time, capacity }, "Ajoutée à la rotation :")} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-40">{busy ? "Enregistrement…" : "Ajouter à la rotation"}</button>
        </div>
      )}
      {mode === "once" && (
        <div className="space-y-3 rounded-xl bg-cream p-4">
          {free.length === 0 ? <p className="text-muted">Aucun samedi libre : tous les samedis proches ont déjà des inscrits.</p> : (
            <>
              <label className="flex flex-col gap-1 font-medium">Samedi
                <select className={small} value={date} onChange={(e) => setDate(e.target.value)}>
                  {free.map((s) => <option key={s.date} value={s.date}>{s.label} · prévu : {s.planned}</option>)}
                </select>
              </label>
              {fields}
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={shift} onChange={(e) => setShift(e.target.checked)} />
                <span><strong>Décaler la rotation</strong> : l&apos;activité prévue ce samedi passe au suivant. Sinon, elle saute son tour.</span>
              </label>
              <button type="button" disabled={busy || !date} onClick={() => run("adminSetRotationWeek", { id: rotationId, date, override: { experienceId, time, capacity: Number(capacity), shift } }, "Programmée :")} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-40">{busy ? "Enregistrement…" : "Programmer ce samedi"}</button>
            </>
          )}
          {saturdays.some((s) => s.locked) && <p className="text-xs text-muted">Les samedis qui ont déjà des inscrits ne sont pas proposés.</p>}
        </div>
      )}
      {msg && <p role="status" className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
