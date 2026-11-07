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
}: {
  uid: string;
  role: string;
  status: "active" | "suspended";
  canSetRole: boolean;
  isSelf: boolean;
}) {
  const [currentRole, setRole] = useState(role);
  const [currentStatus, setStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // Confirmation affichée dans la page (pas de fenêtre système, bloquée par certains navigateurs mobiles).
  const [pending, setPending] = useState<{ label: string; go: () => Promise<void> } | null>(null);

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
            {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const next = currentStatus === "active" ? "suspended" : "active";
          if (next === "active") return void run("adminSetUserStatus", { uid, status: next }, () => setStatus(next));
          setPending({ label: "Suspendre ce compte ? La personne ne pourra plus se connecter.", go: () => run("adminSetUserStatus", { uid, status: next }, () => setStatus(next)) });
        }}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${currentStatus === "active" ? "bg-red-50 text-red-800 hover:bg-red-100" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
      >
        {currentStatus === "active" ? "Suspendre" : "Réactiver"}
      </button>
      {pending && (
        <span role="alertdialog" aria-label={pending.label} className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-950">
          {pending.label}
          <button type="button" disabled={busy} onClick={() => { const go = pending.go; setPending(null); void go(); }} className="rounded-full bg-plum-900 px-2.5 py-1 font-semibold text-white">Confirmer</button>
          <button type="button" onClick={() => setPending(null)} className="rounded-full border border-line bg-white px-2.5 py-1 font-semibold">Annuler</button>
        </span>
      )}
      {message && <span role="status" className="text-xs text-muted">{message}</span>}
    </div>
  );
}
