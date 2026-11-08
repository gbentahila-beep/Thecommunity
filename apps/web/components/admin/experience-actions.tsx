"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const REASONS: Record<string, string> = {
  upcoming_participants: "Des dates à venir ont encore des participants (ou une liste d'attente) : annulez ces dates depuis leur page « Participants », puis archivez.",
  pending_requests: "Des demandes de participation sont en attente : acceptez-les ou refusez-les d'abord.",
  has_history: "Cette expérience a déjà eu des participants (réservations, demandes ou avis) : archivez-la plutôt, l'historique sera conservé.",
  superadmin_only: "La suppression est réservée aux super-admins.",
  not_archived: "Cette expérience n'est pas archivée.",
};

/**
 * Archiver / réactiver (équipe), supprimer définitivement (super-admin, expérience sans historique).
 * Chaque action demande une confirmation dans la page ; le catalogue public est rafraîchi aussitôt.
 */
export function ExperienceActions({ id, status, canDelete, live }: { id: string; status: string; canDelete: boolean; live: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const archived = status === "archived";
  const run = async (action: "archive" | "activate" | "delete") => {
    setBusy(true);
    setMsg(null);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminExperienceAction")({ experienceId: id, action });
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      if (action === "delete") router.push("/admin/experiences?supprime=1");
      else router.refresh();
    } catch (e) {
      const reason = (e as { details?: { reason?: string } }).details?.reason ?? "";
      setMsg(REASONS[reason] ?? "Action impossible pour le moment. Réessayez.");
    }
    setBusy(false);
    setConfirm(null);
  };
  const btn = "rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50";
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {archived
          ? "Archivée : elle n'apparaît plus sur le site. Son historique (réservations passées, factures, avis) est conservé."
          : "Archiver retire l'expérience du site sans rien effacer. Supprimer l'efface définitivement (seulement si elle n'a jamais eu de participants)."}
      </p>
      <div className="flex flex-wrap gap-2">
        {archived ? (
          <button type="button" disabled={busy || !live} onClick={() => run("activate")} className={`${btn} border-emerald-700 text-emerald-800 hover:bg-emerald-50`}>
            Réactiver (en brouillon)
          </button>
        ) : (
          <button type="button" disabled={busy || !live} onClick={() => setConfirm("archive")} className={`${btn} border-line text-ink hover:bg-cream`}>
            Archiver
          </button>
        )}
        {canDelete && (
          <button type="button" disabled={busy || !live} onClick={() => setConfirm("delete")} className={`${btn} border-red-300 text-red-800 hover:bg-red-50`}>
            Supprimer définitivement
          </button>
        )}
      </div>
      {!live && <p className="text-xs text-muted">Disponible avec la base réelle (mode démonstration).</p>}
      {confirm && (
        <div role="alertdialog" aria-label={confirm === "archive" ? "Confirmer l'archivage" : "Confirmer la suppression"} className={`rounded-xl border p-3 text-sm ${confirm === "delete" ? "border-red-200 bg-red-50 text-red-900" : "border-line bg-cream text-ink"}`}>
          <p>
            {confirm === "archive"
              ? "Archiver cette expérience ? Elle disparaîtra du site ; ses dates à venir sans participant repasseront en brouillon. Vous pourrez la réactiver."
              : "Supprimer définitivement cette expérience, ses dates vides et ses photos ? Cette action est journalisée et ne peut pas être annulée."}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(confirm)}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirm === "delete" ? "bg-red-700" : "bg-plum-900"}`}
            >
              {confirm === "archive" ? "Oui, archiver" : "Oui, supprimer"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold">
              Annuler
            </button>
          </div>
        </div>
      )}
      {msg && <p role="alert" className="text-sm text-red-800">{msg}</p>}
    </div>
  );
}
