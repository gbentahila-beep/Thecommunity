"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

type Result = {
  rendezvous: { id: string; created: boolean; tiers: { tier: string; reused: boolean }[]; sessions: number }[];
  retired: { experienceId: string; title: string; archived: boolean; keptDates: number }[];
  skipped: { id: string; reason: string }[];
};

/** docs/25, lot E : « Passer au calendrier de lancement » (super-admin, confirmation tapée « BASCULER »). */
export function RendezvousLaunch({ canRun, reason, doneAt }: { canRun: boolean; reason: "demo" | "role" | null; doneAt: string | null }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await firebase().auth.authStateReady();
      const res = await httpsCallable(firebase().functions, "adminLaunchRendezvous", { timeout: 540_000 })({ confirm });
      setResult(res.data as Result);
      setConfirm("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'action a échoué.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-sm" data-testid="rendezvous-launch">
      <ul className="list-disc space-y-1 ps-5 text-muted">
        <li>Crée le <strong>Dîner du mercredi</strong> (20h30 ; Casual et Premium chaque semaine, Exclusive le premier mercredi du mois), le <strong>Café du samedi</strong> (16h) et le <strong>Brunch du dimanche</strong> (12h30), en Casual et Premium.</li>
        <li>Chaque gamme reprend l&apos;événement existant du même modèle (avis et réservations gardés) ; sinon il est créé à partir du modèle.</li>
        <li>Les Tables hors rendez-vous (Déjeuner, Café et Brunch Exclusive…) et les formats « pour plus tard » sont retirés : leurs dates sans inscrit disparaissent, <strong>les dates qui ont des inscrits sont maintenues</strong>, puis l&apos;événement est archivé après sa dernière date.</li>
        <li>Les activités du calendrier et les événements créés à la main ne sont pas touchés. Un rendez-vous déjà créé au même jour et à la même heure est gardé.</li>
      </ul>
      {doneAt && <p className="font-medium text-green-700">Bascule déjà faite le {doneAt}. La relancer ne crée pas de doublon.</p>}
      {!canRun ? (
        <p className="text-muted">{reason === "demo" ? "Indisponible en démonstration." : "Réservé aux super-admins."}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span>Tapez <strong>BASCULER</strong></span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-32 rounded-lg border border-line px-3 py-1.5" aria-label="Confirmation" />
          </label>
          <button type="button" disabled={busy || confirm !== "BASCULER"} onClick={run} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-40">
            {busy ? "Bascule en cours…" : "Passer au calendrier de lancement"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {result && (
        <div role="status" className="rounded-xl bg-cream p-3">
          <p>
            Rendez-vous : {result.rendezvous.map((r) => `${r.id} (${r.created ? "créé" : "déjà là"}, ${r.sessions} date(s) ajoutée(s))`).join(" ; ") || "aucun"}.
          </p>
          <p>
            Retirés : {result.retired.length} événement(s), dont {result.retired.filter((x) => x.archived).length} archivé(s) tout de suite ; {result.retired.reduce((n, x) => n + x.keptDates, 0)} date(s) avec inscrits maintenue(s).
          </p>
          {result.skipped.length > 0 && <p className="text-amber-700">Ignorés (modèle introuvable) : {result.skipped.map((x) => x.id).join(", ")}.</p>}
        </div>
      )}
    </div>
  );
}
