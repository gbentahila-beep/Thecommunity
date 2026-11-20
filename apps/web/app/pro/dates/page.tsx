import Link from "next/link";
import { adminDate, Badge, Card, FillBar, PageHeader, Table } from "@/components/admin/ui";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Dates" };

const STATUS: Record<string, [string, "green" | "gray" | "amber" | "red"]> = {
  published: ["Ouverte", "green"],
  full: ["Complète", "amber"],
  draft: ["En attente de publication", "gray"],
  cancelled: ["Annulée", "red"],
  completed: ["Terminée", "gray"],
};

/** Étape 20 — dates à venir et récentes des activités de l'organisateur. */
export default async function ProDatesPage({ searchParams }: PageProps<"/pro/dates">) {
  const sp = await searchParams;
  const past = sp.vue === "passees";
  const { organizer } = await requireApprovedOrganizer();
  const d = await getProData(organizer.id);
  const nowIso = d.now.toISOString();
  const list = past ? d.sessions.filter((s) => s.startAt < nowIso).reverse() : d.sessions.filter((s) => s.startAt >= nowIso);
  return (
    <>
      <PageHeader title="Dates" subtitle="Ajoutez des dates depuis la fiche de chaque activité (section « Dates »)." />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/pro/dates" aria-current={!past ? "page" : undefined} className={`rounded-full px-4 py-1.5 font-medium ${!past ? "bg-plum-900 text-white" : "bg-white text-ink"}`}>À venir</Link>
        <Link href="/pro/dates?vue=passees" aria-current={past ? "page" : undefined} className={`rounded-full px-4 py-1.5 font-medium ${past ? "bg-plum-900 text-white" : "bg-white text-ink"}`}>Passées</Link>
      </div>
      <Card>
        {list.length === 0 ? (
          <p className="text-sm text-muted">{past ? "Aucune date passée." : "Aucune date à venir."}</p>
        ) : (
          <Table head={["Date", "Activité", "Remplissage", "Attente", "Statut", ""]}>
            {list.map((s) => {
              const st = STATUS[s.status] ?? [s.status, "gray"];
              return (
                <tr key={s.id} data-testid="pro-session">
                  <td className="whitespace-nowrap">{adminDate(s.startAt)}</td>
                  <td className="font-medium text-ink">{s.title}</td>
                  <td className="w-44"><FillBar value={s.seatsConfirmed} max={s.capacity} /></td>
                  <td>{s.waitlistCount || "—"}</td>
                  <td><Badge tone={st[1]}>{st[0]}</Badge></td>
                  <td className="text-end"><Link href={`/pro/dates/${s.id}`} className="font-semibold text-plum-900">Participants</Link></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
