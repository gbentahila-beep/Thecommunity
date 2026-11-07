import { AtSign, CalendarDays, MessageSquareQuote } from "lucide-react";
import { INTEREST_LABELS } from "@/components/admin/labels";
import { PrivateAvatar } from "@/components/admin/private-avatar";
import { RequestActions } from "@/components/admin/request-actions";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getAdminRequests, type AdminRequestItem } from "@/lib/data/admin-requests";

export const metadata = { title: "Demandes de participation" };

const fr = (t: { fr?: string } | undefined) => t?.fr ?? "";

/**
 * Expériences « sur demande » : l'équipe choisit qui participe.
 * Accepter réserve la place 24 h pour que la personne paie ; refuser la prévient.
 */
export default async function ParticipationRequestsPage() {
  const { pending, decided, isDemo } = await getAdminRequests();
  return (
    <>
      <PageHeader
        title="Demandes de participation"
        subtitle={isDemo ? "Disponible avec Firebase (projet d'essai ou réel)." : `${pending.length} en attente · les expériences « sur demande » se règlent dans leur fiche`}
      />
      {pending.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            {isDemo
              ? "Mode démonstration : aucune demande. Sur le site en ligne, les demandes envoyées pour une expérience « sur demande » apparaissent ici."
              : "Aucune demande en attente. Pour qu'une expérience fonctionne sur demande : Expériences → la fiche → « Inscription : sur demande »."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {pending.map((item) => (
            <li key={item.request.id}>
              <RequestCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <Card title="Dernières décisions" className="mt-8">
          <ul className="divide-y divide-line text-sm">
            {decided.map(({ request: r, person: p }) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <strong className="text-ink">{p.firstName} {p.lastName}</strong>
                  <span className="text-muted"> · {fr(r.sessionSnapshot.title)} · {adminDate(r.sessionSnapshot.startAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  {r.decidedAt && <span className="text-xs text-muted">{adminDate(r.decidedAt)}</span>}
                  <Badge tone={r.status === "accepted" ? "green" : "red"}>{r.status === "accepted" ? "Acceptée" : "Refusée"}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function RequestCard({ item }: { item: AdminRequestItem }) {
  const { request: r, person: p, history: h, session: s } = item;
  const name = `${p.firstName} ${p.lastName}`.trim() || p.email;
  return (
    <article className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-plum-900">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {fr(r.sessionSnapshot.title)} · {adminDate(r.sessionSnapshot.startAt)}
        </p>
        {s && (
          <Badge tone={s.seatsLeft >= r.seats ? "green" : "red"}>
            {s.seatsLeft} place{s.seatsLeft > 1 ? "s" : ""} libre{s.seatsLeft > 1 ? "s" : ""} / {s.capacity}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex gap-4">
        <PrivateAvatar path={p.photoPath} name={p.firstName} />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-semibold text-ink">
            {name}
            {p.age !== null && <span className="font-normal text-muted"> · {p.age} ans</span>}
          </h2>
          {p.profession && <p className="text-sm text-ink/80">{p.profession}</p>}
          <p className="text-xs text-muted">
            {p.email}
            {p.memberSince && <> · membre depuis le {adminDate(p.memberSince, false)}</>}
            {r.seats > 1 && <> · <strong className="text-ink">{r.seats} places demandées</strong></>}
          </p>
          {r.instagram && (
            <a href={`https://www.instagram.com/${r.instagram}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-plum-900 underline">
              <AtSign className="size-3.5" aria-hidden />
              {r.instagram}
            </a>
          )}
        </div>
      </div>

      {r.message && (
        <blockquote className="mt-4 flex gap-2 rounded-2xl bg-cream/70 p-3 text-sm text-ink">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-plum-700" aria-hidden />
          <span className="whitespace-pre-line">{r.message}</span>
        </blockquote>
      )}
      {p.bio && <p className="mt-3 text-sm text-muted">« {p.bio} »</p>}
      {p.interests.length > 0 && <p className="mt-2 text-xs text-muted">{p.interests.map((i) => INTEREST_LABELS[i] ?? i).join(" · ")}</p>}
      <p className="mt-2 text-xs text-muted">
        Historique : {h.attended} participation{h.attended > 1 ? "s" : ""} · {h.confirmed} à venir · {h.noShows} absence{h.noShows > 1 ? "s" : ""} · {h.cancelled} annulation{h.cancelled > 1 ? "s" : ""}
        {" · "}demande envoyée le {adminDate(r.createdAt)}
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <RequestActions requestId={r.id} name={p.firstName || "cette personne"} />
        <p className="mt-2 text-xs text-muted">Accepter réserve la place : la personne a 24 h pour payer, sinon la place se libère.</p>
      </div>
    </article>
  );
}
