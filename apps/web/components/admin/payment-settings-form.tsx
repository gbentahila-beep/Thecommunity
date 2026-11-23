"use client";

import { paymentSettingsInputSchema, TRANSFER_CUTOFF_HOURS, TRANSFER_DEADLINE_HOURS } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PaymentSettingsView } from "@/lib/data/admin-mail";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 disabled:bg-cream";
const MESSAGES: Record<string, string> = {
  tooShort: "Trop court.", tooLong: "Trop long.", ribFormat: "Le RIB compte 24 chiffres.", ibanFormat: "IBAN marocain : MA suivi de 26 chiffres.",
  swiftFormat: "Code SWIFT / BIC invalide (8 ou 11 caractères).", min12: "12 h minimum.", max120: "120 h maximum.", max72: "72 h maximum.",
};

/**
 * Mode de paiement (super-admin, étape 5h) : paiement de TEST, ou virement bancaire.
 * Le virement ne s'active qu'avec des coordonnées complètes (le client doit savoir où virer).
 */
export function PaymentSettingsForm({ initial, canEdit }: { initial: PaymentSettingsView; canEdit: boolean }) {
  const router = useRouter();
  const b = initial.bank;
  const [method, setMethod] = useState<"sandbox" | "bank_transfer" | "cmi">(initial.method === "bank_transfer" || initial.method === "cmi" ? initial.method : "sandbox");
  const [cmiMode, setCmiMode] = useState<"test" | "live">(initial.mode === "live" && initial.method === "cmi" ? "live" : "test");
  const [v, setV] = useState({
    holder: b?.holder ?? "", bank: b?.bank ?? "", rib: b?.rib ?? "", iban: b?.iban ?? "", swift: b?.swift ?? "",
    deadlineHours: String(b?.deadlineHours ?? TRANSFER_DEADLINE_HOURS), cutoffHours: String(b?.cutoffHours ?? TRANSFER_CUTOFF_HOURS),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const set = (k: keyof typeof v, x: string) => { setV((o) => ({ ...o, [k]: x })); setState("idle"); };
  const field = (k: keyof typeof v, label: string, hint?: string) => (
    <div>
      <label htmlFor={`pay-${k}`} className="mb-1 block text-sm font-medium text-ink">{label}{hint && <span className="block text-xs font-normal text-muted">{hint}</span>}</label>
      <input id={`pay-${k}`} className={`${input} ${errors[`bank.${k}`] ? "border-red-400" : ""}`} value={v[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={Boolean(errors[`bank.${k}`])} />
      {errors[`bank.${k}`] && <p className="mt-1 text-xs text-red-700">{errors[`bank.${k}`]}</p>}
    </div>
  );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = method === "sandbox" ? { method } : method === "cmi" ? { method, mode: cmiMode } : { method, bank: v };
        const parsed = paymentSettingsInputSchema.safeParse(data);
        if (!parsed.success) {
          const next: Record<string, string> = {};
          for (const i of parsed.error.issues) next[i.path.join(".")] ??= MESSAGES[i.message] ?? "Valeur invalide.";
          setErrors(next);
          return setState("error");
        }
        setErrors({});
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "adminSavePaymentSettings")(parsed.data);
          await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined); // textes de paiement du site (étape 28)
          setState("saved");
          router.refresh();
        } catch (err) {
          if ((err as { details?: { reason?: string } }).details?.reason === "cmi_not_configured") setErrors({ cmi: "Identifiants CMI absents côté serveur : ajoutez les secrets CMI_CLIENT_ID et CMI_STORE_KEY (docs/24), puis réessayez." });
          setState("error");
        }
      }}
    >
      <fieldset className="space-y-2 text-sm" disabled={!canEdit}>
        <legend className="sr-only">Mode de paiement</legend>
        <label className="flex items-start gap-2"><input type="radio" name="pay-method" className="mt-1" checked={method === "sandbox"} onChange={() => { setMethod("sandbox"); setState("idle"); }} /><span><strong>Paiement de test</strong> — aucun argent, documents « TEST » (pour essayer le site).</span></label>
        <label className="flex items-start gap-2"><input type="radio" name="pay-method" className="mt-1" checked={method === "bank_transfer"} onChange={() => { setMethod("bank_transfer"); setState("idle"); }} /><span><strong>Virement bancaire</strong> — référence unique, place bloquée jusqu&apos;à l&apos;échéance, validation dans « Virements ».</span></label>
        <label className="flex items-start gap-2"><input type="radio" name="pay-method" className="mt-1" checked={method === "cmi"} onChange={() => { setMethod("cmi"); setState("idle"); }} /><span><strong>Carte bancaire (CMI)</strong> — paiement 3D Secure sur la page du CMI, place confirmée à la notification du CMI. Remboursements à faire depuis l&apos;espace commerçant CMI, puis à marquer effectués dans « Remboursements ».</span></label>
      </fieldset>
      {method === "cmi" && (
        <fieldset className="space-y-2 rounded-xl border border-line p-4 text-sm" disabled={!canEdit}>
          <legend className="px-1 font-semibold text-ink">Environnement CMI</legend>
          <label className="flex items-start gap-2"><input type="radio" name="cmi-mode" className="mt-1" checked={cmiMode === "test"} onChange={() => setCmiMode("test")} /><span><strong>Test CMI</strong> — cartes de test fournies par le CMI, aucun argent réel.</span></label>
          <label className="flex items-start gap-2"><input type="radio" name="cmi-mode" className="mt-1" checked={cmiMode === "live"} onChange={() => setCmiMode("live")} /><span><strong>Réel</strong> — seulement après la validation des essais par le CMI.</span></label>
          <p className="text-xs text-muted">Les identifiants du magasin (CMI_CLIENT_ID, CMI_STORE_KEY) sont des secrets Cloud, jamais saisis ici. Adresse de retour serveur à donner au CMI : fonction « cmiCallback » (docs/24).</p>
          {errors.cmi && <p role="alert" className="text-xs text-red-700">{errors.cmi}</p>}
        </fieldset>
      )}
      {method === "bank_transfer" && (
        <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2" disabled={!canEdit}>
          <legend className="px-1 text-sm font-semibold text-ink">Coordonnées bancaires de la société</legend>
          {field("holder", "Titulaire du compte", "Raison sociale exacte.")}
          {field("bank", "Banque")}
          <div className="sm:col-span-2">{field("rib", "RIB (24 chiffres)", "Affiché au client avec la référence à indiquer.")}</div>
          {field("iban", "IBAN (facultatif)", "Pour les virements depuis l'étranger.")}
          {field("swift", "SWIFT / BIC (facultatif)")}
          {field("deadlineHours", "Délai pour virer (heures)", "48 h proposé.")}
          {field("cutoffHours", "Au plus tard avant l'expérience (heures)", "24 h proposé.")}
        </fieldset>
      )}
      <p className="text-xs text-muted">Le changement s&apos;applique aux nouveaux paiements. Les virements déjà en attente restent à valider dans « Virements ». Aucune coordonnée bancaire de client n&apos;est jamais demandée ni enregistrée.</p>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{state === "busy" ? "Enregistrement…" : "Enregistrer le mode de paiement"}</button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">{Object.keys(errors).length ? "Vérifiez les champs signalés." : "Enregistrement impossible."}</p>}
        </div>
      )}
    </form>
  );
}
