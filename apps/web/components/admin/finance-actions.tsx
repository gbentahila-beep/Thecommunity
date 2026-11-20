"use client";

import { commissionRuleInputSchema, COMMISSION_SCOPE_LABELS, COMMISSION_SCOPES, type CommissionScope } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100 disabled:bg-cream";
const ERRORS: Record<string, string> = {
  missing_bank_details: "L'organisateur n'a pas encore indiqué son RIB (Finances de son espace).",
  nothing_to_pay: "Rien à reverser pour l'instant (activités pas encore passées ou solde nul).",
  already_paid: "Ce reversement est déjà marqué payé.",
};
async function call(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  return httpsCallable(firebase().functions, name)(data);
}
const reasonOf = (e: unknown) => ERRORS[(e as { details?: { reason?: string } }).details?.reason ?? ""] ?? (e as { message?: string }).message ?? "Action impossible.";

/** Étape 21 — nouvelle règle de commission (super-admin). Une règle ne se modifie pas : on en crée une autre, datée. */
export function CommissionRuleForm({ targets, live, canEdit }: { targets: Record<Exclude<CommissionScope, "global">, { id: string; label: string }[]>; live: boolean; canEdit: boolean }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({ scope: "global" as CommissionScope, targetId: "", ratePercent: "15", fixedPerSeatDh: "", effectiveFrom: today, note: "" });
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof v, value: string) => { setV((x) => ({ ...x, [k]: value, ...(k === "scope" ? { targetId: "" } : {}) })); setState("idle"); };
  return (
    <form
      noValidate
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = commissionRuleInputSchema.safeParse({ ...v, fixedPerSeatDh: v.fixedPerSeatDh === "" ? undefined : v.fixedPerSeatDh });
        if (!r.success) { setState("error"); setMsg("Vérifiez les champs (cible obligatoire sauf pour « toutes les activités », taux entre 0 et 100)."); return; }
        if (!live) { setState("saved"); setMsg("Démonstration : rien n'est enregistré."); return; }
        setState("busy");
        try {
          await call("adminSaveCommissionRule", r.data);
          setState("saved");
          setMsg("Règle créée.");
          router.refresh();
        } catch (err) {
          setState("error");
          setMsg(reasonOf(err));
        }
      }}
    >
      <label className="text-sm"><span className="mb-1 block font-medium">S&apos;applique à</span>
        <select id="rule-scope" className={input} value={v.scope} disabled={!canEdit} onChange={(e) => set("scope", e.target.value)}>
          {[...COMMISSION_SCOPES].reverse().map((s) => <option key={s} value={s}>{COMMISSION_SCOPE_LABELS[s]}</option>)}
        </select>
      </label>
      {v.scope !== "global" && (
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">{COMMISSION_SCOPE_LABELS[v.scope]}</span>
          <select id="rule-target" className={input} value={v.targetId} disabled={!canEdit} onChange={(e) => set("targetId", e.target.value)}>
            <option value="">— Choisir —</option>
            {targets[v.scope].map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      )}
      <label className="text-sm"><span className="mb-1 block font-medium">Taux (%)</span><input id="rule-rate" className={input} inputMode="decimal" value={v.ratePercent} disabled={!canEdit} onChange={(e) => set("ratePercent", e.target.value)} /></label>
      <label className="text-sm"><span className="mb-1 block font-medium">+ fixe par place (DH, facultatif)</span><input id="rule-fixed" className={input} inputMode="decimal" value={v.fixedPerSeatDh} disabled={!canEdit} onChange={(e) => set("fixedPerSeatDh", e.target.value)} /></label>
      <label className="text-sm"><span className="mb-1 block font-medium">À partir du</span><input id="rule-from" type="date" className={input} value={v.effectiveFrom} disabled={!canEdit} onChange={(e) => set("effectiveFrom", e.target.value)} /></label>
      <label className="text-sm sm:col-span-3"><span className="mb-1 block font-medium">Note (facultatif)</span><input id="rule-note" className={input} value={v.note} disabled={!canEdit} onChange={(e) => set("note", e.target.value)} placeholder="Ex. taux négocié, contrat du 1er décembre" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        {canEdit && <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{state === "busy" ? "Enregistrement…" : "Ajouter la règle"}</button>}
        {msg && <p role={state === "error" ? "alert" : "status"} className={`text-sm ${state === "error" ? "text-red-800" : "text-emerald-800"}`}>{msg}</p>}
      </div>
    </form>
  );
}

export function RuleToggle({ ruleId, active, live }: { ruleId: string; active: boolean; live: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={busy || !live} onClick={async () => { setBusy(true); setError(""); try { await call("adminSetCommissionRuleActive", { ruleId, active: !active }); router.refresh(); } catch (e) { setError(reasonOf(e)); } setBusy(false); }} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold disabled:opacity-50">
        {active ? "Désactiver" : "Réactiver"}
      </button>
      {error && <span className="text-xs text-red-800">{error}</span>}
    </span>
  );
}

/** Préparer le reversement d'un organisateur (écritures dues, activités passées). */
export function CreatePayoutButton({ organizerId, live, disabled }: { organizerId: string; live: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy || disabled} onClick={async () => {
        if (!live) return setMsg("Démonstration : rien n'est enregistré.");
        setBusy(true); setMsg("");
        try { await call("adminCreatePayout", { organizerId }); router.refresh(); } catch (e) { setMsg(reasonOf(e)); }
        setBusy(false);
      }} className="rounded-full bg-plum-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Préparer le reversement</button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </span>
  );
}

/** Virement fait : référence bancaire, l'organisateur est prévenu. */
export function MarkPayoutPaid({ payoutId, live }: { payoutId: string; live: boolean }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`ref-${payoutId}`}>Référence du virement</label>
      <input id={`ref-${payoutId}`} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Référence du virement" className="w-44 rounded-lg border border-line bg-white px-2 py-1 text-xs" />
      <button type="button" disabled={busy || reference.trim().length < 3} onClick={async () => {
        if (!live) return setMsg("Démonstration : rien n'est enregistré.");
        setBusy(true); setMsg("");
        try { await call("adminMarkPayoutPaid", { payoutId, reference: reference.trim() }); router.refresh(); } catch (e) { setMsg(reasonOf(e)); }
        setBusy(false);
      }} className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Virement effectué</button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
