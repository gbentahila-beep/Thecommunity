"use client";

import { httpsCallable } from "firebase/functions";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const REASONS = ["behaviour", "harassment", "safety", "other"] as const;

/**
 * Audit du 23/11 : signaler quelqu'un depuis sa réservation, PENDANT l'expérience comme après, quel que soit le format.
 * La personne se choisit parmi sa table ou son groupe quand on les connaît ; sinon on la décrit (l'équipe l'identifie).
 * Confidentiel : seule l'équipe le lit ; la personne signalée ne sait jamais qui l'a signalée.
 */
export function ReportFromBooking({ reservationId, people, live, during }: { reservationId: string; people: { uid: string; firstName: string }[]; live: boolean; during: boolean }) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState(people[0]?.uid ?? "");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("behaviour");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error" | "already">("idle");

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5" data-testid="report-from-booking">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <ShieldAlert className="size-5 text-red-800" aria-hidden />
        {t("bookingTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{during ? t("bookingTextLive") : t("bookingText")}</p>
      {state === "done" ? (
        <p role="status" className="mt-3 text-sm text-emerald-800">{t("doneMail")}</p>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">
          {t("bookingCta")}
        </button>
      ) : (
        <form
          className="mt-3 space-y-3 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            if (details.trim().length < 5) return setState("error");
            setState("busy");
            try {
              if (live) {
                await firebase().auth.authStateReady();
                await httpsCallable(firebase().functions, "reportFromReservation")({ reservationId, otherUid: other, reason, details: details.trim() });
              }
              setState("done");
            } catch (err) {
              setState((err as { details?: { reason?: string } }).details?.reason === "already_reported" ? "already" : "error");
            }
          }}
        >
          <label className="flex flex-col gap-1 font-medium">
            {t("who")}
            <select className="rounded-lg border border-line bg-white px-2 py-2" value={other} onChange={(e) => setOther(e.target.value)}>
              {people.map((p) => <option key={p.uid} value={p.uid}>{p.firstName}</option>)}
              <option value="">{t("someoneElse")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 font-medium">
            {t("reason")}
            <select className="rounded-lg border border-line bg-white px-2 py-2" value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
              {REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-medium">
            {other ? t("details") : t("detailsDescribe")}
            <textarea rows={4} maxLength={1000} className="rounded-lg border border-line bg-white px-2 py-2" value={details} onChange={(e) => setDetails(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={state === "busy"} className="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{t("send")}</button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted underline">{t("cancel")}</button>
          </div>
          <p className="text-xs text-muted">{t("privacy")}</p>
          {state === "error" && <p role="alert" className="text-sm text-red-800">{t("error")}</p>}
          {state === "already" && <p role="alert" className="text-sm text-red-800">{t("already")}</p>}
        </form>
      )}
    </section>
  );
}
