import { ORGANIZER_STATUS_LABELS } from "@thecommunity/shared";
import { ArrowRight, Clock, Hourglass, ShieldOff, XCircle } from "lucide-react";
import Link from "next/link";
import { adminDate, Badge, Card, dh, FillBar, PageHeader, StatTile } from "@/components/admin/ui";
import { getOrganizerSpace, getProData, proStats } from "@/lib/data/organizer";

export const metadata = { title: "Tableau de bord" };

const STEPS = [
  ["Créez votre compte organisateur", "Présentez votre structure et joignez vos justificatifs (registre de commerce, assurance)."],
  ["L'équipe valide votre compte", "En général sous 48 h ouvrées. Vous êtes prévenu(e) par e-mail."],
  ["Publiez vos activités", "Dans Activités ou Événements : dates, prix, nombre de places. L'équipe valide chaque activité, modification et nouvelle date avant la mise en ligne."],
  ["Accueillez vos participants", "Liste des participants avec leur téléphone, pointage à l'entrée ; le prix de l'activité se règle sur place."],
] as const;

/** Étape 20 — accueil de l'espace organisateur : selon le statut du compte, présentation, attente ou tableau de bord. */
export default async function ProHomePage() {
  const space = await getOrganizerSpace();
  const message = space.details?.decisionMessage;

  if (space.status === "none") {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Proposez vos activités sur Wenzy" subtitle="Clubs, ateliers, guides, coachs : proposez vos activités et vos événements à une communauté qui veut sortir et rencontrer du monde à Casablanca." />
        <Card>
          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-xl bg-cream p-4">
                <span className="font-display text-3xl text-brand-200">{i + 1}</span>
                <p className="mt-1 font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-muted">Pas de commission : le participant paie 35 DH en ligne à Wenzy et vous règle le prix de l&apos;activité sur place. Tout est expliqué dans le <Link href="/contrat-organisateur" className="font-semibold text-brand-900 underline">contrat organisateur</Link>.</p>
          <Link href="/pro/inscription" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-900 px-6 py-3 font-semibold text-white hover:bg-brand-800">
            Créer mon compte organisateur <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Card>
      </div>
    );
  }

  if (space.status !== "approved" || !space.organizer) {
    const ICONS: Record<string, typeof Hourglass> = { pending: Hourglass, info_requested: Clock, rejected: XCircle, suspended: ShieldOff };
    const Icon = ICONS[space.status] ?? Hourglass;
    const texts: Record<string, string> = {
      pending: "Votre demande est en cours de relecture par l'équipe. Vous serez prévenu(e) par e-mail dès la décision.",
      info_requested: "L'équipe a besoin d'un complément pour valider votre compte. Modifiez votre demande puis renvoyez-la.",
      rejected: "Votre demande n'a pas été retenue. Vous pouvez nous écrire pour en parler.",
      suspended: "Votre compte organisateur est suspendu : vos activités ne peuvent plus être modifiées. Contactez-nous.",
    };
    return (
      <div className="max-w-2xl">
        <PageHeader title={space.organizer?.name ?? "Compte organisateur"} subtitle={`Statut : ${ORGANIZER_STATUS_LABELS[space.status]}`} />
        <Card>
          <p className="flex items-start gap-3 text-ink" data-testid="organizer-status">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-900" aria-hidden />
            <span>{texts[space.status]}</span>
          </p>
          {message && (
            <blockquote className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950" data-testid="decision-message">
              <strong>Message de l&apos;équipe :</strong> {message}
            </blockquote>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {space.status === "info_requested" && <Link href="/pro/inscription" className="rounded-full bg-brand-900 px-5 py-2.5 font-semibold text-white">Compléter ma demande</Link>}
            <Link href="/contact" className="rounded-full border border-brand-900 px-5 py-2.5 font-semibold text-brand-900">Nous écrire</Link>
          </div>
        </Card>
      </div>
    );
  }

  const d = await getProData(space.organizer.id);
  const s = proStats(d);
  const nowIso = d.now.toISOString();
  const next = d.sessions.filter((x) => x.startAt >= nowIso && x.status !== "cancelled").slice(0, 6);
  return (
    <>
      <PageHeader
        title={space.organizer.name}
        subtitle="Vos activités, dates et réservations sur Wenzy."
        actions={<Link href="/pro/activites/nouvelle" className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouvelle activité</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="pro-stats">
        <StatTile label="Réservations payées" value={String(s.bookings)} hint={`${dh(s.grossTotal)} au total`} />
        <StatTile label="Ce mois-ci" value={dh(s.grossMonth)} hint="Montant payé par vos participants" />
        <StatTile label="Remplissage à venir" value={`${Math.round(s.fill * 100)} %`} hint={`${s.upcomingSeats} places réservées · ${s.upcomingSessions} dates`} />
        <StatTile label="Taux d'annulation" value={`${Math.round(s.cancellationRate * 100)} %`} hint={`${s.published} activité${s.published > 1 ? "s" : ""} en ligne${s.inReview ? ` · ${s.inReview} en relecture` : ""}`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Prochaines dates" actions={<Link href="/pro/dates" className="text-sm font-semibold text-brand-900">Tout voir →</Link>}>
          {next.length === 0 ? (
            <p className="text-sm text-muted">Aucune date à venir. Ajoutez des dates depuis « Mes activités ».</p>
          ) : (
            <ul className="divide-y divide-line">
              {next.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="w-36 shrink-0 text-muted">{adminDate(x.startAt)}</span>
                  <span className="min-w-40 flex-1 font-medium text-ink">{x.title}</span>
                  <span className="w-40"><FillBar value={x.seatsConfirmed} max={x.capacity} /></span>
                  <Link href={`/pro/dates/${x.id}`} className="font-semibold text-brand-900">Participants</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="À faire">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span>Demandes de participation</span>
              {s.pendingRequests ? <Link href="/pro/demandes"><Badge tone="amber">{s.pendingRequests} à traiter</Badge></Link> : <Badge tone="gray">aucune</Badge>}
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Activités en relecture</span>
              <Badge tone={s.inReview ? "amber" : "gray"}>{s.inReview || "aucune"}</Badge>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Modifications en attente de validation</span>
              <Badge tone={d.experiences.some((e) => (e as { revisionPending?: boolean }).revisionPending) ? "amber" : "gray"}>{d.experiences.filter((e) => (e as { revisionPending?: boolean }).revisionPending).length || "aucune"}</Badge>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Demandes à l&apos;équipe en cours</span>
              <Badge tone={d.orgRequests.some((r) => r.status === "pending") ? "amber" : "gray"}>{d.orgRequests.filter((r) => r.status === "pending").length || "aucune"}</Badge>
            </li>
            {d.experiences.filter((e) => e.status === "rejected").map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <span>« {e.title.fr} » à corriger</span>
                <Link href={`/pro/activites/${e.id}`}><Badge tone="red">Refusée</Badge></Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
