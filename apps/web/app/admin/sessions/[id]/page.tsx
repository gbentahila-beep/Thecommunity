import { ageBand, ageOn, seatsAvailable } from "@thecommunity/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CsvExportButton } from "@/components/admin/csv-export";
import { LANGUAGE_LABELS, MODE_LABELS, RESERVATION_STATUS } from "@/components/admin/labels";
import { adminDate, Badge, Card, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Participants" };

export default async function SessionDetailPage({ params }: PageProps<"/admin/sessions/[id]">) {
  const { id } = await params;
  const d = await getAdminData();
  const s = d.sessions.find((x) => x.id === id);
  if (!s) notFound();
  const e = d.experiences.get(s.experienceId)!;
  const rows = d.reservations
    .filter((r) => r.sessionId === s.id)
    .map((r) => ({ r, u: d.usersById.get(r.userId)! }))
    .sort((a, b) => a.u.lastName.localeCompare(b.u.lastName));
  const confirmed = rows.filter((x) => x.r.status === "confirmed");
  const waitlist = (d.waitlists[s.id] ?? []).map((uid) => d.usersById.get(uid)!);
  const grouped = e.bookingMode === "social_dinner" || e.bookingMode === "group";
  const csv: (string | number)[][] = [
    ["Prénom", "Nom", "E-mail", "Téléphone", "Tranche d'âge", "Langues", "Places", "Montant (DH)", "Statut", "Réservation"],
    ...rows.map(({ r, u }) => [u.firstName, u.lastName, u.email, u.phone, ageBand(ageOn(u.birthDate)), u.languages.join(", "), r.seats, (r.total / 100).toFixed(2), RESERVATION_STATUS[r.status][0], r.id]),
  ];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/sessions" className="text-plum-900">← Sessions</Link></p>
      <PageHeader
        title={e.title.fr}
        subtitle={`${adminDate(s.startAt)} · ${e.district} · ${MODE_LABELS[e.bookingMode]}`}
        actions={
          <>
            <CsvExportButton filename={`participants-${s.id}.csv`} rows={csv} />
            {grouped && (
              <Link href={`/admin/sessions/${s.id}/groupes`} className="rounded-full bg-plum-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">
                Composer les groupes
              </Link>
            )}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Places confirmées" value={`${s.seatsConfirmed} / ${s.capacity}`} />
        <StatTile label="Places libres" value={String(seatsAvailable(s))} />
        <StatTile label="Liste d'attente" value={String(waitlist.length)} />
        <StatTile label="Encaissé" value={dh(confirmed.reduce((a, x) => a + x.r.total, 0))} />
      </div>
      <Card title={`Participants (${rows.length} réservations)`} className="mt-6">
        <Table head={["Participant", "Contact", "Âge", "Langues", "Places", "Montant", "Statut"]} caption="Participants">
          {rows.map(({ r, u }) => (
            <tr key={r.id}>
              <td className="font-medium text-ink">
                <Link href={`/admin/utilisateurs?q=${encodeURIComponent(u.email)}`} className="hover:text-plum-900">{u.firstName} {u.lastName}</Link>
              </td>
              <td className="text-muted"><span className="block">{u.email}</span><span className="block tabular-nums">{u.phone}</span></td>
              <td className="tabular-nums">{ageBand(ageOn(u.birthDate))}</td>
              <td>{u.languages.map((l) => LANGUAGE_LABELS[l]).join(" · ")}</td>
              <td className="tabular-nums">{r.seats}</td>
              <td className="tabular-nums">{dh(r.total)}</td>
              <td><Badge tone={RESERVATION_STATUS[r.status][1]}>{RESERVATION_STATUS[r.status][0]}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
      {waitlist.length > 0 && (
        <Card title="Liste d'attente (ordre d'inscription)" className="mt-6">
          <ol className="list-decimal space-y-1 ps-5 text-sm">
            {waitlist.map((u) => <li key={u.uid}>{u.firstName} {u.lastName} <span className="text-muted">· {u.email}</span></li>)}
          </ol>
          <p className="mt-3 text-xs text-muted">Phase 4 : dès qu&apos;une place se libère, la première personne reçoit une offre limitée dans le temps.</p>
        </Card>
      )}
    </>
  );
}
