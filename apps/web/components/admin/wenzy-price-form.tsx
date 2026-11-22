"use client";

import { wenzyPriceInputSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-28 rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 disabled:bg-cream";

/**
 * Prix Wenzy (super-admin, docs/22 décision 1) : un seul prix par place, frais compris, pour tous les événements Wenzy.
 * Enregistrer l'applique aux expériences payantes et à leurs dates à venir ; le reste se paie sur place.
 */
export function WenzyPriceForm({ initial, canEdit }: { initial: number; canEdit: boolean }) {
  const router = useRouter();
  const [priceDh, setPriceDh] = useState(String(initial / 100));
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [done, setDone] = useState<{ experiences: number; sessions: number } | null>(null);
  return (
    <form
      noValidate
      className="space-y-3"
      data-testid="wenzy-price-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!wenzyPriceInputSchema.safeParse({ priceDh }).success) return setState("error");
        setState("busy");
        setDone(null);
        try {
          await firebase().auth.authStateReady();
          const res = await httpsCallable(firebase().functions, "adminSaveWenzyPrice")({ priceDh: Number(priceDh) });
          await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
          setDone(res.data as { experiences: number; sessions: number });
          setState("idle");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
        Prix par place
        <input aria-label="Prix Wenzy par place (DH)" className={input} type="number" min={0} max={1000} step="1" value={priceDh} disabled={!canEdit} onChange={(e) => { setPriceDh(e.target.value); setState("idle"); setDone(null); }} />
        DH
      </label>
      <p className="text-xs text-muted">
        Le seul montant payé en ligne, frais compris, pour tous les événements Wenzy (35 DH conseillé : 30 DH + 5 DH de frais). Tout le reste se règle sur place. Enregistrer l&apos;applique aux événements payants et à leurs dates à venir ; les réservations déjà faites gardent leur prix, les événements gratuits et les activités d&apos;organisateurs ne changent pas.
      </p>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">{state === "busy" ? "Enregistrement…" : "Enregistrer le prix"}</button>
          {done && <p role="status" className="text-sm text-emerald-800">Enregistré : {done.experiences} événement{done.experiences > 1 ? "s" : ""} et {done.sessions} date{done.sessions > 1 ? "s" : ""} mis à jour.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">Montant invalide ou enregistrement impossible.</p>}
        </div>
      )}
    </form>
  );
}
