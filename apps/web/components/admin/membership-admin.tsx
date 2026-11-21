"use client";

import { MEMBERSHIP_DURATIONS, membershipPlanInputSchema, offerEconomics, planOffers, type MembershipOffer, type MembershipPlan } from "@thecommunity/shared";
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

type OfferRow = { months: (typeof MEMBERSHIP_DURATIONS)[number]; priceDh: string; isActive: boolean };
const DEFAULT_PRICES: Record<number, string> = { 1: "129", 3: "339", 6: "590", 12: "990" };

/** Réglages de la formule : prix par durée, mise en avant, réduction, frais offerts, accès anticipé, avantages, activation. */
export function MembershipPlanForm({ plan, live }: { plan: MembershipPlan | null; live: boolean }) {
  const router = useRouter();
  const stored = plan?.offers?.length ? plan.offers : plan ? [{ id: "12m", months: 12 as const, price: plan.price, isActive: true, highlight: true }] : [];
  const [rows, setRows] = useState<OfferRow[]>(
    MEMBERSHIP_DURATIONS.map((m) => {
      const o = stored.find((x) => x.months === m);
      return { months: m, priceDh: o ? String(o.price.amount / 100) : plan ? "" : DEFAULT_PRICES[m]!, isActive: o ? o.isActive : !plan };
    }),
  );
  const [highlight, setHighlight] = useState<number>(stored.find((o) => o.highlight)?.months ?? 6);
  const [v, setV] = useState({
    nameFr: plan?.name.fr ?? "The Host Club Membre",
    nameAr: plan?.name.ar ?? "",
    priceDh: plan ? String(plan.price.amount / 100) : "990",
    discountPercent: String(plan?.discountPercent ?? 15),
    earlyAccessHours: String(plan?.earlyAccessHours ?? 48),
    benefitsFr: (plan?.benefits ?? []).map((b) => b.fr).join("\n"),
    benefitsAr: (plan?.benefits ?? []).map((b) => b.ar ?? "").join("\n"),
    isActive: plan?.isActive ?? false,
    waiveServiceFee: plan?.waiveServiceFee ?? true,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, value: string | boolean) => setV((x) => ({ ...x, [k]: value }));

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        const offers = rows.map((r) => ({ months: r.months, priceDh: Number(r.priceDh || 0), isActive: r.isActive && Number(r.priceDh) >= 1 }));
        const yearly = offers.find((o) => o.months === 12 && o.isActive) ?? offers.find((o) => o.isActive);
        const parsed = membershipPlanInputSchema.safeParse({ ...v, priceDh: yearly?.priceDh ?? Number(v.priceDh), offers, highlightMonths: highlight });
        if (!parsed.success) return setMsg({ ok: false, text: "Vérifiez les champs : au moins une durée proposée avec un prix ≥ 1 DH, réduction entre 0 et 90 %, accès anticipé entre 0 et 720 h." });
        if (!live) return setMsg({ ok: true, text: "Démonstration : réglages valides (rien n'est enregistré)." });
        setBusy(true);
        try {
          await call("adminSaveMembershipPlan", parsed.data as unknown as Record<string, unknown>);
          setMsg({ ok: true, text: "Formule enregistrée." });
          router.refresh();
        } catch {
          setMsg({ ok: false, text: "Enregistrement impossible. Réessayez." });
        }
        setBusy(false);
      }}
    >
      <label className="text-sm font-medium">Nom (FR)<input className={input} value={v.nameFr} onChange={(e) => set("nameFr", e.target.value)} /></label>
      <label className="text-sm font-medium">Nom (AR, facultatif)<input className={input} dir="rtl" value={v.nameAr} onChange={(e) => set("nameAr", e.target.value)} /></label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Durées et prix</legend>
        <p className="text-xs text-muted">Chaque durée se paie en une fois, sans renouvellement automatique. Laissez une durée décochée pour ne pas la proposer. L&apos;économie affichée est calculée par rapport au prix mensuel.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-start text-xs text-muted">
              <tr><th className="py-1 text-start font-medium">Durée</th><th className="text-start font-medium">Prix (DH)</th><th className="text-start font-medium">Proposée</th><th className="text-start font-medium">Mise en avant</th><th className="text-start font-medium">Par mois · économie</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const priced = rows.filter((x) => x.isActive && Number(x.priceDh) >= 1).map((x): MembershipOffer => ({ id: `${x.months}m`, months: x.months, price: { amount: Math.round(Number(x.priceDh) * 100), currency: "MAD" }, isActive: true }));
                const me = priced.find((x) => x.months === r.months);
                const eco = me ? offerEconomics(me, planOffers({ price: me.price, offers: priced })) : null;
                return (
                  <tr key={r.months} className="border-t border-line">
                    <td className="py-2 font-medium">{r.months === 1 ? "1 mois" : `${r.months} mois`}</td>
                    <td><input aria-label={`Prix ${r.months} mois (DH)`} className={`${input} max-w-28`} inputMode="decimal" value={r.priceDh} onChange={(e) => setRows((xs) => xs.map((x, j) => (j === i ? { ...x, priceDh: e.target.value } : x)))} /></td>
                    <td><input aria-label={`Proposer ${r.months} mois`} type="checkbox" className="size-4 accent-plum-900" checked={r.isActive} onChange={(e) => setRows((xs) => xs.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))} /></td>
                    <td><input aria-label={`Mettre en avant ${r.months} mois`} type="radio" name="highlight" className="size-4 accent-plum-900" checked={highlight === r.months} onChange={() => setHighlight(r.months)} /></td>
                    <td className="text-muted">{eco ? `${(eco.perMonth / 100).toFixed(0)} DH/mois${eco.savingPercent > 0 ? ` · −${eco.savingPercent} %` : ""}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </fieldset>
      <label className="text-sm font-medium">Réduction sur les expériences (%)<span className="block text-xs font-normal text-muted">Un prix membre précis peut aussi être réglé sur chaque expérience.</span><input className={input} inputMode="numeric" value={v.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} /></label>
      <label className="text-sm font-medium">Accès anticipé aux nouvelles dates (heures)<span className="block text-xs font-normal text-muted">0 = pas d&apos;accès anticipé.</span><input className={input} inputMode="numeric" value={v.earlyAccessHours} onChange={(e) => set("earlyAccessHours", e.target.value)} /></label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
        <input type="checkbox" checked={v.waiveServiceFee} onChange={(e) => set("waiveServiceFee", e.target.checked)} className="size-4 accent-plum-900" />
        Frais de service offerts aux membres
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium sm:col-span-2">
        <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-4 accent-plum-900" />
        Proposer l&apos;abonnement (prix barrés visibles sur le site)
      </label>
      <label className="text-sm font-medium sm:col-span-2">Avantages affichés (FR, un par ligne)<textarea className={input} rows={4} value={v.benefitsFr} onChange={(e) => set("benefitsFr", e.target.value)} /></label>
      <label className="text-sm font-medium sm:col-span-2">Avantages (AR, même ordre, facultatif)<textarea className={input} dir="rtl" rows={3} value={v.benefitsAr} onChange={(e) => set("benefitsAr", e.target.value)} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "…" : "Enregistrer la formule"}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

/** Offrir un abonnement à un compte existant (recherche par e-mail). */
export function GrantMembershipForm({ users }: { users: { uid: string; email: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [months, setMonths] = useState("12");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) return setMsg({ ok: false, text: "Aucun compte avec cette adresse." });
        if (reason.trim().length < 2) return setMsg({ ok: false, text: "Indiquez un motif." });
        setBusy(true);
        try {
          await call("adminGrantMembership", { uid: user.uid, months: Number(months), reason: reason.trim() });
          setMsg({ ok: true, text: `Abonnement offert à ${user.name || user.email}.` });
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
      <label className="text-sm font-medium">Durée (mois)<input className={input} inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} /></label>
      <label className="text-sm font-medium">Motif (journalisé)<input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. partenaire, geste commercial" /></label>
      <button type="submit" disabled={busy} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "…" : "Offrir"}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm sm:col-span-4 ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
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
