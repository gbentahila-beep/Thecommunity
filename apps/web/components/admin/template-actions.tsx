"use client";

import type { EventTemplate } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Masquer / afficher un modèle, supprimer un modèle créé dans l'appli ou remettre un modèle du site d'origine. */
export function TemplateActions({ template, saved, live }: { template: EventTemplate; saved: boolean; live: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!live) return <span className="text-xs text-muted">Démonstration</span>;
  const call = async (name: string, data: unknown) => {
    setBusy(true);
    setError(false);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, name)(data);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const doc: Partial<EventTemplate> = { ...template };
  delete doc.builtIn;
  return (
    <span className="flex flex-wrap items-center gap-3 text-sm">
      <button type="button" disabled={busy} onClick={() => call("adminSaveTemplate", { ...JSON.parse(JSON.stringify(doc)), isActive: !template.isActive })} className="font-semibold text-brand-900 underline disabled:opacity-60">
        {template.isActive ? "Masquer" : "Afficher"}
      </button>
      {saved && (
        <button type="button" disabled={busy} onClick={() => { if (window.confirm(template.builtIn ? `Remettre « ${template.name} » dans sa version d'origine ?` : `Supprimer le modèle « ${template.name} » ?`)) void call("adminDeleteTemplate", { id: template.id }); }} className="font-semibold text-red-800 underline disabled:opacity-60">
          {template.builtIn ? "Remettre d'origine" : "Supprimer"}
        </button>
      )}
      {error && <span role="alert" className="text-red-800">Impossible pour le moment.</span>}
    </span>
  );
}
