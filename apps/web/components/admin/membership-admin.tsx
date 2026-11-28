"use client";

import { DEFAULT_OFFERS, membershipPlanInputSchema, offerLabel, planOffers, type MembershipPlan } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

async function call(name: string, data: Record<string, unknown>) {
  await firebase().auth.authStateReady();
  await httpsCallable(firebase().functions, name)(data);
  await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
}
const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm";

/**
 * Offres (docs/22 § 17.I) : prix et visibilité du carnet et de chaque pass, offre mise en avant, activation.
 */
export function MembershipPlanForm({ plan, live }: { plan: MembershipPlan | null; live: boolean }) {
  const router = useRouter();
  const all = planOffers(plan ?? { offers: DEFAULT_OFFERS }, { includeInactive: true });
  const [rows, setRows] = useState(all.map((o) => ({ id: o.id, label: offerLabel(o), priceDh: String(o.price.amount / 100), isActive: o.isActive })));
  const [highlightId, setHighlightId] = useState(all.find((o) => o.highlight)?.id ?? "pass180");
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  return (
    <form
      noValidate
      className="space-y-4"
      data-testid="plan-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = { nameFr: plan?.name?.fr && !/annuel|membre/i.test(plan.name.fr) ? plan.name.fr : "Carnet et Pass", isActive, offers: rows.map((r) => ({ id: r.id, priceDh: r.priceDh, isActive: r.isActive })), highlightId };
        if (!membershipPlanInputSchema.safeParse(data).success) return setState("error");
        setState("busy");
        try {
          await call("adminSaveMembershipPlan", data);
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <table className="w-full text-sm">
        <thead><tr className="text-start text-xs text-muted"><th className="py-1 text-start font-medium">Offre</th><th className="py-1 text-start font-medium">Prix (DH)</th><th className="py-1 text-start font-medium">Proposée</th><th className="py-1 text-start font-medium">Mise en avant</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t border-line" data-testid="plan-offer">
              <td className="py-2 font-medium text-ink">{r.label}</td>
              <td className="py-2"><input aria-label={`Prix ${r.label}`} className={`${input} w-24`} inputMode="numeric" disabled={!live} value={r.priceDh} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, priceDh: e.target.value } : x)))} /></td>
              <td className="py-2"><input aria-label={`Proposer ${r.label}`} type="checkbox" disabled={!live} checked={r.isActive} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, isActive: e.target.checked } : x)))} /></td>
              <td className="py-2"><input aria-label={`Mettre en avant ${r.label}`} type="radio" name="highlight" disabled={!live} checked={highlightId === r.id} onChange={() => setHighlightId(r.id)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" disabled={!live} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Proposer le carnet et le pass sur le site</label>
      {live ? <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Enregistrer</button> : <p className="text-xs text-muted">Démonstration : les offres se règlent sur le site en ligne.</p>}
      {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.</p>}
      {state === "error" && <p role="alert" className="text-sm text-red-800">Au moins une offre proposée, avec un prix d&apos;au moins 1 DH.</p>}
    </form>
  );
}

export function GrantMembershipForm({ users }: { users: { uid: string; email: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("30");
  const [credits, setCredits] = useState("0");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_2fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) return setMsg({ ok: false, text: "Aucun compte avec cette adresse." });
        if (reason.trim().length < 2) return setMsg({ ok: false, text: "Indiquez un motif." });
        setBusy(true);
        try {
          await call("adminGrantMembership", { uid: user.uid, days: Number(days) || 0, credits: Number(credits) || 0, reason: reason.trim() });
          setMsg({ ok: true, text: `Offert à ${user.name || user.email}.` });
          setEmail("");
          setReason("");
          router.refresh();
        } catch {
          setMsg({ ok: false, text: "Action impossible." });
        }
        setBusy(false);
      }}
    >
      <label className="text-sm font-medium">E-mail du compte<input className={input} list="member-emails" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <datalist id="member-emails">{users.slice(0, 500).map((u) => <option key={u.uid} value={u.email}>{u.name}</option>)}</datalist>
      <label className="text-sm font-medium">Pass (jours)<input className={input} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></label>
      <label className="text-sm font-medium">Crédits de carnet<input className={input} inputMode="numeric" value={credits} onChange={(e) => setCredits(e.target.value)} /></label>
      <label className="text-sm font-medium">Motif (journalisé)<input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. partenaire, geste commercial" /></label>
      <button type="submit" disabled={busy} className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "…" : "Offrir"}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm sm:col-span-5 ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </form>
  );
}

/** Retirer un abonnement (motif obligatoire, confirmation dans la page). */
export function RevokeMembershipButton({ uid, name }: { uid: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50">Retirer</button>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label={`Motif du retrait pour ${name}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif" className="rounded-lg border border-line px-2 py-1 text-xs" />
      <button
        type="button"
        disabled={busy || reason.trim().length < 2}
        onClick={async () => {
          setBusy(true);
          try {
            await call("adminRevokeMembership", { uid, reason: reason.trim() });
            router.refresh();
          } catch {
            setBusy(false);
          }
        }}
        className="rounded-full bg-red-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        Confirmer le retrait
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">Annuler</button>
    </div>
  );
}

/** Annuler une absence (check-in oublié) ou lever une suspension (journalisé). */
export function AbsenceActions({ reservationId, uid, suspended }: { reservationId?: string; uid?: string; suspended?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (name: string, data: Record<string, unknown>) => {
    setBusy(true);
    try {
      await call(name, data);
      router.refresh();
    } catch {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {reservationId && <button type="button" disabled={busy} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50" onClick={() => window.confirm("La personne était bien là ? L'absence sera annulée.") && run("adminCancelAbsence", { reservationId })}>Annuler l&apos;absence</button>}
      {uid && suspended && <button type="button" disabled={busy} className="rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" onClick={() => { const reason = window.prompt("Motif (journalisé)"); if (reason && reason.trim().length >= 2) void run("adminLiftSuspension", { uid, reason: reason.trim() }); }}>Lever la suspension</button>}
    </div>
  );
}
