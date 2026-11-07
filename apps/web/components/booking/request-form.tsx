"use client";

import { REQUEST_MESSAGE_MAX } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf, type BookingError } from "@/lib/booking-client";
import { firebase } from "@/lib/firebase/client";

/** Demande de participation (expérience « sur demande ») : rien n'est payé ni bloqué à ce stade. */
export function RequestForm({ sessionId, maxSeats, messageRequired }: { sessionId: string; maxSeats: number; messageRequired: boolean }) {
  const t = useTranslations("request");
  const tb = useTranslations("booking");
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [message, setMessage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageRequired && !message.trim()) return setFieldErrors({ message: t("messageRequired") });
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await authReady();
      const user = firebase().auth.currentUser;
      if (user && !user.emailVerified) {
        await user.reload();
        if (user.emailVerified) await user.getIdToken(true);
      }
      await httpsCallable(firebase().functions, "requestBooking")({ sessionId, seats, message: message.trim(), instagram: instagram.trim() });
      router.refresh();
    } catch (err) {
      const issues = (err as { details?: { issues?: { path: string; message: string }[] } }).details?.issues ?? [];
      if (issues.length) {
        setFieldErrors(Object.fromEntries(issues.map((i) => [i.path, i.path === "instagram" ? t("instagramInvalid") : i.path === "message" && i.message === "required" ? t("messageRequired") : t("tooLong")])));
      } else {
        const reason = (err as { details?: { reason?: string } }).details?.reason;
        setError(reason === "already_requested" || reason === "request_declined" ? t(`errors.${reason}`) : tb(`errors.${bookingErrorOf(err) as BookingError}`));
      }
      setBusy(false);
    }
  };

  const input = "w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] focus:border-plum-700 focus:outline-none";
  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card" noValidate>
      {maxSeats > 1 && (
        <div className="flex items-center justify-between">
          <span id="req-seats" className="font-medium text-ink">{tb("seatsLabel")}</span>
          <div className="flex items-center gap-3" role="group" aria-labelledby="req-seats">
            <button type="button" onClick={() => setSeats((n) => Math.max(1, n - 1))} disabled={seats <= 1 || busy} aria-label={tb("fewer")} className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-40">
              <Minus className="size-4" aria-hidden />
            </button>
            <output aria-live="polite" className="w-6 text-center text-lg font-semibold">{seats}</output>
            <button type="button" onClick={() => setSeats((n) => Math.min(maxSeats, n + 1))} disabled={seats >= maxSeats || busy} aria-label={tb("more")} className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-40">
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
      <div>
        <label htmlFor="req-message" className="mb-1 block text-sm font-medium text-ink">
          {t("messageLabel")} {!messageRequired && <span className="font-normal text-muted">({t("optional")})</span>}
        </label>
        <textarea
          id="req-message"
          rows={4}
          maxLength={REQUEST_MESSAGE_MAX}
          value={message}
          onChange={(e) => { setMessage(e.target.value); setFieldErrors((f) => ({ ...f, message: "" })); }}
          placeholder={t("messagePlaceholder")}
          aria-invalid={Boolean(fieldErrors.message)}
          className={input}
        />
        <p className="mt-1 text-end text-xs text-muted">{message.length}/{REQUEST_MESSAGE_MAX}</p>
        {fieldErrors.message && <p className="text-sm text-red-800">{fieldErrors.message}</p>}
      </div>
      <div>
        <label htmlFor="req-instagram" className="mb-1 block text-sm font-medium text-ink">
          {t("instagramLabel")} <span className="font-normal text-muted">({t("optional")})</span>
        </label>
        <input id="req-instagram" dir="ltr" value={instagram} onChange={(e) => { setInstagram(e.target.value); setFieldErrors((f) => ({ ...f, instagram: "" })); }} placeholder="@pseudo" autoComplete="off" aria-invalid={Boolean(fieldErrors.instagram)} className={input} />
        <p className="mt-1 text-xs text-muted">{t("instagramHint")}</p>
        {fieldErrors.instagram && <p className="text-sm text-red-800">{fieldErrors.instagram}</p>}
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
          <p>{error}</p>
          {error === tb("errors.signin") && (
            <Link href={`/connexion?suite=${encodeURIComponent(`/reserver/${sessionId}`)}`} className="mt-1 inline-block font-semibold underline">{tb("signInCta")}</Link>
          )}
        </div>
      )}
      <button type="submit" disabled={busy} className="w-full rounded-full bg-plum-900 px-6 py-4 font-semibold text-white shadow-card hover:bg-plum-800 disabled:opacity-60">
        {busy ? tb("working") : t("submit")}
      </button>
      <p className="text-center text-xs text-muted">{t("noPaymentYet")}</p>
    </form>
  );
}

/** Retirer sa demande tant que l'équipe ne l'a pas traitée (confirmation dans la page, sans fenêtre système). */
export function CancelRequestButton({ requestId }: { requestId: string }) {
  const t = useTranslations("request");
  const tb = useTranslations("booking");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-cream">
        {t("cancel")}
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label={t("cancelConfirm")} className="space-y-3 rounded-2xl border border-line bg-cream/70 p-4">
      <p className="text-sm font-medium text-ink">{t("cancelConfirm")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFailed(false);
            try {
              await authReady();
              await httpsCallable(firebase().functions, "cancelBookingRequest")({ requestId });
            } catch {
              setFailed(true);
            }
            setBusy(false);
            router.refresh();
          }}
          className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? tb("working") : t("cancelYes")}
        </button>
        <button type="button" disabled={busy} onClick={() => setAsking(false)} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">
          {tb("confirmKeepRequest")}
        </button>
      </div>
      {failed && <p role="alert" className="text-sm text-red-800">{tb("errors.generic")}</p>}
    </div>
  );
}
