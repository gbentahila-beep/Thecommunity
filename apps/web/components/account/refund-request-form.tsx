"use client";

import { REFUND_REQUEST_REASONS, refundRequestSchema, type RefundRequestReason } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

/** Étape 22 — demande de remboursement du participant (une par réservation, jusqu'à 7 jours après l'activité). */
export function RefundRequestForm({ reservationId, live }: { reservationId: string; live: boolean }) {
  const t = useTranslations("refund");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RefundRequestReason>("not_delivered");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  if (state === "sent") return <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" data-testid="refund-sent">{t("sent")}</p>;
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="refund-request">
      <h2 className="font-display text-xl font-medium text-plum-900">{t("title")}</h2>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary btn-sm mt-3">{t("submit")}…</button>
      ) : (
        <form
          noValidate
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = refundRequestSchema.safeParse({ reservationId, reason, message });
            if (!r.success) return setState("error");
            if (!live) return setState("sent");
            setState("busy");
            try {
              await firebase().auth.authStateReady();
              await httpsCallable(firebase().functions, "requestRefund")(r.data);
              setState("sent");
              router.refresh();
            } catch {
              setState("error");
            }
          }}
        >
          <p className="text-sm text-ink/80">{t("intro")}</p>
          <label className="block text-sm"><span className="mb-1 block font-medium">{t("reason")}</span>
            <select id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value as RefundRequestReason)} className="w-full rounded-xl border border-line bg-white px-3 py-2.5">
              {REFUND_REQUEST_REASONS.map((x) => <option key={x} value={x}>{t(`reasons.${x}`)}</option>)}
            </select>
          </label>
          <label className="block text-sm"><span className="mb-1 block font-medium">{t("message")}</span>
            <textarea id="refund-message" rows={4} maxLength={1000} value={message} onChange={(e) => { setMessage(e.target.value); setState("idle"); }} className="w-full rounded-xl border border-line bg-white px-3 py-2.5" />
          </label>
          <button type="submit" disabled={state === "busy"} className="btn btn-primary btn-sm">{t("submit")}</button>
          {state === "error" && <p role="alert" className="text-sm text-red-800">{t("error")}</p>}
        </form>
      )}
    </section>
  );
}
