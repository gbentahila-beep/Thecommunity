"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";
import { Badge } from "./ui";

export type AllocationRow = {
  id: string;
  partnerName: string;
  tables: number;
  people: number;
  unitWord: string;
  status: "sent" | "confirmed" | "refused" | "expired" | "cancelled";
  round: number;
  reference: string;
  fixed?: boolean;
  sentLabel: string;
  responseLabel: string;
  phone: string;
  waWeb: string | null;
  waMobile: string | null;
  recapWaWeb: string | null;
  link: string;
};

const STATUS: Record<AllocationRow["status"], { label: string; tone: "green" | "amber" | "red" | "gray" }> = {
  sent: { label: "En attente de réponse", tone: "amber" },
  confirmed: { label: "Confirmé", tone: "green" },
  refused: { label: "Refusé", tone: "red" },
  expired: { label: "Sans réponse", tone: "red" },
  cancelled: { label: "Annulé", tone: "gray" },
};

async function call(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  const r = (await httpsCallable(firebase().functions, name)(data)).data;
  await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
  return r;
}

/**
 * Attribution des lieux d'une date (docs/22 § 17.H, H6) : demandes aux lieux et leur statut ; WhatsApp Web avec le
 * message prérempli, « Confirmé par téléphone », « Refusé », relance, nouveau calcul.
 */
export type VenueCandidate = { id: string; name: string; reason: string; ok: boolean };

export function AllocationCard({ sessionId, summary, rows, live, canRun, candidates = [], missing = 0 }: { sessionId: string; summary: string; rows: AllocationRow[]; live: boolean; canRun: boolean; candidates?: VenueCandidate[]; missing?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [tables, setTables] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (key: string, name: string, data: unknown, ok: string | ((r: Record<string, unknown>) => string)) => {
    setBusy(key);
    setMsg(null);
    try {
      const r = (await call(name, data)) as Record<string, unknown>;
      setMsg({ ok: true, text: typeof ok === "function" ? ok(r ?? {}) : ok });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as { message?: string }).message ?? "Action impossible." });
    }
    setBusy("");
  };
  return (
    <div className="space-y-4" data-testid="allocation">
      <p className="text-sm text-muted">{summary}</p>
      {rows.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2 p-3" data-testid="allocation-row">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{r.partnerName}</span>
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                {r.fixed && <Badge tone="gray">Lieu fixe</Badge>}
                {r.round > 1 && <Badge tone="gray">Tour {r.round}</Badge>}
              </div>
              <p className="text-sm text-muted">{r.tables} {r.unitWord} · {r.people} personne{r.people > 1 ? "s" : ""} · {r.reference} · envoyée {r.sentLabel}{r.responseLabel ? ` · ${r.responseLabel}` : ""}</p>
              {live && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {r.status === "sent" && r.waWeb && (
                    <a href={r.waWeb} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800" onClick={() => void call("adminRequestAction", { requestId: r.id, action: "whatsapp_sent" }).catch(() => undefined)}>Ouvrir WhatsApp Web</a>
                  )}
                  {r.status === "sent" && r.waMobile && <a href={r.waMobile} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink">WhatsApp (téléphone)</a>}
                  {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink">Appeler</a>}
                  {r.status === "sent" && (
                    <>
                      <button type="button" disabled={Boolean(busy)} className="rounded-full bg-brand-900 px-3 py-1.5 font-semibold text-white disabled:opacity-60" onClick={() => run(`c-${r.id}`, "adminRequestAction", { requestId: r.id, action: "confirm_phone" }, "Confirmé.")}>Confirmé par téléphone</button>
                      <button type="button" disabled={Boolean(busy)} className="rounded-full border border-red-300 px-3 py-1.5 font-semibold text-red-800 disabled:opacity-60" onClick={() => window.confirm("Le lieu refuse ? Le logiciel proposera un autre lieu compatible s'il en reste.") && run(`r-${r.id}`, "adminRequestAction", { requestId: r.id, action: "refuse" }, "Refus enregistré. S'il ne reste aucun lieu compatible, choisissez-en un dans « Choisir un autre lieu ».")}>Refusé</button>
                      <button type="button" disabled={Boolean(busy)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink disabled:opacity-60" onClick={() => run(`s-${r.id}`, "adminRequestAction", { requestId: r.id, action: "resend" }, "Relance envoyée.")}>Relancer</button>
                    </>
                  )}
                  {r.status === "confirmed" && r.recapWaWeb && <a href={r.recapWaWeb} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink" onClick={() => void call("adminRequestAction", { requestId: r.id, action: "recap_sent" }).catch(() => undefined)}>Envoyer le récapitulatif sur WhatsApp</a>}
                  <a href={r.link} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink">Page du lieu</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {live && canRun ? (
        <button type="button" disabled={Boolean(busy)} className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => run("run", "adminAllocate", { sessionId }, (r) => Number(r.requested ?? 0) > 0 ? `${r.requested} table(s) demandée(s) à d'autres lieux.` : Number(r.missing ?? 0) > 0 ? `Aucun autre lieu compatible disponible pour ${r.missing} table(s) : choisissez un lieu ci-dessous.` : "Rien à demander : toutes les tables ont un lieu.")}>
          {rows.length ? "Relancer l'attribution (tables manquantes)" : "Demander les restaurants maintenant"}
        </button>
      ) : null}
      {live && candidates.length > 0 && (
        <details className="rounded-xl border border-line p-3" open={missing > 0} data-testid="venue-candidates">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{missing > 0 ? `Choisir un autre lieu (${missing} table${missing > 1 ? "s" : ""} sans lieu)` : "Demander à un autre lieu"}</summary>
          <p className="mt-1 text-xs text-muted">Les lieux qui servent ce format. Ceux en gris n&apos;ont pas été proposés automatiquement (raison indiquée) : vous pouvez quand même leur demander, par exemple après un accord au téléphone.</p>
          <ul className="mt-2 divide-y divide-line">
            {candidates.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className={`min-w-40 flex-1 ${c.ok ? "font-medium text-ink" : "text-muted"}`}>{c.name} <span className={`text-xs ${c.ok ? "text-emerald-800" : "text-muted"}`}>· {c.reason}</span></span>
                <label className="flex items-center gap-1 text-xs text-muted">Tables
                  <input inputMode="numeric" value={tables[c.id] ?? String(Math.max(1, missing || 1))} onChange={(ev) => setTables((t) => ({ ...t, [c.id]: ev.target.value }))} className="w-12 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
                </label>
                <button type="button" disabled={Boolean(busy)} className={`rounded-full px-3 py-1.5 font-semibold disabled:opacity-60 ${c.ok ? "bg-brand-900 text-white" : "border border-brand-900 text-brand-900"}`} onClick={() => run(`v-${c.id}`, "adminRequestVenue", { sessionId, partnerId: c.id, tables: Number(tables[c.id] ?? Math.max(1, missing || 1)) }, `Demande envoyée à ${c.name}.`)}>Demander à ce lieu</button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {live && canRun && !rows.length ? (
        <p className="text-xs text-muted">Facultatif : sinon, la demande part toute seule la veille à 15h.</p>
      ) : !live ? (
        <p className="text-xs text-muted">Démonstration : les demandes aux lieux partent sur le site en ligne.</p>
      ) : null}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </div>
  );
}

/** Date à risque (décision 46) : maintenir, ou proposer une autre date / un regroupement (chacun accepte ou est remboursé). */
export function RiskCard({ sessionId, status, options, live, summary }: { sessionId: string; status: string; options: { id: string; label: string }[]; live: boolean; summary: string }) {
  const router = useRouter();
  const [target, setTarget] = useState(options[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (data: unknown, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await call("adminRiskDecision", data);
      setMsg({ ok: true, text: ok });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as { message?: string }).message ?? "Action impossible." });
    }
    setBusy(false);
  };
  return (
    <div className="space-y-3 text-sm" data-testid="risk">
      <p className="text-muted">{summary}</p>
      {status === "at_risk" && live && (
        <div className="flex flex-wrap items-end gap-3">
          <button type="button" disabled={busy} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={() => run({ sessionId, action: "keep" }, "Date maintenue.")}>Maintenir la date</button>
          {options.length > 0 && (
            <>
              <label className="flex flex-col gap-1 font-medium">Proposer
                <select className="rounded-xl border border-line bg-white px-3 py-2" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
              <button type="button" disabled={busy || !target} className="rounded-full border border-line px-4 py-2 font-semibold text-ink disabled:opacity-60" onClick={() => window.confirm("Envoyer la proposition à tous les inscrits ? Chacun acceptera ou sera remboursé.") && run({ sessionId, action: "propose", targetSessionId: target }, "Proposition envoyée.")}>Envoyer la proposition</button>
            </>
          )}
        </div>
      )}
      {status === "at_risk" && !live && <p className="text-xs text-muted">Démonstration : les décisions s&apos;enregistrent sur le site en ligne.</p>}
      {status === "at_risk" && <p className="text-xs text-muted">Pour annuler et rembourser tout le monde : bouton « Annuler la date » plus bas.</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-emerald-800" : "text-red-800"}>{msg.text}</p>}
    </div>
  );
}
