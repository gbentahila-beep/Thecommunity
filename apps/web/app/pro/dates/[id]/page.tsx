import { notFound } from "next/navigation";
import { CsvExportButton } from "@/components/admin/csv-export";
import { CancelSessionButton } from "@/components/admin/reservation-admin-actions";
import { adminDate, Badge, Card, FillBar, PageHeader, Table } from "@/components/admin/ui";
import { RESERVATION_STATUS } from "@/components/admin/labels";
import { CheckInButtons } from "@/components/pro/checkin-buttons";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Participants" };

/** Étape 20 — participants d'une date : pointage, export, annulation de la date (remboursement intégral). */
export default async function ProSessionPage({ params }: PageProps<"/pro/dates/[id]">) {
  const { id } = await params;
  const space = await requireApprovedOrganizer();
  const d = await getProData(space.organizer.id);
  const s = d.sessions.find((x) => x.id === id);
  if (!s) notFound();
  const people = d.reservations.filter((r) => r.sessionId === id && ["confirmed", "attended", "no_show", "pending_payment"].includes(r.status));
  const active = people.filter((r) => ["confirmed", "pending_payment"].includes(r.status)).length;
  const canCheckIn = new Date(s.startAt).getTime() - d.now.getTime() <= 3 * 3_600_000;
  const isFuture = s.startAt >= d.now.toISOString();
  const rows: (string | number)[][] = [
    ["Billet", "Participant", "Places", "Statut", "Régime", "Allergies"],
    ...people.map((r) => [r.code, r.participant, r.seats, RESERVATION_STATUS[r.status as keyof typeof RESERVATION_STATUS]?.[0] ?? r.status, r.diet ?? "", r.allergies ?? ""]),
  ];
  return (
    <>
      <PageHeader title={s.title} subtitle={adminDate(s.startAt)} actions={<CsvExportButton filename={`participants-${id}.csv`} rows={rows} label="Exporter la liste" log={space.isDemo ? undefined : { kind: "participants", targetId: id }} />} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs text-muted">Places</p><FillBar value={s.seatsConfirmed} max={s.capacity} /></Card>
        <Card><p className="text-xs text-muted">Liste d&apos;attente</p><p className="text-lg font-semibold">{s.waitlistCount}</p></Card>
        <Card><p className="text-xs text-muted">Présents</p><p className="text-lg font-semibold">{people.filter((r) => r.status === "attended").length} / {people.length}</p></Card>
      </div>
      <Card title="Participants">
        {people.length === 0 ? (
          <p className="text-sm text-muted">Aucune réservation pour cette date.</p>
        ) : (
          <Table head={["Billet", "Participant", "Places", "Statut", "Régime / allergies", "Pointage"]}>
            {people.map((r) => {
              const st = RESERVATION_STATUS[r.status as keyof typeof RESERVATION_STATUS] ?? [r.status, "gray"];
              return (
                <tr key={r.id} data-testid="pro-participant">
                  <td className="font-mono text-xs">{r.code}</td>
                  <td className="font-medium text-ink">{r.participant}</td>
                  <td>{r.seats}</td>
                  <td><Badge tone={st[1]}>{st[0]}</Badge></td>
                  <td className="text-xs text-muted">{[r.diet, r.allergies].filter(Boolean).join(" · ") || "—"}</td>
                  <td><CheckInButtons reservationId={r.id} status={r.status} live={!space.isDemo} canCheckIn={canCheckIn} /></td>
                </tr>
              );
            })}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">Régime et allergies : affichés seulement si la personne a accepté qu&apos;ils soient transmis au lieu.</p>
      </Card>
      {isFuture && s.status !== "cancelled" && (
        <Card title="Annuler la date" className="mt-5">
          <p className="mb-3 text-sm text-muted">Météo, lieu indisponible, nombre minimum non atteint : chaque participant est remboursé intégralement et prévenu.</p>
          {space.isDemo ? <p className="text-sm text-muted">Démonstration : action désactivée.</p> : <CancelSessionButton sessionId={s.id} participants={active} />}
        </Card>
      )}
    </>
  );
}
