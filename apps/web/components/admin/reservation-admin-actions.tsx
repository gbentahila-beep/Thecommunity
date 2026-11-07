"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const ERRORS: Record<string, string> = {
  not_cancellable: "Cette réservation n'est plus active.",
  not_movable: "Seule une réservation active peut être déplacée.",
  full: "Plus assez de places sur la nouvelle date.",
  already_booked: "Cette personne a déjà une place sur la nouvelle date.",
  different_experience: "La nouvelle date doit être de la même expérience.",
  not_open: "La nouvelle date n'est pas ouverte.",
  already_started: "Cette date est déjà passée.",
  too_early: "Le pointage ouvre 3 h avant le début.",
  not_checkable: "Seule une réservation confirmée se pointe.",
  already_cancelled: "Cette date est déjà annulée.",
};

async function call(name: string, data: Record<string, unknown>) {
  await firebase().auth.authStateReady();
  await httpsCallable(firebase().functions, name)(data);
  // Places affichées sur le site public : cache du catalogue vidé.
  await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
}
const errorText = (e: unknown) => ERRORS[(e as { details?: { reason?: string } }).details?.reason ?? ""] ?? "Action impossible. Réessayez.";

const btn = "rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50";

/**
 * Actions de l'équipe sur une réservation : pointage, déplacement, annulation (remboursement au choix, motif).
 * Chaque action est vérifiée par le serveur (rôle admin) et journalisée.
 */
export function ReservationAdminActions({
  reservationId,
  name,
  status,
  canCheckIn,
  moveTargets,
  amounts,
}: {
  reservationId: string;
  name: string;
  status: string;
  canCheckIn: boolean;
  moveTargets: { id: string; label: string }[];
  amounts: { full: string; policy: string; paid: boolean };
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"cancel" | "move" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refund, setRefund] = useState<"full" | "policy" | "none">("full");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState(moveTargets[0]?.id ?? "");
  const active = status === "confirmed" || status === "pending_payment";

  const run = async (name: string, data: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      await call(name, data);
      setPanel(null);
      router.refresh();
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {canCheckIn && ["confirmed", "attended", "no_show"].includes(status) && (
          <>
            {status !== "attended" && (
              <button type="button" disabled={busy} onClick={() => run("adminCheckIn", { reservationId, presence: "attended" })} className={`${btn} border-emerald-600 text-emerald-800 hover:bg-emerald-50`}>
                Présent
              </button>
            )}
            {status !== "no_show" && (
              <button type="button" disabled={busy} onClick={() => run("adminCheckIn", { reservationId, presence: "no_show" })} className={`${btn} border-red-300 text-red-800 hover:bg-red-50`}>
                Absent
              </button>
            )}
            {status !== "confirmed" && (
              <button type="button" disabled={busy} onClick={() => run("adminCheckIn", { reservationId, presence: "confirmed" })} className={`${btn} border-line text-muted hover:bg-cream`}>
                Annuler le pointage
              </button>
            )}
          </>
        )}
        {active && moveTargets.length > 0 && (
          <button type="button" disabled={busy} onClick={() => setPanel(panel === "move" ? null : "move")} className={`${btn} border-line text-ink hover:bg-cream`} aria-expanded={panel === "move"}>
            Déplacer
          </button>
        )}
        {active && (
          <button type="button" disabled={busy} onClick={() => setPanel(panel === "cancel" ? null : "cancel")} className={`${btn} border-red-300 text-red-800 hover:bg-red-50`} aria-expanded={panel === "cancel"}>
            Annuler
          </button>
        )}
      </div>

      {panel === "move" && (
        <div className="space-y-2 rounded-xl bg-cream/70 p-3 text-sm">
          <label className="block font-medium" htmlFor={`move-${reservationId}`}>Déplacer {name} vers :</label>
          <select id={`move-${reservationId}`} value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2">
            {moveTargets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <p className="text-xs text-muted">Le montant payé est conservé ; la personne est prévenue ; la place libérée ici est proposée à la liste d&apos;attente.</p>
          <button type="button" disabled={busy || !target} onClick={() => run("adminMoveReservation", { reservationId, targetSessionId: target })} className="rounded-full bg-plum-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {busy ? "…" : "Confirmer le déplacement"}
          </button>
        </div>
      )}

      {panel === "cancel" && (
        <div className="space-y-2 rounded-xl bg-red-50/60 p-3 text-sm">
          {amounts.paid ? (
            <fieldset className="space-y-1">
              <legend className="font-medium">Remboursement</legend>
              <label className="flex items-center gap-2"><input type="radio" name={`refund-${reservationId}`} checked={refund === "full"} onChange={() => setRefund("full")} className="accent-plum-900" /> Intégral ({amounts.full}) — recommandé quand l&apos;équipe annule</label>
              <label className="flex items-center gap-2"><input type="radio" name={`refund-${reservationId}`} checked={refund === "policy"} onChange={() => setRefund("policy")} className="accent-plum-900" /> Selon la politique d&apos;annulation ({amounts.policy})</label>
              <label className="flex items-center gap-2"><input type="radio" name={`refund-${reservationId}`} checked={refund === "none"} onChange={() => setRefund("none")} className="accent-plum-900" /> Aucun remboursement</label>
            </fieldset>
          ) : (
            <p className="text-xs text-muted">Pas encore payée : rien à rembourser.</p>
          )}
          <label className="block font-medium" htmlFor={`reason-${reservationId}`}>Motif (journalisé)</label>
          <input id={`reason-${reservationId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ex. demande du membre, partenaire indisponible…" className="w-full rounded-lg border border-line bg-white px-3 py-2" />
          <button
            type="button"
            disabled={busy || reason.trim().length < 2}
            onClick={() => run("adminCancelReservation", { reservationId, refund, reason: reason.trim() })}
            className="rounded-full bg-red-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : `Annuler la réservation de ${name}`}
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    </div>
  );
}

/** Annuler toute une date : chacun est remboursé intégralement et prévenu. */
export function CancelSessionButton({ sessionId, participants }: { sessionId: string; participants: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-full border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50">
        Annuler cette date
      </button>
      {open && (
        <div className="max-w-md space-y-2 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm">
          <p>
            {participants > 0
              ? `${participants} réservation${participants > 1 ? "s" : ""} active${participants > 1 ? "s" : ""} : chacune sera annulée et remboursée intégralement, et la personne prévenue.`
              : "Aucune réservation active."}{" "}
            La liste d&apos;attente et les demandes en cours seront closes. Action irréversible.
          </p>
          <label className="block font-medium" htmlFor="session-cancel-reason">Motif communiqué aux participants</label>
          <input id="session-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ex. météo, restaurant fermé exceptionnellement" className="w-full rounded-lg border border-line bg-white px-3 py-2" />
          <button
            type="button"
            disabled={busy || reason.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await call("adminCancelSession", { sessionId, reason: reason.trim() });
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(errorText(e));
              }
              setBusy(false);
            }}
            className="rounded-full bg-red-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Annulation en cours…" : "Confirmer l'annulation de la date"}
          </button>
          {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
        </div>
      )}
    </div>
  );
}
