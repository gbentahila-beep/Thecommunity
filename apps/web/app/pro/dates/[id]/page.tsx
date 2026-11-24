import { notFound } from "next/navigation";
import { CancellationRequest } from "@/components/pro/org-requests";
import { adminDate, Badge, Card, FillBar, PageHeader, Table } from "@/components/admin/ui";
import { RESERVATION_STATUS } from "@/components/admin/labels";
import { CheckInButtons } from "@/components/pro/checkin-buttons";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Participants" };

/** Participants d'une date : pointage et téléphone ; l'annulation se demande à l'équipe (lot O, docs/26). */
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
  return (
    <>
      <PageHeader title={s.title} subtitle={adminDate(s.startAt)} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs text-muted">Places</p><FillBar value={s.seatsConfirmed} max={s.capacity} /></Card>
        <Card><p className="text-xs text-muted">Liste d&apos;attente</p><p className="text-lg font-semibold">{s.waitlistCount}</p></Card>
        <Card><p className="text-xs text-muted">Présents</p><p className="text-lg font-semibold">{people.filter((r) => r.status === "attended").length} / {people.length}</p></Card>
      </div>
      <Card title="Participants">
        {people.length === 0 ? (
          <p className="text-sm text-muted">Aucune réservation pour cette date.</p>
        ) : (
          <Table head={["Billet", "Participant", "Téléphone", "Places", "Statut", "Régime / allergies", "Pointage"]}>
            {people.map((r) => {
              const st = RESERVATION_STATUS[r.status as keyof typeof RESERVATION_STATUS] ?? [r.status, "gray"];
              return (
                <tr key={r.id} data-testid="pro-participant">
                  <td className="font-mono text-xs">{r.code}</td>
                  <td className="font-medium text-ink">{r.participant}{r.arrived && <span className="ms-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Arrivé·e (appli)</span>}</td>
                  <td className="whitespace-nowrap text-sm">{r.phone ? <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="text-brand-900 underline">{r.phone}</a> : "—"}</td>
                  <td>{r.seats}</td>
                  <td><Badge tone={st[1]}>{st[0]}</Badge></td>
                  <td className="text-xs text-muted">{[r.diet, r.allergies].filter(Boolean).join(" · ") || "—"}</td>
                  <td><CheckInButtons reservationId={r.id} status={r.status} live={!space.isDemo} canCheckIn={canCheckIn} /></td>
                </tr>
              );
            })}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">Téléphone : pour joindre les inscrits le jour J seulement (jusqu&apos;à 7 jours après la date) ; ne l&apos;utilisez pas pour d&apos;autres messages. Régime et allergies : affichés seulement si la personne a accepté qu&apos;ils soient transmis au lieu.</p>
      </Card>
      {isFuture && s.status !== "cancelled" && (
        <Card title="Annuler la date" className="mt-5">
          <CancellationRequest sessionId={s.id} participants={active} existing={d.orgRequests.find((r) => r.type === "cancel_session" && r.sessionId === s.id) ?? null} live={!space.isDemo} />
        </Card>
      )}
    </>
  );
}
