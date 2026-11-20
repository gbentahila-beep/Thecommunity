import { ticketState } from "@thecommunity/shared";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDate, Card, PageHeader } from "@/components/admin/ui";
import { CheckInButtons } from "@/components/pro/checkin-buttons";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Billet" };

/** Étape 20 — fiche d'un billet scanné par l'organisateur (introuvable s'il ne concerne pas ses activités). */
export default async function ProTicketPage({ params }: PageProps<"/pro/billets/[id]">) {
  const { id } = await params;
  const space = await requireApprovedOrganizer();
  const d = await getProData(space.organizer.id);
  const r = d.reservations.find((x) => x.id === decodeURIComponent(id));
  if (!r) notFound();
  const state = ticketState(r.status);
  const canCheckIn = new Date(r.sessionStartAt).getTime() - d.now.getTime() <= 3 * 3_600_000;
  const view = {
    valid: { icon: CheckCircle2, text: "Billet valide", tone: "bg-emerald-50 text-emerald-900" },
    used: { icon: CheckCircle2, text: "Déjà pointé présent", tone: "bg-sky-50 text-sky-900" },
    pending: { icon: CircleAlert, text: "Paiement en attente : pas encore valable", tone: "bg-amber-50 text-amber-950" },
    void: { icon: XCircle, text: "Billet non valable (annulé)", tone: "bg-red-50 text-red-900" },
  }[state];
  const Icon = view.icon;
  return (
    <div className="max-w-xl">
      <PageHeader title={`Billet ${r.code}`} subtitle={`${r.title} · ${adminDate(r.sessionStartAt)}`} />
      <p className={`mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-lg font-semibold ${view.tone}`} data-testid="ticket-state"><Icon className="size-6" aria-hidden />{view.text}</p>
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-muted">Participant</dt><dd className="font-medium">{r.participant}</dd></div>
          <div><dt className="text-xs text-muted">Places</dt><dd className="font-medium">{r.seats}</dd></div>
          {(r.diet || r.allergies) && <div className="col-span-2"><dt className="text-xs text-muted">Régime / allergies</dt><dd>{[r.diet, r.allergies].filter(Boolean).join(" · ")}</dd></div>}
        </dl>
        <div className="mt-4"><CheckInButtons reservationId={r.id} status={r.status} live={!space.isDemo} canCheckIn={canCheckIn} /></div>
      </Card>
      <Link href="/pro/billets" className="mt-4 inline-block text-sm text-plum-900 underline">← Autre billet</Link>
    </div>
  );
}
