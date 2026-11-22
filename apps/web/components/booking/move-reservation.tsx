"use client";

import { httpsCallable } from "firebase/functions";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Déplacer sa réservation sur une autre date du même rendez-vous, jusqu'à la fermeture (docs/22, décision 38). */
export function MoveReservation({ reservationId, options, until }: { reservationId: string; options: { id: string; label: string }[]; until: string }) {
  const t = useTranslations("move");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(options[0]?.id ?? "");
  const [state, setState] = useState<"idle" | "busy" | "error" | "done">("idle");
  const [reason, setReason] = useState("");
  return (
    <section className="card p-5" data-testid="move-reservation">
      <h2 className="flex items-center gap-2 font-display text-[1.45rem] font-medium text-brand-900"><CalendarClock className="size-6 text-brand-800" aria-hidden />{t("title")}</h2>
      <p className="mt-1.5 text-[15px] text-ink/80">{t("text", { until })}</p>
      {!open ? (
        <button type="button" className="mt-4 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-brand-900 hover:bg-cream" onClick={() => setOpen(true)} disabled={options.length === 0}>
          {options.length ? t("cta") : t("none")}
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("pick")}
            <select className="rounded-xl border border-line bg-white px-3 py-2.5 text-[15px]" value={target} onChange={(e) => setTarget(e.target.value)}>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={state === "busy" || !target}
            onClick={async () => {
              setState("busy");
              try {
                if (FIREBASE_ENABLED) {
                  await firebase().auth.authStateReady();
                  await httpsCallable(firebase().functions, "moveMyReservation")({ reservationId, targetSessionId: target });
                }
                setState("done");
                router.refresh();
              } catch (e) {
                setReason((e as { details?: { reason?: string } }).details?.reason ?? "");
                setState("error");
              }
            }}
          >
            {state === "busy" ? t("busy") : t("confirm")}
          </button>
        </div>
      )}
      {state === "done" && <p role="status" className="mt-3 text-sm text-emerald-800">{t("done")}</p>}
      {state === "error" && <p role="alert" className="mt-3 text-sm text-red-800">{["closed", "target_closed", "full"].includes(reason) ? t(`errors.${reason}`) : t("errors.other")}</p>}
    </section>
  );
}

/** Date à risque (décision 46) : accepter la date proposée sans repayer, ou être remboursé·e intégralement. */
export function ProposalCard({ reservationId, proposed, deadline }: { reservationId: string; proposed: string; deadline: string }) {
  const t = useTranslations("proposal");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const answer = async (accept: boolean) => {
    if (!accept && !window.confirm(t("refuseConfirm"))) return;
    setState("busy");
    try {
      if (FIREBASE_ENABLED) {
        await firebase().auth.authStateReady();
        await httpsCallable(firebase().functions, "respondProposal")({ reservationId, accept });
      }
      router.refresh();
      setState("idle");
    } catch {
      setState("error");
    }
  };
  return (
    <section className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 text-amber-950" data-testid="proposal">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm">{t("text", { proposed, deadline })}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary btn-sm" disabled={state === "busy"} onClick={() => answer(true)}>{t("accept")}</button>
        <button type="button" className="rounded-full border border-amber-400 bg-white px-5 py-2.5 text-sm font-semibold text-amber-950" disabled={state === "busy"} onClick={() => answer(false)}>{t("refuse")}</button>
      </div>
      {state === "error" && <p role="alert" className="mt-3 text-sm text-red-800">{t("error")}</p>}
    </section>
  );
}
