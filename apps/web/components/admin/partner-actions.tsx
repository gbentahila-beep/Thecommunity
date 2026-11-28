"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Archiver / réactiver (équipe), supprimer (super-admin, partenaire sans expérience). Confirmation dans la page. */
export function PartnerActions({ id, status, canDelete, linkedCount }: { id: string; status: string; canDelete: boolean; linkedCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (action: "archive" | "activate" | "delete") => {
    setBusy(true);
    setMsg(null);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "adminPartnerAction")({ id, action });
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      if (action === "delete") router.push("/admin/partenaires?supprime=1");
      else router.refresh();
    } catch (e) {
      const reason = (e as { details?: { reason?: string } }).details?.reason;
      setMsg(reason === "linked" ? "Ce partenaire est utilisé par des expériences : archivez-le plutôt." : "Action impossible.");
    }
    setBusy(false);
    setConfirmDelete(false);
  };
  const btn = "rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "archived" ? (
          <button type="button" disabled={busy} onClick={() => run("activate")} className={`${btn} border-emerald-700 text-emerald-800 hover:bg-emerald-50`}>Réactiver</button>
        ) : (
          <button type="button" disabled={busy} onClick={() => run("archive")} className={`${btn} border-line text-ink hover:bg-cream`}>Archiver</button>
        )}
        {canDelete && !confirmDelete && (
          <button type="button" disabled={busy || linkedCount > 0} onClick={() => setConfirmDelete(true)} className={`${btn} border-red-300 text-red-800 hover:bg-red-50`}>Supprimer</button>
        )}
      </div>
      {canDelete && linkedCount > 0 && <p className="text-xs text-muted">Suppression impossible : {linkedCount} expérience(s) utilisent ce partenaire. Archivez-le pour le retirer des choix.</p>}
      {confirmDelete && (
        <div role="alertdialog" aria-label="Confirmer la suppression" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p>Supprimer définitivement ce partenaire ? Cette action est journalisée et ne peut pas être annulée.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={() => run("delete")} className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Oui, supprimer</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold">Non, garder</button>
          </div>
        </div>
      )}
      {msg && <p role="alert" className="text-sm text-red-800">{msg}</p>}
    </div>
  );
}
