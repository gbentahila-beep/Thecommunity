"use client";

import { REVIEW_COMMENT_MAX, REVIEW_DETAIL_KEYS, REVIEW_PHOTO_MAX_MB, type ReviewDetailKey } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authReady } from "@/lib/booking-client";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Avis après l'expérience : note de 1 à 5 et commentaire facultatif. Publié sur la fiche de l'expérience. */
export function ReviewForm({ reservationId }: { reservationId: string }) {
  const t = useTranslations("reviewForm");
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Étape 24 : photo facultative, publiée seulement une fois acceptée par l'équipe.
  const [photo, setPhoto] = useState<File | null>(null);
  // Questions détaillées, toutes facultatives (page publique « Avis »).
  const [details, setDetails] = useState<Partial<Record<ReviewDetailKey, number>>>({});
  const [comeAgain, setComeAgain] = useState<boolean | null>(null);

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
          let photoPath = "";
          if (photo && FIREBASE_ENABLED) {
            const uid = firebase().auth.currentUser?.uid;
            const safe = photo.name.normalize("NFD").replace(/[^\w.-]+/g, "-").slice(-80) || "photo.jpg";
            photoPath = `review-uploads/${uid}/${Date.now().toString(36)}-${safe}`;
            await uploadBytes(ref(firebase().storage, photoPath), photo, { contentType: photo.type });
          }
          await httpsCallable(firebase().functions, "submitReview")({
            reservationId,
            rating,
            comment: comment.trim(),
            ...(photoPath ? { photoPath } : {}),
            ...(Object.keys(details).length ? { details } : {}),
            ...(comeAgain !== null ? { comeAgain } : {}),
          });
          router.refresh();
        } catch (err) {
          const reason = (err as { details?: { reason?: string } }).details?.reason;
          setError(reason === "already_reviewed" || reason === "not_reviewable" || reason === "invalid_photo" ? t(`errors.${reason}`) : t("errors.generic"));
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
      <fieldset className="rounded-2xl bg-cream/70 p-4">
        <legend className="text-sm font-medium text-ink">{t("detailsLabel")} <span className="font-normal text-muted">({t("optional")})</span></legend>
        <div className="mt-2 space-y-2">
          {REVIEW_DETAIL_KEYS.map((k) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ink/85">{t(`detail_${k}`)}</span>
              <div className="flex" role="group" aria-label={t(`detail_${k}`)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-pressed={details[k] === n} aria-label={`${t(`detail_${k}`)} : ${t("stars", { count: n })}`} onClick={() => setDetails((d) => ({ ...d, [k]: d[k] === n ? undefined : n }))} className="p-0.5 text-plum-700">
                    <Star className={`size-6 ${n <= (details[k] ?? 0) ? "fill-current" : "text-plum-200"}`} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-sm text-ink/85">{t("comeAgain")}</span>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" aria-pressed={comeAgain === v} onClick={() => setComeAgain((c) => (c === v ? null : v))} className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${comeAgain === v ? "bg-plum-900 text-white ring-plum-900" : "bg-white text-ink ring-line"}`}>
                  {v ? t("yes") : t("no")}
                </button>
              ))}
            </div>
          </div>
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
      <div>
        <label htmlFor={`review-photo-${reservationId}`} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-plum-900">
          <ImagePlus className="size-4" aria-hidden />
          {photo ? t("photoChange") : t("photoAdd")}
        </label>
        <input
          id={`review-photo-${reservationId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > REVIEW_PHOTO_MAX_MB * 1024 * 1024)) {
              setPhoto(null);
              return setError(t("photoInvalid", { mb: REVIEW_PHOTO_MAX_MB }));
            }
            setError(null);
            setPhoto(f);
          }}
        />
        {photo && <p className="mt-1 text-sm text-ink/80" data-testid="review-photo-name">{photo.name}</p>}
        <p className="mt-1 text-xs text-muted">{t("photoNote")}</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
        {busy ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
