"use client";

import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Candidature « Devenir partenaire » : créer le partenaire, écarter, ou remettre à traiter. */
export function ApplicationActions({ applicationId, status, partnerId }: { applicationId: string; status: string; partnerId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const run = async (action: "convert" | "decline" | "reopen") => {
    setBusy(true);
    setError(false);
    try {
      await firebase().auth.authStateReady();
      const r = (await httpsCallable(firebase().functions, "adminPartnerApplicationAction")({ applicationId, action })).data as { partnerId: string | null };
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      if (action === "convert" && r.partnerId) router.push(`/admin/partenaires/${r.partnerId}?depuis=candidature`);
      else router.refresh();
    } catch {
      setError(true);
    }
    setBusy(false);
  };
  const btn = "rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50";
  if (status === "converted" && partnerId)
    return <Link href={`/admin/partenaires/${partnerId}`} className="text-xs font-semibold text-plum-900 underline">Voir la fiche partenaire</Link>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "new" ? (
        <>
          <button type="button" disabled={busy} onClick={() => run("convert")} className={`${btn} border-plum-900 bg-plum-900 text-white hover:bg-plum-800`}>Créer le partenaire</button>
          <button type="button" disabled={busy} onClick={() => run("decline")} className={`${btn} border-line text-ink hover:bg-cream`}>Écarter</button>
        </>
      ) : (
        <button type="button" disabled={busy} onClick={() => run("reopen")} className={`${btn} border-line text-ink hover:bg-cream`}>Remettre à traiter</button>
      )}
      {error && <span role="alert" className="text-xs text-red-800">Action impossible.</span>}
    </div>
  );
}
