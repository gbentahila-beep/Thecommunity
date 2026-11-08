"use client";

import { promoInputSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

export type PromoFormValues = {
  code: string; type: "percent" | "fixed"; value: string; validFrom: string; validTo: string; maxRedemptions: string;
  firstBookingOnly: boolean; isActive: boolean; description: string;
};
const MESSAGES: Record<string, string> = {
  promoFormat: "Lettres, chiffres et tirets (3 à 20).", required: "Champ obligatoire.", min1: "Doit être supérieur à 0.", percent: "Entre 1 et 100 %.",
  dateOrder: "La fin doit suivre le début.", tooMany: "Valeur trop élevée.", tooLong: "Trop long.", date: "Date invalide.",
};
const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100 disabled:bg-cream";

/** Créer ou modifier un code promo. Le compteur d'utilisations est tenu par le serveur. */
export function PromoForm({ initial, create, live }: { initial: PromoFormValues; create: boolean; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const p = create ? "promo-new" : `promo-${initial.code}`;
  const set = <K extends keyof PromoFormValues>(k: K, value: PromoFormValues[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setState("idle");
  };
  const field = (k: "code" | "value" | "validFrom" | "validTo" | "maxRedemptions" | "description", label: string, extra: Record<string, string> = {}) => (
    <div>
      <label htmlFor={`${p}-${k}`} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={`${p}-${k}`} className={input} value={v[k]} disabled={!live || (k === "code" && !create)} onChange={(e) => set(k, e.target.value)} aria-invalid={Boolean(errors[k]) || undefined} {...extra} />
      {errors[k] && <span role="alert" className="mt-1 block text-xs text-red-800">{MESSAGES[errors[k]!] ?? "Valeur invalide."}</span>}
    </div>
  );
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = promoInputSchema.safeParse(v);
        if (!r.success) {
          setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
          setState("error");
          return;
        }
        setErrors({});
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "adminSavePromo")({ create, data: v });
          setState("saved");
          if (create) setV(initial);
          router.refresh();
        } catch (err) {
          const reason = (err as { details?: { reason?: string } }).details?.reason;
          setErrors(reason === "promo_exists" ? { code: "exists" } : {});
          setState("error");
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {field("code", "Code", { autoCapitalize: "characters", maxLength: "20" })}
        <div>
          <label htmlFor={`${p}-type`} className="mb-1 block text-sm font-medium">Remise</label>
          <select id={`${p}-type`} className={input} value={v.type} disabled={!live} onChange={(e) => set("type", e.target.value as "percent" | "fixed")}>
            <option value="percent">Pourcentage</option>
            <option value="fixed">Montant fixe (DH)</option>
          </select>
        </div>
        {field("value", v.type === "percent" ? "Valeur (%)" : "Montant (DH)", { type: "number", min: "1", inputMode: "decimal" })}
        {field("validFrom", "Valable à partir du (facultatif)", { type: "date" })}
        {field("validTo", "Valable jusqu'au", { type: "date" })}
        {field("maxRedemptions", "Utilisations au total", { type: "number", min: "1" })}
      </div>
      {field("description", "Note interne (facultatif)")}
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.firstBookingOnly} disabled={!live} onChange={(e) => set("firstBookingOnly", e.target.checked)} /> Première réservation uniquement</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.isActive} disabled={!live} onChange={(e) => set("isActive", e.target.checked)} /> Actif</label>
      </div>
      <p className="text-xs text-muted">Chaque personne peut utiliser un code une seule fois. Il s&apos;applique après le prix membre, sur les réservations directes.</p>
      {live ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
            {state === "busy" ? "Enregistrement…" : create ? "Créer le code" : "Enregistrer le code"}
          </button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">{create ? "Code créé." : "Enregistré."}</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">{errors.code === "exists" ? "Ce code existe déjà." : "Enregistrement impossible : vérifiez les champs."}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted">Démonstration : la création de codes fonctionne sur le site en ligne.</p>
      )}
    </form>
  );
}
