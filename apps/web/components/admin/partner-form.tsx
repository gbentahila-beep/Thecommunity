"use client";

import { PARTNER_STATUSES, PARTNER_TYPES, partnerInputSchema, type PartnerInput } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";
import { PARTNER_STATUS_LABELS, PARTNER_TYPE_LABELS } from "./partner-labels";

export type PartnerFormValues = Omit<PartnerInput, "defaultCommissionPercent"> & { defaultCommissionPercent: string };

const MESSAGES: Record<string, string> = {
  required: "Champ obligatoire.",
  tooLong: "Trop long.",
  email: "Adresse e-mail invalide.",
  phone: "Numéro invalide (chiffres, espaces, +).",
  slug: "Ville inconnue.",
  min0: "Doit être positif.",
  tooMany: "Valeur trop élevée.",
};
const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100 disabled:bg-cream";

/** Fiche partenaire (ajout ou modification). Validée dans le navigateur puis par le serveur (qui fait foi). */
export function PartnerForm({ id, initial, cities, live }: { id?: string; initial: PartnerFormValues; cities: { id: string; label: string }[]; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const set = <K extends keyof PartnerFormValues>(k: K, value: PartnerFormValues[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setState("idle");
  };
  const err = (k: string) =>
    errors[k] ? <span id={`pf-${k}-err`} role="alert" className="mt-1 block text-xs text-red-800">{MESSAGES[errors[k]!] ?? "Valeur invalide."}</span> : null;
  const field = (k: keyof PartnerFormValues, label: string, extra: Record<string, string> = {}) => (
    <div>
      <label htmlFor={`pf-${k}`} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={`pf-${k}`} className={input} value={String(v[k] ?? "")} disabled={!live} onChange={(e) => set(k, e.target.value as never)} aria-invalid={Boolean(errors[k]) || undefined} aria-describedby={errors[k] ? `pf-${k}-err` : undefined} {...extra} />
      {err(k)}
    </div>
  );
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = partnerInputSchema.safeParse(v);
        if (!parsed.success) {
          setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
          setState("error");
          return;
        }
        setErrors({});
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          const r = (await httpsCallable(firebase().functions, "adminSavePartner")({ ...(id ? { id } : {}), data: parsed.data })).data as { id: string };
          await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
          setState("saved");
          if (!id) router.push(`/admin/partenaires/${r.id}?cree=1`);
          else router.refresh();
        } catch (e2) {
          const issues = (e2 as { details?: { issues?: { path: string; message: string }[] } }).details?.issues ?? [];
          setErrors(Object.fromEntries(issues.map((i) => [i.path.split(".").pop() ?? i.path, i.message])));
          setState("error");
        }
      }}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold text-ink">Établissement</legend>
        <div className="sm:col-span-2">{field("name", "Nom")}</div>
        <div>
          <label htmlFor="pf-type" className="mb-1 block text-sm font-medium">Type</label>
          <select id="pf-type" className={input} value={v.type} disabled={!live} onChange={(e) => set("type", e.target.value as PartnerFormValues["type"])}>
            {PARTNER_TYPES.map((t) => <option key={t} value={t}>{PARTNER_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pf-status" className="mb-1 block text-sm font-medium">Statut</label>
          <select id="pf-status" className={input} value={v.status} disabled={!live} onChange={(e) => set("status", e.target.value as PartnerFormValues["status"])}>
            {PARTNER_STATUSES.map((s) => <option key={s} value={s}>{PARTNER_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pf-cityId" className="mb-1 block text-sm font-medium">Ville</label>
          <select id="pf-cityId" className={input} value={v.cityId} disabled={!live} onChange={(e) => set("cityId", e.target.value)}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {err("cityId")}
        </div>
        {field("district", "Quartier")}
        <div className="sm:col-span-2">{field("address", "Adresse")}</div>
        <div className="sm:col-span-2">{field("link", "Site web ou Instagram")}</div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold text-ink">Contact</legend>
        {field("contactName", "Nom du contact", { autoComplete: "off" })}
        {field("contactEmail", "E-mail", { type: "email", autoComplete: "off" })}
        {field("contactPhone", "Téléphone", { type: "tel", autoComplete: "off" })}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold text-ink">Modèle économique par défaut</legend>
        <div className="space-y-2 sm:col-span-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="pf-model" disabled={!live} checked={v.model === "purchase"} onChange={() => set("model", "purchase")} className="mt-1" />
            <span><strong>Achat de prestation</strong> — nous payons un prix fixe par participant (le coût se saisit sur chaque expérience).</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="pf-model" disabled={!live} checked={v.model === "commission"} onChange={() => set("model", "commission")} className="mt-1" />
            <span><strong>Commission</strong> — le partenaire fixe son tarif, nous gardons un pourcentage de chaque place vendue.</span>
          </label>
        </div>
        {v.model === "commission" && field("defaultCommissionPercent", "Commission (%)", { type: "number", min: "0", max: "80", inputMode: "decimal" })}
      </fieldset>
      <div>
        <label htmlFor="pf-notes" className="mb-1 block text-sm font-medium">Notes internes</label>
        <textarea id="pf-notes" rows={4} className={input} value={v.notes} disabled={!live} onChange={(e) => set("notes", e.target.value)} />
        <span className="mt-1 block text-xs text-muted">Visibles par l&apos;équipe uniquement.</span>
        {err("notes")}
      </div>
      {live ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
            {state === "busy" ? "Enregistrement…" : id ? "Enregistrer les modifications" : "Ajouter le partenaire"}
          </button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">Enregistrement impossible : vérifiez les champs signalés.</p>}
        </div>
      ) : (
        <p className="rounded-xl bg-plum-50 px-3 py-2 text-xs text-plum-900">Démonstration : l&apos;ajout et la modification des partenaires fonctionnent sur le site en ligne.</p>
      )}
    </form>
  );
}
