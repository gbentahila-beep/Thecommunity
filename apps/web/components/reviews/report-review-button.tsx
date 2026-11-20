"use client";

import { REVIEW_REPORT_REASONS, reviewReportSchema, type ReviewReportReason } from "@thecommunity/shared";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Étape 24 — signaler un avis (une fois par personne) ; l'équipe vérifie, rien n'est masqué automatiquement. */
export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations("reviewsPublic");
  const pathname = usePathname();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(!FIREBASE_ENABLED);
  const [reason, setReason] = useState<ReviewReportReason>("offensive");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!FIREBASE_ENABLED || !open) return;
    return onAuthStateChanged(firebase().auth, (u) => setSignedIn(Boolean(u)));
  }, [open]);

  if (state === "sent") return <p role="status" className="mt-3 text-sm text-emerald-800">{FIREBASE_ENABLED ? t("sent") : t("demo")}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-plum-900">
        <Flag className="size-3.5" aria-hidden />
        {t("report")}
      </button>
    );
  if (!signedIn)
    return (
      <p className="mt-3 text-sm text-muted">
        <Link href={`/connexion?suite=${encodeURIComponent(pathname)}`} className="font-semibold text-plum-900 underline underline-offset-4">{t("loginToReport")}</Link>
      </p>
    );
  return (
    <form
      noValidate
      className="mt-3 space-y-2 rounded-xl border border-line bg-white p-3"
      aria-label={t("reportTitle")}
      onSubmit={async (e) => {
        e.preventDefault();
        const r = reviewReportSchema.safeParse({ reviewId, reason, message });
        if (!r.success) {
          setError(t("messageRequired"));
          return setState("error");
        }
        if (!FIREBASE_ENABLED) return setState("sent");
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "reportReview")(r.data);
          setState("sent");
        } catch (err) {
          const why = (err as { details?: { reason?: string } }).details?.reason;
          setError(why === "already_reported" ? t("alreadyReported") : why === "own_review" ? t("ownReview") : t("error"));
          setState("error");
        }
      }}
    >
      <label htmlFor={`${id}-reason`} className="block text-sm font-medium text-ink">{t("reason")}</label>
      <select id={`${id}-reason`} value={reason} onChange={(e) => setReason(e.target.value as ReviewReportReason)} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
        {REVIEW_REPORT_REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
      </select>
      <label htmlFor={`${id}-message`} className="block text-sm font-medium text-ink">{t("message")}</label>
      <textarea id={`${id}-message`} rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
      {state === "error" && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{t("send")}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-medium text-muted underline">{t("cancel")}</button>
      </div>
    </form>
  );
}
