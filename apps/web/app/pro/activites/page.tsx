import Link from "next/link";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { MediaImage as Image } from "@/components/media";
import { requireApprovedOrganizer, getProData } from "@/lib/data/organizer";
import { EXPERIENCE_STATUS_PRO } from "@/lib/pro-forms";

export const metadata = { title: "Mes activités" };

/** Étape 20 — activités de l'organisateur, avec leur statut de relecture. */
export default async function ProActivitiesPage() {
  const { organizer } = await requireApprovedOrganizer();
  const d = await getProData(organizer.id);
  const nowIso = d.now.toISOString();
  return (
    <>
      <PageHeader
        title="Mes activités"
        subtitle="Brouillon → envoyée pour validation → en ligne. L'équipe relit chaque nouvelle activité."
        actions={<Link href="/pro/activites/nouvelle" className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouvelle activité</Link>}
      />
      {d.experiences.length === 0 ? (
        <Card><p className="text-sm text-muted">Aucune activité pour l&apos;instant. Créez la première : titre, description, lieu, prix et dates.</p></Card>
      ) : (
        <Card>
          <Table head={["", "Activité", "Statut", "Prochaine date", "Réservations", ""]}>
            {d.experiences.map((e) => {
              const st = EXPERIENCE_STATUS_PRO[e.status] ?? { label: e.status, tone: "gray" as const };
              const next = d.sessions.find((s) => s.experienceId === e.id && s.startAt >= nowIso && s.status !== "cancelled");
              const bookings = d.reservations.filter((r) => r.experienceId === e.id && ["confirmed", "attended", "no_show"].includes(r.status)).length;
              return (
                <tr key={e.id} data-testid="pro-activity">
                  <td className="w-16">{e.images[0] ? <Image src={e.images[0].path} alt="" width={56} height={40} className="h-10 w-14 rounded-lg object-cover" /> : null}</td>
                  <td className="font-medium text-ink">{e.title.fr}{(e as { revisionPending?: boolean }).revisionPending ? <span className="ms-2 text-xs text-amber-800">modifications en attente de validation</span> : null}</td>
                  <td><Badge tone={st.tone}>{st.label}</Badge></td>
                  <td className="text-muted">{next ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(next.startAt)) : "—"}</td>
                  <td>{bookings}</td>
                  <td className="text-end"><Link href={`/pro/activites/${e.id}`} className="font-semibold text-brand-900">Modifier</Link></td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}
    </>
  );
}
