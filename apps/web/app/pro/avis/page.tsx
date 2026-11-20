import { organizerRating } from "@thecommunity/shared";
import { NextIntlClientProvider } from "next-intl";
import fr from "@/messages/fr.json";
import { adminDate, Card, PageHeader } from "@/components/admin/ui";
import { ReportReviewButton } from "@/components/reviews/report-review-button";
import { ReviewReplyForm } from "@/components/reviews/review-reply-form";
import { Stars } from "@/components/ui";
import { getProData, getProReviews, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Avis" };

/** Étape 24 — avis sur les activités de l'organisateur : note globale, réponse publique, signalement à l'équipe. */
export default async function ProReviewsPage() {
  const space = await requireApprovedOrganizer();
  const d = await getProData(space.organizer.id);
  const reviews = await getProReviews(d.experiences);
  const { avg, count } = organizerRating(d.experiences.filter((e) => e.status === "published" || !e.status));
  return (
    <>
      <PageHeader
        title="Avis"
        subtitle="Répondez publiquement aux avis sur vos activités. Un avis qui vous semble abusif (insultes, faux, données personnelles) : signalez-le, l'équipe vérifie."
      />
      <Card className="mb-6">
        <p className="flex flex-wrap items-center gap-2 text-sm" data-testid="pro-rating">
          <span className="font-display text-3xl text-plum-900">{count ? avg.toFixed(1) : "—"}</span>
          {count > 0 && <Stars value={avg} />}
          <span className="text-muted">{count ? `sur 5 · ${count} avis sur l'ensemble de vos activités` : "Pas encore d'avis."}</span>
        </p>
      </Card>
      {reviews.length === 0 ? (
        <Card><p className="text-sm text-muted">Les avis arrivent ici après vos activités (les participants peuvent en laisser un pendant 60 jours).</p></Card>
      ) : (
        // Le bouton « Signaler » vient du site public (traduit) : l'espace organisateur est en français.
        <NextIntlClientProvider locale="fr" messages={{ reviewsPublic: fr.reviewsPublic }}>
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white p-5 shadow-card" data-testid="pro-review">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{r.publicName} · <span className="font-normal text-muted">{r.title}</span></p>
                <Stars value={r.rating} />
              </div>
              <p className="text-xs text-muted">{adminDate(r.createdAt, false)}</p>
              {r.comment && <p className="mt-2 text-[15px] text-ink/90">« {r.comment} »</p>}
              {r.reply?.text && (
                <div className="mt-3 rounded-xl bg-plum-50 px-4 py-3 text-sm" data-testid="pro-review-reply">
                  <p className="font-semibold text-plum-900">Réponse de {r.reply.authorName}</p>
                  <p className="mt-1 whitespace-pre-line text-ink/85">{r.reply.text}</p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-start gap-4">
                <ReviewReplyForm reviewId={r.id} initial={r.reply?.authorRole === "organizer" ? r.reply.text : ""} live={!space.isDemo} />
                <ReportReviewButton reviewId={r.id} />
              </div>
            </li>
          ))}
        </ul>
        </NextIntlClientProvider>
      )}
    </>
  );
}
