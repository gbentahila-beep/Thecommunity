"use client";

import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const ROLES = [
  ["user", "Membre"],
  ["organizer", "Organisateur"],
  ["admin", "Admin"],
  ["superadmin", "Super-admin"],
] as const;

/**
 * Actions sur un compte : rôle (super-admin uniquement) et suspension (admin).
 * Exécutées par des fonctions serveur qui vérifient les droits et journalisent.
 */
export function UserActions({
  uid,
  role,
  status,
  canSetRole,
  isSelf,
  trustedHost = false,
}: {
  uid: string;
  role: string;
  status: "active" | "suspended";
  canSetRole: boolean;
  isSelf: boolean;
  /** 18d : membre de confiance (peut proposer des sorties). */
  trustedHost?: boolean;
}) {
  const [currentRole, setRole] = useState(role);
  void trustedHost; // docs/22, décision 30 : membres de confiance supprimés.
  const [currentStatus, setStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // Confirmation affichée dans la page (pas de fenêtre système, bloquée par certains navigateurs mobiles).
  const [pending, setPending] = useState<{ label: string; go: () => Promise<void>; alt?: { label: string; go: () => Promise<void> } } | null>(null);

  const run = async (name: string, data: Record<string, unknown>, onOk: () => void) => {
    setBusy(true);
    setMessage("");
    try {
      await httpsCallable(firebase().functions, name)(data);
      onOk();
      setMessage("Enregistré");
    } catch (e) {
      setMessage((e as { message?: string }).message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (isSelf) return <span className="text-xs text-muted">Vous</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSetRole && (
        <>
          <label className="sr-only" htmlFor={`role-${uid}`}>Rôle</label>
          <select
            id={`role-${uid}`}
            value={currentRole}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "user") return void run("setUserRole", { uid, role: next }, () => setRole(next));
              setPending({ label: `Donner le rôle « ${ROLES.find((r) => r[0] === next)?.[1]} » à ce compte ?`, go: () => run("setUserRole", { uid, role: next }, () => setRole(next)) });
            }}
            className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
          >
            {/* Étape 19 : le rôle organisateur se donne en validant un compte dans « Organisateurs » (il est lié à une structure). */}
            {ROLES.map(([value, label]) => <option key={value} value={value} disabled={value === "organizer"}>{value === "organizer" ? `${label} (via Organisateurs)` : label}</option>)}
          </select>
        </>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const next = currentStatus === "active" ? "suspended" : "active";
          if (next === "active") return void run("adminSetUserStatus", { uid, status: next }, () => setStatus(next));
          // Audit 23/11 : la suspension annule les réservations à venir (remboursées) et retire la personne des tables.
          setPending({ label: "Suspendre ce compte ? La personne ne pourra plus se connecter ; ses réservations à venir sont annulées et remboursées.", go: () => run("adminSetUserStatus", { uid, status: next, refund: "full" }, () => setStatus(next)), alt: { label: "Sans rembourser (faute grave)", go: () => run("adminSetUserStatus", { uid, status: next, refund: "none" }, () => setStatus(next)) } });
        }}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${currentStatus === "active" ? "bg-red-50 text-red-800 hover:bg-red-100" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
      >
        {currentStatus === "active" ? "Suspendre" : "Réactiver"}
      </button>
      {pending && (
        <span role="alertdialog" aria-label={pending.label} className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-950">
          {pending.label}
          <button type="button" disabled={busy} onClick={() => { const go = pending.go; setPending(null); void go(); }} className="rounded-full bg-brand-900 px-2.5 py-1 font-semibold text-white">Confirmer</button>
          {pending.alt && <button type="button" disabled={busy} onClick={() => { const go = pending.alt!.go; setPending(null); void go(); }} className="rounded-full border border-red-300 bg-white px-2.5 py-1 font-semibold text-red-800">{pending.alt.label}</button>}
          <button type="button" onClick={() => setPending(null)} className="rounded-full border border-line bg-white px-2.5 py-1 font-semibold">Annuler</button>
        </span>
      )}
      {message && <span role="status" className="text-xs text-muted">{message}</span>}
    </div>
  );
}
