import { bookingClosesAt, unitWord, venueRequestText, whatsappWebUrl } from "@thecommunity/shared";
import Link from "next/link";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Attribution des lieux" };

const HOUR = 3_600_000;
const TONE = { sent: "amber", confirmed: "green", refused: "red", expired: "red", cancelled: "gray" } as const;
const LABEL = { sent: "En attente", confirmed: "Confirmé", refused: "Refusé", expired: "Sans réponse", cancelled: "Annulé" } as const;

/**
 * Attribution des lieux (docs/22 § 17.H, H6) : les appels à passer, puis chaque date des 7 prochains jours à lieu
 * attribué ou fixe avec ses inscrits, ses tables et l'état des demandes aux lieux.
 */
export default async function AllocationPage() {
  const d = await getAdminData();
  const now = d.now.getTime();
  const pending = d.venueRequests.filter((r) => r.status === "sent" && new Date(r.startAt).getTime() > now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const sessions = d.sessions
    .filter((s) => s.status !== "cancelled" && new Date(s.startAt).getTime() < now + 7 * 24 * HOUR)
    .filter((s) => d.experiences.get(s.experienceId)?.venue.revealPolicy === "on_group_reveal" || d.venueRequests.some((r) => r.sessionId === s.id))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  return (
    <>
      <PageHeader title="Attribution des lieux" subtitle="Le logiciel choisit les lieux à la fermeture des réservations et leur envoie la demande ; vous confirmez ici après un appel ou un message." />
      <Card title={`Appels à passer (${pending.length})`}>
        {pending.length === 0 ? <p className="text-sm text-muted">Aucune demande en attente.</p> : (
          <ul className="divide-y divide-line" data-testid="calls">
            {pending.map((r) => {
              const link = `${SITE_URL}/partenaire/demande/${r.id}?t=${r.token}`;
              const wa = whatsappWebUrl(r.partnerWhatsapp, venueRequestText({ venue: r.partnerName, title: r.title, when: adminDate(r.startAt), format: r.format, tier: r.tier, tables: r.tables, people: r.people, unit: r.unit, reference: r.reference, link }));
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-48 flex-1"><span className="font-semibold text-ink">{r.partnerName}</span> · {r.tables} {unitWord(r.unit, r.tables)}, {r.people} pers. · {adminDate(r.startAt)}</span>
                  {r.partnerWhatsapp && <a href={`tel:${r.partnerWhatsapp.replace(/[^\d+]/g, "")}`} className="rounded-full border border-line px-3 py-1.5 font-semibold">Appeler</a>}
                  {wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-700 px-3 py-1.5 font-semibold text-white">WhatsApp Web</a>}
                  <Link href={`/admin/sessions/${r.sessionId}`} className="rounded-full bg-brand-900 px-3 py-1.5 font-semibold text-white">Confirmer</Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="Dates des 7 prochains jours" className="mt-6">
        {sessions.length === 0 ? <p className="text-sm text-muted">Aucune date à lieu attribué dans les 7 prochains jours.</p> : (
          <ul className="divide-y divide-line" data-testid="allocation-list">
            {sessions.map((s) => {
              const e = d.experiences.get(s.experienceId)!;
              const reqs = d.venueRequests.filter((r) => r.sessionId === s.id);
              const a = s.allocation;
              return (
                <li key={s.id} className="space-y-1.5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/sessions/${s.id}`} className="font-semibold text-ink hover:text-brand-900">{e.title.fr}{e.venueTier ? ` · ${e.venueTier.charAt(0).toUpperCase()}${e.venueTier.slice(1)}` : ""}</Link>
                    <span className="text-sm text-muted">{adminDate(s.startAt)} · {s.seatsConfirmed} inscrits{a?.needed ? ` · ${a.needed} tables` : ""}</span>
                    {!a && <Badge tone="gray">{`Attribution le ${adminDate(bookingClosesAt(new Date(s.startAt), e).toISOString())}`}</Badge>}
                    {a?.status === "confirmed" && <Badge tone="green">Lieux confirmés</Badge>}
                    {a?.status === "short" && <Badge tone="red">{`${a.missing} table${(a.missing ?? 0) > 1 ? "s" : ""} sans lieu`}</Badge>}
                    {a?.status === "manual" && <Badge tone="gray">Choisis à la main</Badge>}
                    {s.venueCapacity != null && !a && <Badge tone={s.venueCapacity === 0 ? "red" : "gray"}>{`Capacité : ${s.venueCapacity} pers.`}</Badge>}
                  </div>
                  {reqs.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {reqs.map((r) => <li key={r.id}><Badge tone={TONE[r.status]}>{`${r.partnerName} · ${r.tables} · ${LABEL[r.status]}`}</Badge></li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
