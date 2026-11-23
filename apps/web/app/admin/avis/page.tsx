import { REVIEW_HISTORY_LABELS, REVIEW_REPORT_LABELS, type ReviewHistoryAction, type ReviewReportReason } from "@thecommunity/shared";
import { Fragment } from "react";
import Link from "next/link";
import { ReviewActions } from "@/components/admin/review-actions";
import { PrivatePhoto, ReviewModeration } from "@/components/admin/review-moderation";
import { adminDate, Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { ReviewReplyForm } from "@/components/reviews/review-reply-form";
import { Stars } from "@/components/ui";
import { getAdminData } from "@/lib/data/admin";
import { getAdminReviews } from "@/lib/data/admin-reviews";

export const metadata = { title: "Avis" };

const VIEWS = { tous: "Tous", attente: "À valider", signales: "Signalés", photos: "Photos à vérifier" } as const;
const BY = { member: "membre", organizer: "organisateur", team: "équipe", system: "système" } as Record<string, string>;

/** Avis : lecture et modération (masquer), signalements, photos à vérifier, réponse de l'équipe, historique (24). */
export default async function ReviewsAdminPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const view = vue === "signales" || vue === "photos" || vue === "attente" ? vue : "tous";
  const [{ reviews, isDemo }, d] = await Promise.all([getAdminReviews(), getAdminData()]);
  const published = reviews.filter((r) => r.status === "published");
  const avg = published.length ? published.reduce((a, r) => a + r.rating, 0) / published.length : 0;
  const reported = reviews.filter((r) => (r.reportsOpen ?? 0) > 0);
  const photos = reviews.filter((r) => r.photo?.status === "pending");
  // Audit 23/11 : file de modération (note basse ou mot sensible), à traiter avant publication.
  const waiting = reviews.filter((r) => r.status === "pending");
  const shown = view === "signales" ? reported : view === "photos" ? photos : view === "attente" ? waiting : reviews;
  const counts = { tous: reviews.length, attente: waiting.length, signales: reported.length, photos: photos.length };
  return (
    <>
      <PageHeader title="Avis" subtitle={`${reviews.length} avis · moyenne ${avg.toFixed(1)} / 5${isDemo ? " · démonstration" : ""}`} />
      <nav aria-label="Filtrer les avis" className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
          <Link key={k} href={k === "tous" ? "/admin/avis" : `/admin/avis?vue=${k}`} aria-current={view === k ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 text-sm ${view === k ? "bg-brand-900 font-semibold text-white" : "bg-white text-ink"}`}>
            {VIEWS[k]} ({counts[k]})
          </Link>
        ))}
      </nav>
      <Card>
        <Table head={["Date", "Expérience", "Note", "Avis", "Auteur", "Statut", ""]} caption="Avis">
          {shown.map((r) => {
            const e = d.experiences.get(r.experienceId);
            const needsPanel = (r.reportsOpen ?? 0) > 0 || r.photo?.status === "pending" || r.history.length > 0 || r.status === "published";
            return (
              <Fragment key={r.id}>
                <tr data-testid="admin-review">
                  <td className="whitespace-nowrap text-muted">{adminDate(r.createdAt, false)}</td>
                  <td>{e ? <Link href={`/admin/experiences/${e.id}`} className="font-medium text-ink hover:text-brand-900">{e.title.fr}</Link> : "—"}</td>
                  <td><Stars value={r.rating} /></td>
                  <td className="max-w-md text-sm text-ink/85">{r.comment || <span className="text-muted">—</span>}</td>
                  <td className="whitespace-nowrap">{r.publicName}</td>
                  <td className="space-y-1">
                    <Badge tone={r.status === "published" ? "green" : r.status === "pending" ? "amber" : "red"}>{r.status === "published" ? "Publié" : r.status === "pending" ? "À valider" : "Masqué"}</Badge>
                    {r.status === "pending" && r.moderation && <div className="text-xs text-muted">{r.moderation.why === "low_rating" ? "Note basse" : `Mot sensible : ${r.moderation.word === "phone" ? "numéro de téléphone" : r.moderation.word}`}</div>}
                    {(r.reportsOpen ?? 0) > 0 && <div><Badge tone="amber">Signalé ({r.reportsOpen})</Badge></div>}
                    {r.photo?.status === "pending" && <div><Badge tone="amber">Photo à vérifier</Badge></div>}
                    {r.reply && <div><Badge tone="gray">Réponse</Badge></div>}
                  </td>
                  <td>{isDemo ? null : <ReviewActions reviewId={r.id} status={r.status ?? "published"} />}</td>
                </tr>
                {needsPanel && (
                  <tr className="bg-cream/40">
                    <td colSpan={7}>
                      <details open={(r.reportsOpen ?? 0) > 0 || r.photo?.status === "pending"} data-testid="review-panel">
                        <summary className="cursor-pointer text-sm font-medium text-brand-900">Suivi : signalements, photo, réponse, historique</summary>
                        <div className="mt-3 grid gap-4 lg:grid-cols-2">
                          <div className="space-y-3">
                            {r.openReports.length > 0 && (
                              <ul className="space-y-1 text-sm" aria-label="Signalements à traiter">
                                {r.openReports.map((x, i) => (
                                  <li key={i}><strong>{REVIEW_REPORT_LABELS[x.reason as ReviewReportReason] ?? x.reason}</strong>{x.byOrganizer ? " (par l'organisateur)" : ""}{x.message ? ` — « ${x.message} »` : ""}</li>
                                ))}
                              </ul>
                            )}
                            {r.photo?.status === "pending" && <PrivatePhoto path={r.photo.path} alt={`Photo jointe à l'avis du ${adminDate(r.createdAt, false)}`} />}
                            {((r.reportsOpen ?? 0) > 0 || r.photo?.status === "pending") && <ReviewModeration reviewId={r.id} reportsOpen={r.reportsOpen ?? 0} photoPending={r.photo?.status === "pending"} live={!isDemo} />}
                            {r.reply && <p className="text-sm"><strong>Réponse de {r.reply.authorName} :</strong> {r.reply.text}</p>}
                            {r.status === "published" && <ReviewReplyForm reviewId={r.id} initial={r.reply?.authorRole === "team" ? r.reply.text : ""} live={!isDemo} />}
                          </div>
                          <ol className="space-y-1 text-xs text-muted" aria-label="Historique de modération">
                            {r.history.map((h, i) => (
                              <li key={i}>
                                {adminDate(h.at)} · <span className="font-medium text-ink">{REVIEW_HISTORY_LABELS[h.action as ReviewHistoryAction] ?? h.action}</span> ({h.byName ?? BY[h.byRole] ?? h.byRole}){h.note ? ` — ${h.note}` : ""}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </details>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </Table>
        <p className="mt-3 text-xs text-muted">
          Un avis masqué n&apos;apparaît plus sur la fiche et ne compte plus dans la note moyenne. Un signalement ne masque rien tout seul : l&apos;équipe décide. Chaque action est journalisée et ajoutée à l&apos;historique de l&apos;avis.
        </p>
      </Card>
    </>
  );
}
