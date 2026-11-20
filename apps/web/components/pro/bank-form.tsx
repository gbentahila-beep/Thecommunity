"use client";

import { payoutBankSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100";

/** Étape 21 — RIB professionnel de l'organisateur (reversements). Le numéro complet n'est jamais réaffiché. */
export function BankForm({ current, live }: { current: { holder: string; bankName: string; ribLast4: string } | null; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ holder: current?.holder ?? "", bankName: current?.bankName ?? "", rib: "" });
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [invalid, setInvalid] = useState<string[]>([]);
  const set = (k: keyof typeof v, value: string) => { setV((x) => ({ ...x, [k]: value })); setState("idle"); };
  return (
    <form
      noValidate
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = payoutBankSchema.safeParse(v);
        if (!r.success) { setInvalid(r.error.issues.map((i) => String(i.path[0]))); setState("error"); return; }
        setInvalid([]);
        if (!live) return setState("saved");
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "organizerSaveBankDetails")(r.data);
          setV((x) => ({ ...x, rib: "" }));
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <label className="text-sm"><span className="mb-1 block font-medium">Titulaire du compte</span><input id="bank-holder" className={input} value={v.holder} aria-invalid={invalid.includes("holder") || undefined} onChange={(e) => set("holder", e.target.value)} /></label>
      <label className="text-sm"><span className="mb-1 block font-medium">Banque</span><input id="bank-name" className={input} value={v.bankName} aria-invalid={invalid.includes("bankName") || undefined} onChange={(e) => set("bankName", e.target.value)} /></label>
      <label className="text-sm"><span className="mb-1 block font-medium">RIB (24 chiffres){current ? ` — actuel : •••• ${current.ribLast4}` : ""}</span><input id="bank-rib" className={input} inputMode="numeric" autoComplete="off" value={v.rib} aria-invalid={invalid.includes("rib") || undefined} onChange={(e) => set("rib", e.target.value)} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{current ? "Mettre à jour le RIB" : "Enregistrer le RIB"}</button>
        {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.{live ? "" : " (démonstration : rien n'est enregistré)"}</p>}
        {state === "error" && <p role="alert" className="text-sm text-red-800">Vérifiez les champs : le RIB marocain compte 24 chiffres.</p>}
      </div>
    </form>
  );
}
