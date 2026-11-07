import Link from "next/link";
import { CsvExportButton } from "@/components/admin/csv-export";
import { RESERVATION_STATUS } from "@/components/admin/labels";
import { adminDate, Badge, Card, dh, PageHeader, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Réservations" };

export default async function ReservationsAdminPage({ searchParams }: PageProps<"/admin/reservations">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const statut = typeof sp.statut === "string" && sp.statut in RESERVATION_STATUS ? (sp.statut as keyof typeof RESERVATION_STATUS) : "";
  const d = await getAdminData();
  const rows = d.reservations
    .map((r) => ({ r, u: d.usersById.get(r.userId)!, e: d.experiences.get(r.experienceId)!, s: d.sessions.find((x) => x.id === r.sessionId)! }))
    .filter(({ r, u, e }) => (!statut || r.status === statut) && (!q || [r.id, u.email, `${u.firstName} ${u.lastName}`, e.title.fr].some((x) => x.toLowerCase().includes(q))))
    .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt));
  const csv = [["Réservation", "Créée le", "Participant", "E-mail", "Expérience", "Session", "Places", "Montant (DH)", "Code promo", "Statut"], ...rows.map(({ r, u, e, s }) => [r.id, r.createdAt, `${u.firstName} ${u.lastName}`, u.email, e.title.fr, s.startAt, r.seats, (r.total / 100).toFixed(2), r.promoCode ?? "", RESERVATION_STATUS[r.status][0]])];
  return (
    <>
      <PageHeader title="Réservations" subtitle={`${rows.length} résultat${rows.length > 1 ? "s" : ""}`} actions={<CsvExportButton filename="reservations.csv" rows={csv} />} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="q">Rechercher</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nom, e-mail, n° de réservation, expérience…" className="min-w-64 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm" />
        <label className="sr-only" htmlFor="statut">Statut</label>
        <select id="statut" name="statut" defaultValue={statut} className="rounded-full border border-line bg-white px-4 py-2.5 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(RESERVATION_STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">Filtrer</button>
        {(q || statut) && <Link href="/admin/reservations" className="self-center text-sm text-muted underline">Effacer</Link>}
      </form>
      <Card>
        <Table head={["N°", "Créée", "Participant", "Expérience · session", "Places", "Montant", "Statut"]} caption="Réservations">
          {rows.slice(0, 200).map(({ r, u, e, s }) => (
            <tr key={r.id}>
              <td className="font-mono text-xs">{r.id}</td>
              <td className="whitespace-nowrap text-muted">{adminDate(r.createdAt, false)}</td>
              <td><span className="block font-medium text-ink">{u.firstName} {u.lastName}</span><span className="text-xs text-muted">{u.email}</span></td>
              <td><Link href={`/admin/sessions/${s.id}`} className="hover:text-plum-900">{e.title.fr}</Link><span className="block text-xs text-muted">{adminDate(s.startAt)}</span></td>
              <td className="tabular-nums">{r.seats}</td>
              <td className="tabular-nums">{dh(r.total)}{r.promoCode && <span className="block text-xs text-muted">{r.promoCode}</span>}</td>
              <td><Badge tone={RESERVATION_STATUS[r.status][1]}>{RESERVATION_STATUS[r.status][0]}</Badge></td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-muted">Annuler, rembourser ou déplacer une réservation : actions serveur sécurisées et journalisées en phase 4.</p>
      </Card>
    </>
  );
}
