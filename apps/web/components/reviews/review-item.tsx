import type { Review } from "@thecommunity/shared";
import { getTranslations } from "next-intl/server";
import { MediaImage as Image } from "@/components/media";
import { Stars } from "@/components/ui";
import { formatLongDate } from "@/lib/format";
import { ReportReviewButton } from "./report-review-button";

/** Étape 24 — un avis publié : note, commentaire, photo (seulement si acceptée par l'équipe), réponse, « Signaler ». */
export async function ReviewItem({ review, locale, showReport = true }: { review: Review; locale: string; showReport?: boolean }) {
  const t = await getTranslations("reviewsPublic");
  const photo = review.photo?.status === "approved" && review.photo.path ? review.photo.path : null;
  return (
    <li className="rounded-2xl border border-line bg-white/70 p-5" data-testid="review-item">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-ink">{review.publicName}</span>
        <Stars value={review.rating} />
      </div>
      {review.comment && <p className="mt-2 text-ink/85">{review.comment}</p>}
      {photo && (
        <div className="relative mt-3 h-40 w-56 overflow-hidden rounded-xl" data-testid="review-photo">
          <Image src={photo} alt={t("photoAlt", { name: review.publicName })} fill sizes="224px" className="object-cover" />
        </div>
      )}
      {review.reply?.text && (
        <div className="mt-3 rounded-xl bg-plum-50 px-4 py-3" data-testid="review-reply">
          <p className="text-sm font-semibold text-plum-900">
            {t("replyFrom", { name: review.reply.authorName })}
            {review.reply.at && <span className="font-normal text-muted"> · {formatLongDate(review.reply.at, locale)}</span>}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink/85">{review.reply.text}</p>
        </div>
      )}
      {showReport && <ReportReviewButton reviewId={review.id} />}
    </li>
  );
}
