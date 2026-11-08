"use client";

import { serviceFeeInputSchema, type ServiceFee } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-32 rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-plum-700 disabled:bg-cream";

/** Frais de service (super-admin) : aucun, montant par place ou pourcentage. S'appliquent aux nouvelles réservations payantes. */
export function ServiceFeeForm({ initial, canEdit }: { initial: ServiceFee; canEdit: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState(initial.mode);
  const [amountDh, setAmountDh] = useState(initial.mode === "per_seat" ? String(initial.amount / 100) : "");
  const [percent, setPercent] = useState(initial.mode === "percent" ? String(initial.percent) : "");
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = { mode, amountDh: amountDh || "0", percent: percent || "0" };
        if (!serviceFeeInputSchema.safeParse(data).success) return setState("error");
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "adminSaveBookingSettings")({ mode, amountDh: Number(amountDh || 0), percent: Number(percent || 0) });
          await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <fieldset className="space-y-2 text-sm" disabled={!canEdit}>
        <legend className="sr-only">Frais de service</legend>
        <label className="flex items-center gap-2"><input type="radio" name="fee-mode" checked={mode === "none"} onChange={() => { setMode("none"); setState("idle"); }} /> Aucun frais</label>
        <label className="flex flex-wrap items-center gap-2">
          <input type="radio" name="fee-mode" checked={mode === "per_seat"} onChange={() => { setMode("per_seat"); setState("idle"); }} /> Montant par place
          {mode === "per_seat" && <><input aria-label="Montant par place (DH)" className={input} type="number" min={1} max={1000} value={amountDh} onChange={(e) => { setAmountDh(e.target.value); setState("idle"); }} /> DH</>}
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <input type="radio" name="fee-mode" checked={mode === "percent"} onChange={() => { setMode("percent"); setState("idle"); }} /> Pourcentage du montant
          {mode === "percent" && <><input aria-label="Pourcentage des frais" className={input} type="number" min={1} max={30} step="0.5" value={percent} onChange={(e) => { setPercent(e.target.value); setState("idle"); }} /> %</>}
        </label>
      </fieldset>
      <p className="text-xs text-muted">Affichés avant le paiement, ajoutés après les remises, jamais sur une place gratuite ; remboursés avec la place. Les réservations déjà faites ne changent pas.</p>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">{state === "busy" ? "Enregistrement…" : "Enregistrer les frais"}</button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">Valeur invalide ou enregistrement impossible.</p>}
        </div>
      )}
    </form>
  );
}
