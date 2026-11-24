"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

async function call<T>(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  return (await httpsCallable(firebase().functions, name, { timeout: 540_000 })(data)).data as T;
}

type Guest = { email: string; booked: string[]; problem?: string };

/** Site de démonstration : comptes invités inscrits à chaque remise à zéro, et le bouton « Réinitialiser la démo ». */
export function DemoReset({ guestEmails, canEdit }: { guestEmails: string[]; canEdit: boolean }) {
  const router = useRouter();
  const [emails, setEmails] = useState(guestEmails.join("\n"));
  const [saved, setSaved] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ reservations: number; sessionsReset: number; pastSessionsDeleted: number; guests: Guest[] } | null>(null);
  const [error, setError] = useState("");
  const list = emails.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);

  const save = async () => {
    setSaved("");
    setError("");
    try {
      await call("adminSaveDemoGuests", { guestEmails: list });
      setSaved("Enregistré.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };
  const reset = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      if (list.join() !== guestEmails.join()) await call("adminSaveDemoGuests", { guestEmails: list });
      setResult(await call("adminResetDemo", { confirm: "RÉINITIALISER" }));
      setConfirming(false);
      setTyped("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Réinitialisation impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 text-sm" data-testid="demo-reset">
      <section>
        <label htmlFor="guests" className="font-semibold text-ink">Comptes invités</label>
        <p className="mt-0.5 text-muted">À chaque remise à zéro, ces comptes sont inscrits à plusieurs rendez-vous de la semaine (un dîner, un café, l&apos;activité du samedi, un brunch…), pour vivre le parcours : confirmation, lieu dévoilé, table, rappels. Le compte doit exister et son profil être complété.</p>
        <textarea id="guests" rows={3} disabled={!canEdit} value={emails} onChange={(e) => { setEmails(e.target.value); setSaved(""); }} placeholder="une adresse par ligne" className="mt-2 w-full max-w-lg rounded-xl border border-line bg-white px-3 py-2 font-mono text-[13px] outline-none focus:border-brand-700" />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" disabled={!canEdit} onClick={save} className="rounded-full border border-brand-900 px-4 py-2 font-semibold text-brand-900 disabled:opacity-40">Enregistrer les invités</button>
          {saved && <span role="status" className="text-emerald-800">{saved}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
        <p className="font-semibold text-ink">Réinitialiser la démo</p>
        <ul className="mt-1 list-disc space-y-0.5 ps-5 text-muted">
          <li>Efface tout ce qui s&apos;est passé : réservations, paiements, factures, tables, demandes aux lieux, e-mails et WhatsApp de la boîte d&apos;envoi, notifications, avis des membres, Pass et carnets, dates passées.</li>
          <li>Garde le contenu : événements, rendez-vous, planning des samedis, lieux, modèles, comptes.</li>
          <li>Inscrit les comptes invités, puis 300 participants fictifs remplissent les 7 prochains jours (60 à 100 % des places).</li>
        </ul>
        {!confirming ? (
          <button type="button" disabled={!canEdit} onClick={() => setConfirming(true)} className="mt-3 rounded-full bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-40">Réinitialiser et remplir la semaine</button>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">Tapez <strong>RÉINITIALISER</strong>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} className="w-44 rounded-lg border border-line bg-white px-2 py-1.5" aria-label="Confirmation" />
            </label>
            <button type="button" disabled={busy || typed.trim().toUpperCase() !== "RÉINITIALISER"} onClick={reset} className="rounded-full bg-red-700 px-5 py-2 font-semibold text-white disabled:opacity-40">{busy ? "En cours (2 à 5 minutes)…" : "Confirmer"}</button>
            {!busy && <button type="button" onClick={() => setConfirming(false)} className="font-medium text-muted underline">Annuler</button>}
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-red-800">{error}</p>}
        {result && (
          <div role="status" className="mt-3 rounded-xl bg-white p-3 text-ink">
            <p><strong>Démo réinitialisée.</strong> {result.sessionsReset} date(s) remises à zéro, {result.pastSessionsDeleted} date(s) passée(s) supprimée(s), {result.reservations} réservation(s) de la foule.</p>
            {result.guests.map((g) => (
              <p key={g.email} className="mt-1">{g.email} : {g.problem ? <span className="text-red-800">{g.problem}</span> : g.booked.length ? `inscrit(e) à ${g.booked.join(", ")}` : "aucune date disponible"}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
