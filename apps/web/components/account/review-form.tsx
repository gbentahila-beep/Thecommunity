"use client";

import { REVIEW_COMMENT_MAX } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authReady } from "@/lib/booking-client";
import { firebase } from "@/lib/firebase/client";

/** Avis après l'expérience : note de 1 à 5 et commentaire facultatif. Publié sur la fiche de l'expérience. */
export function ReviewForm({ reservationId }: { reservationId: string }) {
  const t = useTranslations("reviewForm");
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setError(t("pickRating"));
        setBusy(true);
        setError(null);
        try {
          await authReady();
          await httpsCallable(firebase().functions, "submitReview")({ reservationId, rating, comment: comment.trim() });
          router.refresh();
        } catch (err) {
          const reason = (err as { details?: { reason?: string } }).details?.reason;
          setError(reason === "already_reviewed" || reason === "not_reviewable" ? t(`errors.${reason}`) : t("errors.generic"));
          setBusy(false);
        }
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">{t("ratingLabel")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setRating(n);
                setError(null);
              }}
              aria-pressed={rating === n}
              aria-label={t("stars", { count: n })}
              className="rounded-lg p-1 text-plum-700 focus-visible:outline-2 focus-visible:outline-plum-700"
            >
              <Star className={`size-8 ${n <= rating ? "fill-current" : "text-plum-200"}`} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`review-${reservationId}`} className="mb-1 block text-sm font-medium text-ink">
          {t("commentLabel")} <span className="font-normal text-muted">({t("optional")})</span>
        </label>
        <textarea
          id={`review-${reservationId}`}
          rows={4}
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] focus:border-plum-700 focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">{t("publicNote")}</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-full bg-plum-900 px-6 py-3 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
        {busy ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
