"use client";

import { cancellationPolicyInputSchema, describePolicy, PAYMENT_MODEL_LABELS, PAYMENT_MODELS, type PaymentModel } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "rounded-lg border border-line bg-white px-3 py-2 text-sm";
async function call(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  return httpsCallable(firebase().functions, name)(data);
}

/** Étape 22 — nouvelle politique d'annulation à paliers (super-admin). Copiée sur chaque réservation. */
export function PolicyForm({ live, canEdit }: { live: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ id: "", labelFr: "", labelEn: "", labelAr: "" });
  const [rules, setRules] = useState([{ hoursBefore: "168", refundPercent: "100" }, { hoursBefore: "48", refundPercent: "50" }, { hoursBefore: "0", refundPercent: "0" }]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const parsedRules = rules.map((r) => ({ hoursBefore: Number(r.hoursBefore), refundPercent: Number(r.refundPercent) }));
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = cancellationPolicyInputSchema.safeParse({ ...v, rules: parsedRules });
        if (!r.success) return setMsg({ ok: false, text: "Vérifiez : identifiant en minuscules (ex. souple-24h), nom, paliers différents et remboursement qui diminue quand on annule plus tard." });
        if (!live) return setMsg({ ok: true, text: "Démonstration : rien n'est enregistré." });
        try {
          await call("adminSaveCancellationPolicy", r.data);
          setMsg({ ok: true, text: "Politique enregistrée." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as { message?: string }).message ?? "Enregistrement impossible." });
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block font-medium">Identifiant</span><input id="policy-id" className={`${input} w-full`} value={v.id} disabled={!canEdit} onChange={(e) => setV({ ...v, id: e.target.value.toLowerCase() })} placeholder="souple-24h" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Nom (français)</span><input id="policy-fr" className={`${input} w-full`} value={v.labelFr} disabled={!canEdit} onChange={(e) => setV({ ...v, labelFr: e.target.value })} placeholder="Annulation gratuite jusqu'à 24 h avant" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Nom (anglais, facultatif)</span><input id="policy-en" className={`${input} w-full`} value={v.labelEn} disabled={!canEdit} onChange={(e) => setV({ ...v, labelEn: e.target.value })} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Nom (arabe, facultatif)</span><input id="policy-ar" dir="rtl" className={`${input} w-full`} value={v.labelAr} disabled={!canEdit} onChange={(e) => setV({ ...v, labelAr: e.target.value })} /></label>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Paliers (annulation au moins X heures avant → remboursement)</legend>
        <ul className="space-y-2">
          {rules.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <input aria-label={`Palier ${i + 1} : heures avant`} className={`${input} w-24`} inputMode="numeric" value={r.hoursBefore} disabled={!canEdit} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, hoursBefore: e.target.value } : x)))} /> h avant →
              <input aria-label={`Palier ${i + 1} : remboursement %`} className={`${input} w-20`} inputMode="numeric" value={r.refundPercent} disabled={!canEdit} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, refundPercent: e.target.value } : x)))} /> %
              {rules.length > 1 && canEdit && <button type="button" onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-xs text-red-800 underline">Retirer</button>}
            </li>
          ))}
        </ul>
        {rules.length < 6 && canEdit && <button type="button" onClick={() => setRules([...rules, { hoursBefore: "24", refundPercent: "0" }])} className="mt-2 text-sm font-semibold text-plum-900 underline">+ Ajouter un palier</button>}
        {parsedRules.every((r) => Number.isFinite(r.hoursBefore) && Number.isFinite(r.refundPercent)) && <p className="mt-2 text-xs text-muted">Aperçu : {describePolicy(parsedRules)}</p>}
      </fieldset>
      {canEdit && <button type="submit" className="rounded-full bg-plum-900 px-5 py-2 text-sm font-semibold text-white">Enregistrer la politique</button>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </form>
  );
}

/** Étape 22 — modes de paiement proposés aux organisateurs (super-admin). */
export function PaymentModelsForm({ initial, live, canEdit }: { initial: PaymentModel[]; live: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [models, setModels] = useState<PaymentModel[]>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {PAYMENT_MODELS.map((m) => (
          <li key={m}>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-plum-900" checked={models.includes(m)} disabled={!canEdit} onChange={(e) => setModels(e.target.checked ? [...models, m] : models.filter((x) => x !== m))} />
              <span><strong>{PAYMENT_MODEL_LABELS[m].title}</strong> — {PAYMENT_MODEL_LABELS[m].text}</span>
            </label>
          </li>
        ))}
      </ul>
      {canEdit && (
        <button
          type="button"
          onClick={async () => {
            if (!models.length) return setMsg({ ok: false, text: "Gardez au moins un mode." });
            if (!live) return setMsg({ ok: true, text: "Démonstration : rien n'est enregistré." });
            try {
              await call("adminSaveOrganizerPaymentModels", { models });
              setMsg({ ok: true, text: "Enregistré." });
              router.refresh();
            } catch {
              setMsg({ ok: false, text: "Enregistrement impossible." });
            }
          }}
          className="rounded-full bg-plum-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Enregistrer les modes
        </button>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </div>
  );
}
