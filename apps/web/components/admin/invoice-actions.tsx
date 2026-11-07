"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Paiements : émettre le document manquant (paiement antérieur à la 5c) ou le renvoyer par e-mail. Journalisé. */
export function InvoiceActions({ paymentId, hasInvoice }: { paymentId: string; hasInvoice: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (action: "issue" | "resend") => {
    setBusy(true);
    setMsg(null);
    try {
      await firebase().auth.authStateReady();
      const r = (await httpsCallable(firebase().functions, "adminInvoiceAction")({ paymentId, action })).data as { mailStatus: string | null };
      setMsg({ ok: true, text: action === "issue" ? "Document émis." : r.mailStatus === "outbox" ? "Rangé dans la boîte d'envoi (test)." : r.mailStatus === "sent" ? "E-mail envoyé." : "Envoi échoué." });
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Action impossible." });
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(hasInvoice ? "resend" : "issue")}
        className="rounded-full border border-plum-900 px-3 py-1.5 text-xs font-semibold text-plum-900 hover:bg-plum-50 disabled:opacity-50"
      >
        {busy ? "…" : hasInvoice ? "Renvoyer par e-mail" : "Émettre le document"}
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </div>
  );
}
