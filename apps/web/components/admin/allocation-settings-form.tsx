"use client";

import { allocationSettingsSchema, type AllocationSettings } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-24 rounded-xl border border-line bg-white px-3 py-2 text-[15px] disabled:bg-cream";
const small = "rounded-xl border border-line bg-white px-3 py-2 text-[15px] disabled:bg-cream";

async function save(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  await httpsCallable(firebase().functions, name)(data);
  await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
}

/** Délais de réponse des lieux (décision 45) : relance, puis autre lieu proposé. */
export function AllocationSettingsForm({ initial, live }: { initial: AllocationSettings; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ remindAfterMinutes: String(initial.remindAfterMinutes), expireAfterMinutes: String(initial.expireAfterMinutes) });
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  return (
    <form
      noValidate
      className="space-y-3 text-sm"
      data-testid="allocation-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = allocationSettingsSchema.safeParse(v);
        if (!parsed.success) return setState("error");
        setState("busy");
        try {
          await save("adminSaveAllocationSettings", parsed.data);
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <label className="flex flex-wrap items-center gap-2 font-medium">Relancer un lieu sans réponse après<input className={input} inputMode="numeric" disabled={!live} value={v.remindAfterMinutes} onChange={(e) => setV({ ...v, remindAfterMinutes: e.target.value })} />minutes</label>
      <label className="flex flex-wrap items-center gap-2 font-medium">Proposer un autre lieu après<input className={input} inputMode="numeric" disabled={!live} value={v.expireAfterMinutes} onChange={(e) => setV({ ...v, expireAfterMinutes: e.target.value })} />minutes</label>
      {live ? <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-60">Enregistrer</button> : <p className="text-xs text-muted">Démonstration : relance après 60 min, autre lieu après 120 min.</p>}
      {state === "saved" && <p role="status" className="text-emerald-800">Enregistré.</p>}
      {state === "error" && <p role="alert" className="text-red-800">Délais entre 10 min et 48 h ; la relance doit venir avant le changement de lieu.</p>}
    </form>
  );
}

export type WhatsAppSettings = { provider: "outbox" | "meta"; phoneNumberId: string; language: string; templates: { request: string; reminder: string; recap: string } };

/** Envoi WhatsApp automatique (super-admin, décision 44) : désactivé tant que le compte WhatsApp Business API n'existe pas. */
export function WhatsAppSettingsForm({ initial, canEdit }: { initial: WhatsAppSettings; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  return (
    <form
      noValidate
      className="space-y-3 text-sm"
      data-testid="whatsapp-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await save("adminSaveWhatsAppSettings", v);
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <label className="flex flex-wrap items-center gap-2 font-medium">Envoi
        <select className={small} disabled={!canEdit} value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value as WhatsAppSettings["provider"] })}>
          <option value="outbox">À la main (WhatsApp Web), rien n&apos;est envoyé automatiquement</option>
          <option value="meta">Automatique (WhatsApp Business API)</option>
        </select>
      </label>
      {v.provider === "meta" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 font-medium">Identifiant du numéro (Phone number ID)<input className={small} disabled={!canEdit} value={v.phoneNumberId} onChange={(e) => setV({ ...v, phoneNumberId: e.target.value.trim() })} /></label>
          <label className="flex flex-col gap-1 font-medium">Langue des modèles<input className={small} disabled={!canEdit} value={v.language} onChange={(e) => setV({ ...v, language: e.target.value })} /></label>
          {(["request", "reminder", "recap"] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1 font-medium">Modèle « {k === "request" ? "demande" : k === "reminder" ? "relance" : "récapitulatif"} »<input className={small} disabled={!canEdit} value={v.templates[k]} onChange={(e) => setV({ ...v, templates: { ...v.templates, [k]: e.target.value } })} /></label>
          ))}
        </div>
      )}
      <p className="text-xs text-muted">Le jeton d&apos;accès Meta se règle comme secret Cloud (WHATSAPP_TOKEN), jamais ici. Les textes des modèles à faire valider par Meta sont dans docs/22 § 17.H.</p>
      {canEdit && <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-60">Enregistrer</button>}
      {state === "saved" && <p role="status" className="text-emerald-800">Enregistré.</p>}
      {state === "error" && <p role="alert" className="text-red-800">Enregistrement impossible : l&apos;identifiant du numéro est obligatoire en envoi automatique.</p>}
    </form>
  );
}
