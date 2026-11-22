"use client";

import { DEFAULT_EVENT_TEMPLATES, PARTNER_STATUSES, PARTNER_TYPES, partnerInputSchema, VENUE_TIERS, VENUE_UNITS, type PartnerInput, type PartnerSlot } from "@thecommunity/shared";
import type { ReactNode } from "react";
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
  invalidDate: "Date invalide.",
  min1: "Au moins 1.",
  order: "Le minimum doit être inférieur ou égal au maximum.",
  timeOrder: "L'heure de fin doit suivre l'heure de début.",
  time: "Heure invalide.",
  date: "Date invalide.",
};
const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 disabled:bg-cream";

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
      <fieldset className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2" data-testid="partner-insurance">
        <legend className="px-1 text-base font-semibold text-ink">Assurance du lieu (activités physiques)</legend>
        <p className="text-xs text-muted sm:col-span-2">
          Pour le sport, le paintball ou toute activité physique, demandez l&apos;attestation d&apos;assurance responsabilité civile du lieu.
          Une alerte apparaît sur le tableau de bord quand elle manque, a expiré ou expire dans moins de 30 jours.
        </p>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" disabled={!live} checked={v.insurance?.verified === true} onChange={(e) => set("insurance", { ...(v.insurance ?? { verified: false }), verified: e.target.checked })} className="size-4 accent-brand-900" />
          Attestation d&apos;assurance vue par l&apos;équipe
        </label>
        <div>
          <label htmlFor="pf-insurer" className="mb-1 block text-sm font-medium">Assureur</label>
          <input id="pf-insurer" className={input} disabled={!live} value={v.insurance?.insurer ?? ""} onChange={(e) => set("insurance", { ...(v.insurance ?? { verified: false }), insurer: e.target.value })} />
        </div>
        <div>
          <label htmlFor="pf-policy" className="mb-1 block text-sm font-medium">N° de contrat</label>
          <input id="pf-policy" className={input} disabled={!live} value={v.insurance?.policyNumber ?? ""} onChange={(e) => set("insurance", { ...(v.insurance ?? { verified: false }), policyNumber: e.target.value })} />
        </div>
        <div>
          <label htmlFor="pf-expires" className="mb-1 block text-sm font-medium">Valable jusqu&apos;au</label>
          <input id="pf-expires" type="date" className={input} disabled={!live} value={v.insurance?.expiresOn ?? ""} onChange={(e) => set("insurance", { ...(v.insurance ?? { verified: false }), expiresOn: e.target.value })} />
          {err("insurance")}
        </div>
      </fieldset>
      <HostingFields v={v} set={set} field={field} err={err} live={live} />
      <div>
        <label htmlFor="pf-notes" className="mb-1 block text-sm font-medium">Notes internes</label>
        <textarea id="pf-notes" rows={4} className={input} value={v.notes} disabled={!live} onChange={(e) => set("notes", e.target.value)} />
        <span className="mt-1 block text-xs text-muted">Visibles par l&apos;équipe uniquement.</span>
        {err("notes")}
      </div>
      {live ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
            {state === "busy" ? "Enregistrement…" : id ? "Enregistrer les modifications" : "Ajouter le partenaire"}
          </button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">Enregistrement impossible : vérifiez les champs signalés.</p>}
        </div>
      ) : (
        <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900">Démonstration : l&apos;ajout et la modification des partenaires fonctionnent sur le site en ligne.</p>
      )}
    </form>
  );
}

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const UNIT_LABELS: Record<(typeof VENUE_UNITS)[number], string> = { table: "Table", court: "Terrain", session: "Session", spot: "Places (cours, atelier)" };
const TIER_LABELS: Record<(typeof VENUE_TIERS)[number], string> = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" };
const small = "rounded-xl border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-700 disabled:bg-cream";

/**
 * Fiche du lieu pour l'attribution automatique (docs/22, décision 41) : gammes, formats acceptés, ressource réservée,
 * créneaux habituels avec leur capacité, ouvertures et fermetures exceptionnelles, cuisine, budget, niveau.
 */
function HostingFields({ v, set, field, err, live }: {
  v: PartnerFormValues;
  set: <K extends keyof PartnerFormValues>(k: K, value: PartnerFormValues[K]) => void;
  field: (k: keyof PartnerFormValues, label: string, extra?: Record<string, string>) => ReactNode;
  err: (k: string) => ReactNode;
  live: boolean;
}) {
  const toggle = <T extends string>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const slots = v.slots ?? [];
  const exceptions = v.exceptions ?? [];
  const setSlot = (i: number, patch: Partial<PartnerSlot>) => set("slots", slots.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  return (
    <fieldset className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2" data-testid="partner-hosting">
      <legend className="px-1 text-sm font-semibold">Accueil des rendez-vous Wenzy</legend>
      <p className="text-xs text-muted sm:col-span-2">Le logiciel choisit les lieux d&apos;une date d&apos;après ces informations (format, gamme, jour, heure, capacité), puis leur envoie la demande.</p>
      <div className="sm:col-span-2">
        <span className="mb-1 block text-sm font-medium">Gammes</span>
        <div className="flex flex-wrap gap-3" data-testid="partner-tiers">
          {VENUE_TIERS.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!live} checked={(v.tiers ?? []).includes(t)} onChange={() => set("tiers", toggle(v.tiers ?? [], t))} />{TIER_LABELS[t]}</label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <span className="mb-1 block text-sm font-medium">Formats et activités acceptés</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="partner-formats">
          {DEFAULT_EVENT_TEMPLATES.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!live} checked={(v.formats ?? []).includes(t.id)} onChange={() => set("formats", toggle(v.formats ?? [], t.id))} />{t.name}</label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="pf-unit" className="mb-1 block text-sm font-medium">Ce qu&apos;on réserve</label>
        <select id="pf-unit" className={input} disabled={!live} value={v.unit ?? "table"} onChange={(e) => set("unit", e.target.value as PartnerFormValues["unit"])}>
          {VENUE_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("unitMin", "Personnes min.", { inputMode: "numeric" })}
        {field("unitMax", "Personnes max.", { inputMode: "numeric" })}
      </div>
      <div className="sm:col-span-2" data-testid="partner-slots">
        <span className="mb-1 block text-sm font-medium">Créneaux habituels</span>
        <p className="mb-2 text-xs text-muted">Jour, heures de début acceptées et nombre de {(v.unit ?? "table") === "table" ? "tables" : "ressources"} disponibles. Ex. lundi, de 19:30 à 20:30, 4 tables.</p>
        <ul className="space-y-2">
          {slots.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <select aria-label="Jour" className={small} disabled={!live} value={s.weekday} onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })}>
                {DAYS.map((d, k) => <option key={d} value={k}>{d}</option>)}
              </select>
              <input aria-label="De" type="time" className={small} disabled={!live} value={s.from} onChange={(e) => setSlot(i, { from: e.target.value })} />
              <span className="text-sm text-muted">à</span>
              <input aria-label="À" type="time" className={small} disabled={!live} value={s.to} onChange={(e) => setSlot(i, { to: e.target.value })} />
              <input aria-label="Nombre" inputMode="numeric" className={`${small} w-20`} disabled={!live} value={String(s.units)} onChange={(e) => setSlot(i, { units: e.target.value as unknown as number })} />
              {live && <button type="button" className="text-sm font-semibold text-red-800" onClick={() => set("slots", slots.filter((_, k) => k !== i))}>Retirer</button>}
            </li>
          ))}
        </ul>
        {live && <button type="button" className="mt-2 text-sm font-semibold text-brand-900" onClick={() => set("slots", [...slots, { weekday: 1, from: "19:30", to: "20:30", units: 2 }])}>+ Ajouter un créneau</button>}
        {err("slots")}
      </div>
      <div className="sm:col-span-2" data-testid="partner-exceptions">
        <span className="mb-1 block text-sm font-medium">Fermetures et ouvertures exceptionnelles</span>
        <p className="mb-2 text-xs text-muted">Une date précise remplace le créneau habituel (0 = fermé ce jour-là).</p>
        <ul className="space-y-2">
          {exceptions.map((x, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <input aria-label="Date" type="date" className={small} disabled={!live} value={x.date} onChange={(e) => set("exceptions", exceptions.map((y, k) => (k === i ? { ...y, date: e.target.value } : y)))} />
              <input aria-label="Nombre" inputMode="numeric" className={`${small} w-20`} disabled={!live} value={String(x.units)} onChange={(e) => set("exceptions", exceptions.map((y, k) => (k === i ? { ...y, units: e.target.value as unknown as number } : y)))} />
              {live && <button type="button" className="text-sm font-semibold text-red-800" onClick={() => set("exceptions", exceptions.filter((_, k) => k !== i))}>Retirer</button>}
            </li>
          ))}
        </ul>
        {live && <button type="button" className="mt-2 text-sm font-semibold text-brand-900" onClick={() => set("exceptions", [...exceptions, { date: "", units: 0 }])}>+ Ajouter une date</button>}
        {err("exceptions")}
      </div>
      {field("cuisine", "Cuisine (révélée avec le lieu)", { placeholder: "Ex. méditerranéenne" })}
      {field("avgBudget", "Budget moyen par personne (DH)", { inputMode: "numeric" })}
      <div>
        <label htmlFor="pf-level" className="mb-1 block text-sm font-medium">Niveau</label>
        <select id="pf-level" className={input} disabled={!live} value={v.level ?? "occasional"} onChange={(e) => set("level", e.target.value as PartnerFormValues["level"])}>
          <option value="regular">Régulier (capacité négociée)</option>
          <option value="occasional">Occasionnel (à confirmer à chaque fois)</option>
        </select>
      </div>
      {field("whatsapp", "WhatsApp du responsable", { inputMode: "tel" })}
      <div className="sm:col-span-2">{field("memberPerk", "Avantage pour les abonnés (facultatif)", { placeholder: "Ex. –10 % sur l'addition" })}</div>
    </fieldset>
  );
}
