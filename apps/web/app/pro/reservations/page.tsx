import Link from "next/link";
import { CsvExportButton } from "@/components/admin/csv-export";
import { RESERVATION_STATUS } from "@/components/admin/labels";
import { adminDate, Badge, Card, dh, PageHeader, Table } from "@/components/admin/ui";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Réservations" };

const PERIODS = { all: "Toutes", upcoming: "À venir", past: "Passées" } as const;

/** Étape 20 — réservations des activités de l'organisateur : filtres activité / statut / période, export CSV. */
export default async function ProReservationsPage({ searchParams }: PageProps<"/pro/reservations">) {
  const sp = await searchParams;
  const space = await requireApprovedOrganizer();
  const d = await getProData(space.organizer.id);
  const exp = typeof sp.activite === "string" && d.experiences.some((e) => e.id === sp.activite) ? sp.activite : "";
  const status = typeof sp.statut === "string" && sp.statut in RESERVATION_STATUS ? sp.statut : "";
  const period = typeof sp.periode === "string" && sp.periode in PERIODS ? (sp.periode as keyof typeof PERIODS) : "all";
  const nowIso = d.now.toISOString();
  const list = d.reservations.filter(
    (r) => (!exp || r.experienceId === exp) && (!status || r.status === status) && (period === "all" || (period === "upcoming" ? r.sessionStartAt >= nowIso : r.sessionStartAt < nowIso)),
  );
  const rows: (string | number)[][] = [
    ["Billet", "Activité", "Date", "Participant", "Places", "Montant (DH)", "Statut", "Réservée le"],
    ...list.map((r) => [r.code, r.title, adminDate(r.sessionStartAt), r.participant, r.seats, (r.total / 100).toFixed(2).replace(".", ","), RESERVATION_STATUS[r.status as keyof typeof RESERVATION_STATUS]?.[0] ?? r.status, adminDate(r.createdAt)]),
  ];
  const select = "rounded-full border border-line bg-white px-3 py-2 text-sm";
  return (
    <>
      <PageHeader title="Réservations" subtitle={`${list.length} réservation${list.length > 1 ? "s" : ""}`} actions={<CsvExportButton filename="reservations.csv" rows={rows} log={space.isDemo ? undefined : { kind: "reservations", targetId: space.organizer.id }} />} />
      <form className="mb-4 flex flex-wrap items-end gap-2" role="search" aria-label="Filtrer les réservations">
        <label className="text-sm"><span className="mb-1 block text-xs text-muted">Activité</span>
          <select name="activite" defaultValue={exp} className={select}>
            <option value="">Toutes</option>
            {d.experiences.map((e) => <option key={e.id} value={e.id}>{e.title.fr}</option>)}
          </select>
        </label>
        <label className="text-sm"><span className="mb-1 block text-xs text-muted">Statut</span>
          <select name="statut" defaultValue={status} className={select}>
            <option value="">Tous</option>
            {Object.entries(RESERVATION_STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm"><span className="mb-1 block text-xs text-muted">Période</span>
          <select name="periode" defaultValue={period} className={select}>
            {Object.entries(PERIODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <button className="rounded-full bg-plum-900 px-5 py-2 text-sm font-semibold text-white">Filtrer</button>
        {(exp || status || period !== "all") && <Link href="/pro/reservations" className="px-2 py-2 text-sm text-muted underline">Effacer</Link>}
      </form>
      <Card>
        {list.length === 0 ? (
          <p className="text-sm text-muted">Aucune réservation ne correspond.</p>
        ) : (
          <Table head={["Billet", "Activité", "Date", "Participant", "Places", "Montant", "Statut"]}>
            {list.map((r) => {
              const st = RESERVATION_STATUS[r.status as keyof typeof RESERVATION_STATUS] ?? [r.status, "gray"];
              return (
                <tr key={r.id} data-testid="pro-reservation">
                  <td className="font-mono text-xs">{r.code}</td>
                  <td className="font-medium text-ink">{r.title}</td>
                  <td className="whitespace-nowrap">{adminDate(r.sessionStartAt)}</td>
                  <td>{r.participant}</td>
                  <td>{r.seats}</td>
                  <td className="tabular-nums">{dh(r.total)}</td>
                  <td><Badge tone={st[1]}>{st[0]}</Badge></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
