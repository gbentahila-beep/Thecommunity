import { ICEBREAKERS_FR } from "@thecommunity/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HostingForm } from "@/components/admin/hosting-form";
import { PlaceCard, TableNumberCard, WelcomeCard } from "@/components/admin/printables";
import { PrintButton } from "@/components/admin/print-button";
import { adminDate, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Fiche hôte" };

/**
 * Pour l'hôte de la soirée : déroulé, questions pour briser la glace, et marque-places (un prénom par carte,
 * regroupés par table) à imprimer — « que chacun se sente attendu ».
 */
export default async function HostSheetPage({ params }: PageProps<"/admin/sessions/[id]/fiche-hote">) {
  const { id } = await params;
  const d = await getAdminData();
  const s = d.sessions.find((x) => x.id === id) ?? d.recentSessions.find((x) => x.id === id);
  if (!s) notFound();
  const e = d.experiences.get(s.experienceId)!;
  const confirmed = d.reservations.filter((r) => r.sessionId === s.id && (r.status === "confirmed" || r.status === "attended"));
  const first = (uid: string) => d.usersById.get(uid)?.firstName ?? "Invité";
  const seatsOf = (uid: string) => confirmed.find((r) => r.userId === uid)?.seats ?? 1;
  const groups = d.groups.filter((g) => g.sessionId === s.id);
  const tables = groups.length
    ? groups.map((g) => ({ label: g.label, names: g.memberIds.flatMap((uid) => [first(uid), ...Array.from({ length: seatsOf(uid) - 1 }, () => `Invité de ${first(uid)}`)]) }))
    : [{ label: "Tous les participants", names: confirmed.flatMap((r) => [first(r.userId), ...Array.from({ length: r.seats - 1 }, () => `Invité de ${first(r.userId)}`)]) }];
  return (
    <>
      <p className="mb-2 text-sm print:hidden"><Link href={`/admin/sessions/${s.id}`} className="text-plum-900">← Participants</Link></p>
      <PageHeader title="Fiche hôte" subtitle={`${e.title.fr} · ${adminDate(s.startAt)} · ${e.venue.name}`} actions={<PrintButton label="Imprimer / PDF" />} />
      <div className="grid gap-6 lg:grid-cols-2 print:block">
        <Card title="Accueil et déroulé">
          <HostingForm sessionId={s.id} initial={{ hostName: s.hosting?.hostName ?? "", notes: s.hosting?.notes ?? "" }} live={!d.isDemo} />
          <div className="hidden print:block">
            <p><strong>Hôte :</strong> {s.hosting?.hostName || "—"}</p>
            <p className="whitespace-pre-line">{s.hosting?.notes}</p>
          </div>
        </Card>
        <Card title="Questions pour briser la glace">
          <ol className="list-decimal space-y-1.5 ps-5 text-sm">
            {ICEBREAKERS_FR.map((q) => <li key={q}>{q}</li>)}
          </ol>
          <p className="mt-3 text-xs text-muted">Conseil : un tour de table rapide, puis laissez la conversation vivre. Présentez les personnes qui arrivent seules.</p>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 font-display text-2xl font-medium text-plum-900">Marque-places</h2>
      {!groups.length && <p className="mb-3 text-sm text-muted print:hidden">Les tables ne sont pas encore composées : les prénoms sont listés ensemble.</p>}
      {tables.map((t) => (
        <section key={t.label} aria-label={t.label} className="mb-6 break-inside-avoid">
          <h3 className="mb-2 font-semibold text-ink">{t.label} · {t.names.length} pers.</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {t.names.map((n, i) => <PlaceCard key={`${n}-${i}`} name={n} table={groups.length ? t.label : undefined} />)}
          </ul>
        </section>
      ))}
      {groups.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-2xl font-medium text-plum-900 print:break-before-page">Numéros de table</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tables.map((t) => <TableNumberCard key={t.label} label={t.label} />)}
          </div>
        </>
      )}
      <h2 className="mb-3 mt-8 font-display text-2xl font-medium text-plum-900 print:break-before-page">Cartes de bienvenue</h2>
      <p className="mb-3 text-sm text-muted print:hidden">Une carte par table, avec trois questions différentes pour lancer la conversation.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t, i) => (
          <WelcomeCard key={t.label} questions={[0, 1, 2].map((k) => ICEBREAKERS_FR[(i * 3 + k) % ICEBREAKERS_FR.length]!)} />
        ))}
      </div>
    </>
  );
}
