import Link from "next/link";
import { MODE_LABELS } from "@/components/admin/labels";
import { adminDate, Badge, Card, FillBar, PageHeader, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Sessions" };

const STATUS = { published: ["Publiée", "green"], full: ["Complète", "plum"], draft: ["Brouillon", "gray"], cancelled: ["Annulée", "red"], completed: ["Terminée", "gray"] } as const;

export default async function SessionsPage() {
  const d = await getAdminData();
  return (
    <>
      <PageHeader title="Sessions & groupes" subtitle={`${d.sessions.length} sessions à venir`} />
      {d.recentSessions.length > 0 && (
        <Card title="Commencées ces 3 derniers jours (pointage)" className="mb-6">
          <ul className="divide-y divide-line text-sm">
            {d.recentSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><span className="text-muted">{adminDate(s.startAt)}</span> · <strong className="text-ink">{d.experiences.get(s.experienceId)?.title.fr}</strong></span>
                <Link href={`/admin/sessions/${s.id}`} className="font-medium text-plum-900">Participants et pointage</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <Table head={["Date", "Expérience", "Mode", "Statut", "Remplissage", "Attente", ""]} caption="Sessions à venir">
          {d.sessions.map((s) => {
            const e = d.experiences.get(s.experienceId)!;
            const [label, tone] = STATUS[s.status];
            const grouped = e.bookingMode === "social_dinner" || e.bookingMode === "group";
            return (
              <tr key={s.id}>
                <td className="whitespace-nowrap text-muted">{adminDate(s.startAt)}</td>
                <td className="font-medium text-ink">{e.title.fr}</td>
                <td className="text-muted">{MODE_LABELS[e.bookingMode]}</td>
                <td><Badge tone={tone}>{label}</Badge></td>
                <td><FillBar value={s.seatsConfirmed} max={s.capacity} /></td>
                <td className="tabular-nums">{s.waitlistCount || "—"}</td>
                <td className="whitespace-nowrap text-end">
                  <Link href={`/admin/sessions/${s.id}`} className="font-medium text-plum-900">Participants</Link>
                  {grouped && <> · <Link href={`/admin/sessions/${s.id}/groupes`} className="font-medium text-plum-900">Groupes</Link></>}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
