import { normalizeTransferReference } from "@thecommunity/shared";
import Link from "next/link";
import { TransferAction } from "@/components/admin/transfer-actions";
import { adminDate, Badge, Card, DemoNote, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Virements" };

/**
 * Étape 5h, phase 1 — virements bancaires : à valider (« Virement reçu » → réservation confirmée, billet, facture),
 * remboursements à faire à la main (« Remboursement effectué » → avoir), et derniers virements reçus.
 */
export default async function TransfersPage({ searchParams }: PageProps<"/admin/virements">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const ref = q ? normalizeTransferReference(q) : null;
  const d = await getAdminData();
  const transfers = d.payments.filter((p) => p.provider === "bank_transfer");
  const resById = new Map(d.reservations.map((r) => [r.id, r]));
  const who = (uid: string) => {
    const u = d.usersById.get(uid);
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : { name: "Compte supprimé", email: "" };
  };
  const what = (p: (typeof transfers)[number]) => {
    if (p.purpose === "membership") return { label: "Abonnement annuel", href: null as string | null, date: "" };
    const r = resById.get(p.reservationId);
    const e = r ? d.experiences.get(r.experienceId) : undefined;
    return { label: e?.title.fr ?? "Réservation", href: r ? `/admin/sessions/${r.sessionId}` : null, date: r ? adminDate(r.sessionStartAt) : "" };
  };
  const matches = (p: (typeof transfers)[number]) => {
    if (!q) return true;
    if (ref) return p.reference === ref;
    const w = who(p.userId);
    return [w.name, w.email, p.reference ?? ""].some((x) => x.toLowerCase().includes(q.toLowerCase()));
  };
  const pending = transfers.filter((p) => p.type === "payment" && p.status === "initiated" && matches(p)).sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  const refunds = transfers.filter((p) => p.type === "refund" && p.status === "initiated");
  const received = transfers.filter((p) => p.type === "payment" && p.status !== "initiated" && p.status !== "failed" && matches(p)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const late = (p: (typeof transfers)[number]) => Boolean(p.deadline && new Date(p.deadline).getTime() < d.now.getTime());

  return (
    <>
      <PageHeader title="Virements" subtitle="Comparez chaque virement reçu sur le compte (montant et référence dans le motif) avant de le valider : la personne reçoit aussitôt sa confirmation, son billet et sa facture." />
      {d.isDemo && <div className="mb-4"><DemoNote>Démonstration : les paiements en attente sont présentés comme des virements.</DemoNote></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="À valider" value={String(pending.length)} hint={dh(pending.reduce((a, p) => a + p.amount, 0))} />
        <StatTile label="Échéance dépassée" value={String(pending.filter(late).length)} hint="place libérée ; à valider seulement si le virement est bien arrivé" />
        <StatTile label="Remboursements à faire" value={String(refunds.length)} hint={dh(refunds.reduce((a, p) => a + p.amount, 0))} />
        <StatTile label="Reçus" value={String(received.length)} hint={dh(received.reduce((a, p) => a + p.amount, 0))} />
      </div>

      <form className="mb-4 mt-6 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="q">Référence, nom ou e-mail</label>
        <input id="q" name="q" defaultValue={q} placeholder="Référence (THC-…), nom ou e-mail" className="min-w-64 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm" />
        <button className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">Rechercher</button>
        {q && <Link href="/admin/virements" className="self-center text-sm text-muted underline">Effacer</Link>}
      </form>

      <Card title={`À valider (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">{q ? `Aucun virement en attente pour « ${q} ».` : "Aucun virement en attente."}</p>
        ) : (
          <Table head={["Référence", "Personne", "Pour", "Montant", "Échéance", ""]} caption="Virements à valider">
            {pending.map((p) => {
              const w = who(p.userId);
              const x = what(p);
              return (
                <tr key={p.id} data-testid={`transfer-${p.reference}`}>
                  <td className="whitespace-nowrap font-mono font-semibold text-plum-900">{p.reference}</td>
                  <td><span className="block font-medium text-ink">{w.name}</span><span className="block text-xs text-muted">{w.email}</span></td>
                  <td>{x.href ? <Link href={x.href} className="hover:text-plum-900">{x.label}</Link> : x.label}{x.date && <span className="block text-xs text-muted">{x.date}</span>}</td>
                  <td className="whitespace-nowrap tabular-nums font-semibold">{dh(p.amount)}</td>
                  <td className="whitespace-nowrap">{p.deadline ? <>{adminDate(p.deadline)}{late(p) && <span className="mt-0.5 block"><Badge tone="red">Dépassée</Badge></span>}</> : "—"}</td>
                  <td className="min-w-40"><TransferAction kind="receive" id={p.id} amount={dh(p.amount)} reference={p.reference} live={!d.isDemo} /></td>
                </tr>
              );
            })}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">Échéance dépassée : la place a été libérée. Si le virement est bien arrivé, validez-le : la place est reprise s&apos;il en reste, sinon un remboursement est créé ci-dessous.</p>
      </Card>

      <Card title={`Remboursements à faire (${refunds.length})`} className="mt-6">
        {refunds.length === 0 ? (
          <p className="text-sm text-muted">Aucun remboursement en attente.</p>
        ) : (
          <Table head={["Date", "Personne", "Virement d'origine", "Montant", ""]} caption="Remboursements à faire">
            {refunds.map((p) => {
              const w = who(p.userId);
              const parent = transfers.find((x) => x.id === p.parentPaymentId);
              return (
                <tr key={p.id}>
                  <td className="whitespace-nowrap text-muted">{adminDate(p.createdAt)}</td>
                  <td><span className="block font-medium text-ink">{w.name}</span><span className="block text-xs text-muted">{w.email}</span></td>
                  <td className="font-mono text-xs">{parent?.reference ?? "—"}</td>
                  <td className="whitespace-nowrap tabular-nums font-semibold">{dh(p.amount)}</td>
                  <td className="min-w-40"><TransferAction kind="refund" id={p.id} amount={dh(p.amount)} live={!d.isDemo} /></td>
                </tr>
              );
            })}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">Le remboursement se fait par virement depuis le compte de la société : demandez ses coordonnées bancaires à la personne (elles ne sont jamais enregistrées sur le site), puis marquez-le effectué — l&apos;avoir lui est envoyé.</p>
      </Card>

      <Card title="Derniers virements reçus" className="mt-6">
        {received.length === 0 ? (
          <p className="text-sm text-muted">Aucun virement reçu pour l&apos;instant.</p>
        ) : (
          <Table head={["Reçu", "Référence", "Personne", "Pour", "Montant", "Document"]} caption="Virements reçus">
            {received.slice(0, 50).map((p) => {
              const w = who(p.userId);
              return (
                <tr key={p.id}>
                  <td className="whitespace-nowrap text-muted">{adminDate(p.createdAt)}</td>
                  <td className="font-mono text-xs">{p.reference}</td>
                  <td>{w.name}</td>
                  <td>{what(p).label}</td>
                  <td className="tabular-nums">{dh(p.amount)}</td>
                  <td>{p.invoiceId ? <a href={`/api/factures/${p.invoiceId}`} className="font-mono text-xs text-plum-900 underline">{p.invoiceNumber}</a> : "—"}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
