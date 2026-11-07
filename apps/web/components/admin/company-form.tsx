"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanySettings } from "@/lib/data/admin-mail";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100 disabled:bg-cream";

/**
 * Paramètres → Société et e-mails (super-admin). Les informations sont figées sur chaque NOUVEAU document ;
 * les factures déjà émises ne changent jamais.
 */
export function CompanyForm({ initial, canEdit }: { initial: CompanySettings; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof CompanySettings>(k: K, value: CompanySettings[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setState("idle");
  };
  // Libellé = nom du champ seul ; l'aide et l'erreur sont reliées par aria-describedby.
  const field = (k: "legalName" | "address" | "ice" | "if" | "rc" | "email" | "fromName" | "fromEmail", label: string, hint?: string, extra: Record<string, string> = {}) => (
    <div>
      <label htmlFor={`co-${k}`} className="mb-1 block text-sm font-medium">{label}</label>
      <input
        id={`co-${k}`}
        className={input}
        value={v[k]}
        disabled={!canEdit}
        onChange={(e) => set(k, e.target.value)}
        aria-invalid={errors.includes(k) || undefined}
        aria-describedby={[hint ? `co-${k}-hint` : "", errors.includes(k) ? `co-${k}-err` : ""].filter(Boolean).join(" ") || undefined}
        {...extra}
      />
      {hint && <span id={`co-${k}-hint`} className="mt-1 block text-xs text-muted">{hint}</span>}
      {errors.includes(k) && <span id={`co-${k}-err`} role="alert" className="mt-1 block text-xs text-red-800">Valeur invalide.</span>}
    </div>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setErrors([]);
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "adminSaveCompanySettings")(v);
          setState("saved");
          router.refresh();
        } catch (err) {
          const issues = (err as { details?: { issues?: { path: string }[] } }).details?.issues ?? [];
          setErrors(issues.map((i) => i.path));
          setState("error");
        }
      }}
    >
      {!canEdit && <p className="rounded-xl bg-plum-50 px-3 py-2 text-xs text-plum-900">Lecture seule : modification réservée aux super-admins.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("legalName", "Raison sociale", "Ex. « The Host Club SARL »")}
        {field("ice", "ICE", "15 chiffres", { inputMode: "numeric", maxLength: "15" })}
        <div className="sm:col-span-2">{field("address", "Adresse du siège")}</div>
        {field("if", "Identifiant fiscal (IF)")}
        {field("rc", "Registre du commerce (RC)", "Ville et numéro")}
        {field("email", "E-mail affiché sur les factures", undefined, { type: "email" })}
        <div>
          <label htmlFor="co-vat" className="mb-1 block text-sm font-medium">Taux de TVA (%)</label>
          <input
            id="co-vat"
            aria-describedby="co-vat-hint"
            className={input}
            type="number"
            min={0}
            max={30}
            step="0.5"
            disabled={!canEdit}
            value={v.vatRate ?? ""}
            onChange={(e) => set("vatRate", e.target.value === "" ? null : Number(e.target.value))}
          />
          <span id="co-vat-hint" className="mt-1 block text-xs text-muted">Vide = « TVA : taux à confirmer » (à valider avec le comptable).</span>
        </div>
      </div>
      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Envoi des e-mails</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="mailProvider" disabled={!canEdit} checked={v.mailProvider === "outbox"} onChange={() => set("mailProvider", "outbox")} className="mt-1" />
          <span><strong>Boîte d&apos;envoi de test</strong> — rien n&apos;est envoyé, les e-mails sont consultables dans le back-office.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="mailProvider" disabled={!canEdit} checked={v.mailProvider === "brevo"} onChange={() => set("mailProvider", "brevo")} className="mt-1" />
          <span><strong>Brevo</strong> — envoi réel. Nécessite la clé Brevo enregistrée comme secret Cloud (jamais ici) ; sinon les envois échouent et restent visibles dans la boîte d&apos;envoi.</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("fromName", "Nom de l'expéditeur", "Ex. The Host Club")}
          {field("fromEmail", "Adresse de l'expéditeur", "Domaine vérifié chez Brevo", { type: "email" })}
        </div>
      </fieldset>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
            {state === "busy" ? "Enregistrement…" : "Enregistrer"}
          </button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré. Les prochains documents utiliseront ces informations.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">Enregistrement impossible : vérifiez les champs.</p>}
        </div>
      )}
    </form>
  );
}
