import Link from "next/link";
import { ReviewActions } from "@/components/admin/review-actions";
import { adminDate, Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { Stars } from "@/components/ui";
import { getAdminData } from "@/lib/data/admin";
import { getAdminReviews } from "@/lib/data/admin-reviews";

export const metadata = { title: "Avis" };

/** Avis laissés après les expériences : lecture et modération (masquer un avis inapproprié). */
export default async function ReviewsAdminPage() {
  const [{ reviews, isDemo }, d] = await Promise.all([getAdminReviews(), getAdminData()]);
  const published = reviews.filter((r) => r.status === "published");
  const avg = published.length ? published.reduce((a, r) => a + r.rating, 0) / published.length : 0;
  return (
    <>
      <PageHeader
        title="Avis"
        subtitle={`${reviews.length} avis · moyenne ${avg.toFixed(1)} / 5${isDemo ? " · démonstration" : ""}`}
      />
      <Card>
        <Table head={["Date", "Expérience", "Note", "Avis", "Auteur", "Statut", ...(isDemo ? [] : [""])]} caption="Avis">
          {reviews.map((r) => {
            const e = d.experiences.get(r.experienceId);
            return (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-muted">{adminDate(r.createdAt, false)}</td>
                <td>{e ? <Link href={`/admin/experiences/${e.id}`} className="font-medium text-ink hover:text-plum-900">{e.title.fr}</Link> : "—"}</td>
                <td><Stars value={r.rating} /></td>
                <td className="max-w-md text-sm text-ink/85">{r.comment || <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap">{r.publicName}</td>
                <td><Badge tone={r.status === "published" ? "green" : "red"}>{r.status === "published" ? "Publié" : "Masqué"}</Badge></td>
                {!isDemo && <td><ReviewActions reviewId={r.id} status={r.status ?? "published"} /></td>}
              </tr>
            );
          })}
        </Table>
        <p className="mt-3 text-xs text-muted">
          Un avis masqué n&apos;apparaît plus sur la fiche et ne compte plus dans la note moyenne. Chaque action est journalisée.
        </p>
      </Card>
    </>
  );
}
