"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

export type ShowcaseOption = { key: string; templateId: string; tier: "casual" | "premium" | "exclusive" | null; label: string; venues: number; kind: "tables" | "activity" };

type Result = {
  cancelledSessions: number;
  refunded: number;
  deletedSessions: number;
  archived: number;
  deleted: number;
  created: { templateId: string; tier: string | null; experienceId: string; sessions: number }[];
  skipped: { templateId: string; tier: string | null; reason: string }[];
};

const REASON: Record<string, string> = {
  no_partner: "aucun lieu partenaire actif n'accueille ce format",
  invalid: "données du modèle incomplètes",
  inactive_template: "modèle masqué",
  unknown_template: "modèle introuvable",
  not_tables: "ce modèle n'est pas une Table",
  not_activity: "ce modèle est une Table",
};

/** Choix des modèles (Tables par gamme, activités), confirmation tapée, puis lancement de la vitrine. */
export function ShowcaseForm({ options, canRun, reason }: { options: ShowcaseOption[]; canRun: boolean; reason: "demo" | "role" | null }) {
  const router = useRouter();
  // Présélection : ce qui a au moins un lieu partenaire compatible.
  const [picked, setPicked] = useState<Set<string>>(() => new Set(options.filter((o) => o.venues > 0).map((o) => o.key)));
  const [weeks, setWeeks] = useState(4);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const chosen = options.filter((o) => picked.has(o.key));
  const label = new Map(options.map((o) => [o.key, o.label]));

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await firebase().auth.authStateReady();
      const res = await httpsCallable(firebase().functions, "adminResetShowcase", { timeout: 540_000 })({
        confirm,
        weeks,
        tables: chosen.filter((o) => o.kind === "tables").map((o) => ({ templateId: o.templateId, tier: o.tier })),
        activities: chosen.filter((o) => o.kind === "activity").map((o) => o.templateId),
      });
      setResult(res.data as Result);
      setConfirm("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'action a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const group = (kind: ShowcaseOption["kind"], title: string) => (
    <fieldset className="rounded-2xl border border-line bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      <ul className="grid gap-2 sm:grid-cols-2" data-testid={`showcase-${kind}`}>
        {options.filter((o) => o.kind === kind).map((o) => (
          <li key={o.key}>
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5" checked={picked.has(o.key)} onChange={() => toggle(o.key)} />
              <span>
                <span className="font-medium text-ink">{o.label}</span>
                <span className={`block text-xs ${o.venues > 0 ? "text-muted" : "text-amber-700"}`}>
                  {o.venues > 0 ? `${o.venues} lieu${o.venues > 1 ? "x" : ""} partenaire${o.venues > 1 ? "s" : ""} compatible${o.venues > 1 ? "s" : ""}` : kind === "activity" ? "Aucun lieu compatible : sera ignorée" : "Aucun lieu dans cette gamme pour l'instant"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );

  return (
    <div className="space-y-5">
      {group("tables", "Tables (une par modèle et gamme)")}
      {group("activity", "Activités (lieu fixe)")}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <label className="block text-sm font-medium text-ink">
          Nombre de semaines de dates
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="ms-3 rounded-lg border border-line bg-white px-2 py-1">
            {[1, 2, 3, 4, 6, 8].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <p className="mt-4 text-sm text-red-900">
          Action définitive : {chosen.length} événement{chosen.length > 1 ? "s" : ""} seront créés après la suppression de tous les événements actuels. Tapez <strong>SUPPRIMER</strong> pour confirmer.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SUPPRIMER" aria-label="Confirmation" disabled={!canRun || busy} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm" data-testid="showcase-confirm" />
          <button type="button" onClick={run} disabled={!canRun || busy || confirm !== "SUPPRIMER" || chosen.length === 0} className="rounded-full bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" data-testid="showcase-run">
            {busy ? "En cours… (quelques minutes)" : "Remplacer tous les événements"}
          </button>
        </div>
        {reason === "demo" && <p className="mt-3 text-xs text-muted">Indisponible en démonstration.</p>}
        {reason === "role" && <p className="mt-3 text-xs text-muted">Réservé aux super-admins.</p>}
        {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
      </div>
      {result && (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm" data-testid="showcase-result">
          <p className="font-semibold text-ink">Terminé</p>
          <p className="mt-1 text-muted">
            {result.created.length} événement(s) créé(s), {result.deleted} supprimé(s), {result.archived} archivé(s), {result.cancelledSessions} date(s) annulée(s)
            {result.refunded > 0 ? `, ${(result.refunded / 100).toLocaleString("fr-FR")} DH remboursés` : ""}.
          </p>
          {result.skipped.length > 0 && (
            <ul className="mt-3 list-disc ps-5 text-amber-800">
              {result.skipped.map((s) => <li key={`${s.templateId}:${s.tier}`}>{label.get(s.tier ? `${s.templateId}:${s.tier}` : s.templateId) ?? s.templateId} : {REASON[s.reason] ?? s.reason}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
