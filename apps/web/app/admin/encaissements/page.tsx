import { pricingOf, summarizeLedger, type TwoPartLedgerRow } from "@thecommunity/shared";
import Link from "next/link";
import { CsvExportButton } from "@/components/admin/csv-export";
import { adminDate, Card, DemoNote, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "En ligne / sur place" };

const MODEL_LABELS = { online_only: "Tout en ligne", fixed_partner: "Prix fixe sur place", variable_consumption: "Consommation sur place" } as const;
const PERIODS = { tout: "Toutes les dates", "a-venir": "À venir", passees: "Passées" } as const;

/**
 * Étape 11e — suivi de la tarification en deux parts : ce qui est encaissé en ligne, la part fixe attendue
 * et réglée sur place (jamais encaissée par The Host Club), présences, annulations et remboursements.
 */
export default async function TwoPartDashboard({ searchParams }: PageProps<"/admin/encaissements">) {
  const sp = await searchParams;
  const d = await getAdminData();
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const expFilter = one("experience");
  const partnerFilter = one("partenaire");
  const period = (one("periode") in PERIODS ? one("periode") : "tout") as keyof typeof PERIODS;

  const partnerOf = (experienceId: string) => d.economics[experienceId]?.partnerId ?? "";
  const partnerName = (id: string) => d.partners.find((p) => p.id === id)?.name ?? (id ? "Partenaire archivé" : "The Host Club");
  const paid = new Map<string, number>();
  const refunded = new Map<string, number>();
  for (const p of d.payments) {
    if (p.type === "payment" && (p.status === "succeeded" || p.status === "refunded")) paid.set(p.reservationId, (paid.get(p.reservationId) ?? 0) + p.amount);
    if (p.type === "refund" && p.status === "succeeded") refunded.set(p.reservationId, (refunded.get(p.reservationId) ?? 0) + p.amount);
  }

  const reservations = d.reservations.filter((r) => {
    if (expFilter && r.experienceId !== expFilter) return false;
    if (partnerFilter && partnerOf(r.experienceId) !== (partnerFilter === "aucun" ? "" : partnerFilter)) return false;
    const past = new Date(r.sessionStartAt).getTime() < d.now.getTime();
    return period === "tout" || (period === "passees" ? past : !past);
  });
  const ledger = (r: (typeof reservations)[number]): TwoPartLedgerRow => ({
    status: r.status,
    seats: r.seats,
    paidOnline: paid.get(r.id) ?? 0,
    refunded: refunded.get(r.id) ?? 0,
    onSiteAmount: r.onSite?.amount ?? null,
    partnerStatus: r.onSite?.status ?? null,
  });
  const total = summarizeLedger(reservations.map(ledger));

  // Une ligne par date (session).
  const bySession = new Map<string, typeof reservations>();
  for (const r of reservations) bySession.set(r.sessionId, [...(bySession.get(r.sessionId) ?? []), r]);
  const rows = [...bySession.entries()]
    .map(([sessionId, rs]) => {
      const e = d.experiences.get(rs[0].experienceId);
      return { sessionId, startAt: rs[0].sessionStartAt, e, model: e ? pricingOf(e).model : "online_only", partner: partnerName(partnerOf(rs[0].experienceId)), sum: summarizeLedger(rs.map(ledger)) };
    })
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  const experiences = [...d.experiences.values()].sort((a, b) => a.title.fr.localeCompare(b.title.fr));
  const usedPartners = [...new Set([...d.experiences.keys()].map(partnerOf).filter(Boolean))];
  const csv: (string | number)[][] = [
    ["Date", "Expérience", "Partenaire", "Formule", "Réservations valables", "Places", "Présents", "Absents", "Annulations", "Encaissé en ligne (DH)", "Remboursé (DH)", "Net en ligne (DH)", "Sur place attendu (DH)", "Sur place réglé (DH)", "Réservations en consommation libre"],
    ...rows.map((x) => [
      x.startAt, x.e?.title.fr ?? "Expérience supprimée", x.partner, MODEL_LABELS[x.model], x.sum.reservations, x.sum.seats, x.sum.present, x.sum.noShow, x.sum.cancelled,
      (x.sum.paidOnline / 100).toFixed(2), (x.sum.refunded / 100).toFixed(2), (x.sum.netOnline / 100).toFixed(2),
      x.model === "fixed_partner" ? (x.sum.onSiteExpected / 100).toFixed(2) : "", x.model === "fixed_partner" ? (x.sum.onSitePaid / 100).toFixed(2) : "", x.sum.consumptionBookings,
    ]),
  ];
  const select = "rounded-full border border-line bg-white px-4 py-2.5 text-sm";

  return (
    <>
      <PageHeader
        title="En ligne / sur place"
        subtitle="Ce qui est encaissé en ligne (part organisation) et ce qui est réglé sur place au partenaire (jamais encaissé par The Host Club)."
        actions={<CsvExportButton filename="en-ligne-sur-place.csv" rows={csv} log={d.isDemo ? undefined : { kind: "two_part" }} />}
      />
      <form className="mb-4 flex flex-wrap gap-2" aria-label="Filtres">
        <label className="sr-only" htmlFor="experience">Expérience</label>
        <select id="experience" name="experience" defaultValue={expFilter} className={select}>
          <option value="">Toutes les expériences</option>
          {experiences.map((e) => <option key={e.id} value={e.id}>{e.title.fr}</option>)}
        </select>
        <label className="sr-only" htmlFor="partenaire">Partenaire</label>
        <select id="partenaire" name="partenaire" defaultValue={partnerFilter} className={select}>
          <option value="">Tous les organisateurs</option>
          <option value="aucun">The Host Club (sans partenaire)</option>
          {usedPartners.map((id) => <option key={id} value={id}>{partnerName(id)}</option>)}
        </select>
        <label className="sr-only" htmlFor="periode">Période</label>
        <select id="periode" name="periode" defaultValue={period} className={select}>
          {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">Filtrer</button>
        {(expFilter || partnerFilter || period !== "tout") && <Link href="/admin/encaissements" className="self-center text-sm text-muted underline">Effacer</Link>}
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="ledger-totals">
        <StatTile label="Encaissé en ligne (net)" value={dh(total.netOnline)} hint={`${dh(total.paidOnline)} encaissé · ${dh(total.refunded)} remboursé`} />
        <StatTile label="Sur place attendu (prix fixe)" value={dh(total.onSiteExpected)} hint={total.consumptionBookings ? `+ ${total.consumptionBookings} réservation${total.consumptionBookings > 1 ? "s" : ""} en consommation libre (non chiffrée)` : undefined} />
        <StatTile label="Sur place réglé" value={dh(total.onSitePaid)} hint={total.onSiteExpected ? `${Math.round((total.onSitePaid / total.onSiteExpected) * 100)} % du prix fixe attendu` : undefined} />
        <StatTile label="Présents" value={`${total.present} / ${total.seats}`} hint={`${total.noShow} absent${total.noShow > 1 ? "s" : ""} · ${total.cancelled} annulation${total.cancelled > 1 ? "s" : ""}`} />
      </div>
      {d.isDemo && <div className="mt-4"><DemoNote>Données de démonstration.</DemoNote></div>}

      <Card className="mt-6">
        <Table head={["Date", "Expérience", "Partenaire", "Formule", "Places", "Présents", "En ligne (net)", "Remboursé", "Sur place attendu", "Sur place réglé", "Annul."]} caption="Suivi par date">
          {rows.slice(0, 300).map((x) => (
            <tr key={x.sessionId}>
              <td className="whitespace-nowrap text-muted"><Link href={`/admin/sessions/${x.sessionId}`} className="hover:text-plum-900">{adminDate(x.startAt)}</Link></td>
              <td className="font-medium text-ink">{x.e?.title.fr ?? "Expérience supprimée"}</td>
              <td>{x.partner}</td>
              <td className="text-sm">{MODEL_LABELS[x.model]}</td>
              <td className="tabular-nums">{x.sum.seats}</td>
              <td className="tabular-nums">{x.sum.present}</td>
              <td className="tabular-nums">{dh(x.sum.netOnline)}</td>
              <td className="tabular-nums">{x.sum.refunded ? dh(x.sum.refunded) : "—"}</td>
              <td className="tabular-nums">{x.model === "fixed_partner" ? dh(x.sum.onSiteExpected) : x.model === "variable_consumption" ? "Conso." : "—"}</td>
              <td className="tabular-nums">{x.model === "fixed_partner" ? dh(x.sum.onSitePaid) : "—"}</td>
              <td className="tabular-nums">{x.sum.cancelled || "—"}</td>
            </tr>
          ))}
        </Table>
        {rows.length === 0 && <p className="px-1 py-4 text-sm text-muted">Aucune réservation pour ces filtres.</p>}
      </Card>
    </>
  );
}
