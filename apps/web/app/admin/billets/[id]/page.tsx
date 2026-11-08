import { ticketCode, ticketState } from "@thecommunity/shared";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RESERVATION_STATUS } from "@/components/admin/labels";
import { TicketActions } from "@/components/admin/ticket-actions";
import { adminDate, Badge, Card, DemoNote, dh, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Billet" };

const STATE = {
  valid: { label: "Billet valide", tone: "bg-emerald-50 text-emerald-950 border-emerald-200", Icon: CheckCircle2 },
  used: { label: "Déjà pointé présent", tone: "bg-amber-50 text-amber-950 border-amber-200", Icon: Clock },
  pending: { label: "Paiement non reçu", tone: "bg-amber-50 text-amber-950 border-amber-200", Icon: Clock },
  void: { label: "Billet non valable", tone: "bg-red-50 text-red-950 border-red-200", Icon: XCircle },
} as const;

/** Fiche d'un billet, ouverte en scannant le QR code avec l'appareil photo du téléphone (équipe seulement). */
export default async function TicketPage({ params }: PageProps<"/admin/billets/[id]">) {
  const { id } = await params;
  const d = await getAdminData();
  const r = d.reservations.find((x) => x.id === decodeURIComponent(id));
  if (!r) notFound();
  const u = d.usersById.get(r.userId);
  const e = d.experiences.get(r.experienceId);
  const s = d.sessions.find((x) => x.id === r.sessionId) ?? d.recentSessions.find((x) => x.id === r.sessionId);
  const start = new Date(r.sessionStartAt);
  const state = STATE[ticketState(r.status)];
  const canCheckIn = d.now.getTime() >= start.getTime() - 3 * 3_600_000;
  const sameDay = start.toDateString() === d.now.toDateString();

  return (
    <div className="max-w-xl">
      <p className="mb-2 text-sm"><Link href="/admin/billets" className="text-plum-900">← Billets</Link></p>
      <PageHeader title={u ? `${u.firstName} ${u.lastName}` : "Compte supprimé"} subtitle={`Billet ${ticketCode(r.id)} · ${r.seats} place${r.seats > 1 ? "s" : ""}`} />
      <div role="status" className={`mb-4 flex items-center gap-3 rounded-2xl border px-4 py-4 text-lg font-semibold ${state.tone}`}>
        <state.Icon className="size-7 shrink-0" aria-hidden />
        {state.label}
      </div>
      {!sameDay && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">Attention : ce billet est pour le {adminDate(r.sessionStartAt)}.</p>}
      <Card className="mb-4">
        <dl className="divide-y divide-line text-[15px]">
          <div className="flex justify-between gap-3 py-2.5"><dt className="text-muted">Expérience</dt><dd className="text-end font-medium">{e?.title.fr ?? "Expérience supprimée"}</dd></div>
          <div className="flex justify-between gap-3 py-2.5"><dt className="text-muted">Date</dt><dd className="text-end">{adminDate(r.sessionStartAt)}</dd></div>
          <div className="flex justify-between gap-3 py-2.5"><dt className="text-muted">Statut</dt><dd><Badge tone={RESERVATION_STATUS[r.status][1]}>{RESERVATION_STATUS[r.status][0]}</Badge></dd></div>
          <div className="flex justify-between gap-3 py-2.5"><dt className="text-muted">Payé en ligne</dt><dd className="tabular-nums">{dh(r.total)}</dd></div>
          {r.onSite && (
            <div className="flex justify-between gap-3 py-2.5" data-testid="ticket-on-site">
              <dt className="text-muted">Sur place · {r.onSite.partnerName}</dt>
              <dd className="text-end tabular-nums">
                {r.onSite.amount != null ? dh(r.onSite.amount) : "Consommation libre"}
                <span className={`block text-xs ${r.onSite.status === "paid_on_site" ? "text-emerald-800" : "text-muted"}`}>
                  {r.onSite.amount == null ? "Réglée au partenaire selon la consommation" : r.onSite.status === "paid_on_site" ? "Réglée" : "À régler au partenaire"}
                </span>
              </dd>
            </div>
          )}
        </dl>
      </Card>
      {d.isDemo ? (
        <DemoNote>Mode démonstration : le pointage et le suivi de la part partenaire fonctionnent sur le site en ligne.</DemoNote>
      ) : (
        <TicketActions reservationId={r.id} status={r.status} canCheckIn={canCheckIn} onSite={r.onSite ? { status: r.onSite.status, fixed: r.onSite.amount != null } : null} />
      )}
      {s && <p className="mt-5 text-sm"><Link href={`/admin/sessions/${s.id}`} className="font-medium text-plum-900 underline">Voir tous les participants de cette date</Link></p>}
    </div>
  );
}
