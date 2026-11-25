import { ageBand, ageOn, bookingClosesAt, optionText, revealAtFor } from "@thecommunity/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupsBoard, type BoardMember } from "@/components/admin/groups-board";
import { INTEREST_LABELS } from "@/components/admin/labels";
import frMessages from "@/messages/fr.json";
import { adminDate, PageHeader } from "@/components/admin/ui";
import { sessionTitle } from "@/lib/admin-todos";
import { getRendezvousTitles } from "@/lib/data/admin-todo";
import { getTableProfiles } from "@/lib/data/admin-tables";
import { getAdminData } from "@/lib/data/admin";
import { memberSummary } from "@/lib/data/demo-admin";

export const metadata = { title: "Tables" };

export default async function GroupsPage({ params }: PageProps<"/admin/sessions/[id]/groupes">) {
  const { id } = await params;
  const d = await getAdminData();
  const s = d.sessions.find((x) => x.id === id) ?? d.recentSessions.find((x) => x.id === id);
  if (!s) notFound();
  const e = d.experiences.get(s.experienceId)!;
  if (!e.groupConfig) notFound();
  const groups = d.groups.filter((g) => g.sessionId === s.id);
  const questions = e.questionnaire ?? [];
  // Participants confirmés : la langue de table choisie à la réservation passe avant celles du profil.
  const confirmed = d.reservations.filter((r) => r.sessionId === s.id && (r.status === "confirmed" || r.status === "attended"));
  const members: Record<string, BoardMember> = {};
  // Profil complet des participants (réponses d'inscription, historique, personnes déjà rencontrées).
  const [profiles, rvTitles] = await Promise.all([getTableProfiles(s.id, confirmed.map((r) => r.userId)), getRendezvousTitles()]);
  for (const r of confirmed) {
    const u = d.usersById.get(r.userId);
    if (!u) continue;
    members[u.uid] = {
      uid: u.uid,
      firstName: `${u.firstName} ${u.lastName.charAt(0)}.`,
      fullName: `${u.firstName} ${u.lastName}`,
      email: u.email,
      ...(r.preferences?.diet ? { diet: r.preferences.diet } : {}),
      ...(r.preferences?.allergies ? { allergies: r.preferences.allergies } : {}),
      ...(profiles[u.uid] ? { profile: profiles[u.uid] } : {}),
      ageBand: ageBand(ageOn(u.birthDate)),
      gender: u.gender,
      languages: r.preferences?.languages?.length ? r.preferences.languages : u.languages,
      interests: u.interests,
      seats: r.seats,
      // 18a : réponses au questionnaire, résumées pour l'équipe (« Niveau de padel ? Intermédiaire »).
      ...(r.answers
        ? {
            answers: r.answers,
            answersText: questions.filter((q) => r.answers![q.id] !== undefined).map((q) => optionText(q, r.answers![q.id]!)).join(" · "),
          }
        : {}),
    };
  }
  // Démonstration : les groupes fictifs renvoient à des membres qui n'ont pas forcément de réservation.
  for (const uid of groups.flatMap((g) => g.memberIds)) if (!members[uid] && d.usersById.get(uid)) members[uid] = memberSummary(d.usersById.get(uid)!);
  const placed = new Set(groups.flatMap((g) => g.memberIds));
  const unassigned = Object.keys(members).filter((uid) => !placed.has(uid));
  const status = s.groupsStatus ?? (groups.length ? "proposed" : "none");
  const seats = confirmed.reduce((a, r) => a + r.seats, 0);
  // Restaurants confirmés de la date, dans l'ordre où les tables y sont réparties.
  const venues = (d.sessionVenues[s.id] ?? []).map((v) => ({ name: v.name, cuisine: v.cuisine ?? null, tables: v.tables ?? null }));
  const start = new Date(s.startAt);
  const closes = bookingClosesAt(start, e);
  const reveal = revealAtFor(start);
  const timing = status === "revealed" ? "dévoilées aux participants" : `dévoilées le ${adminDate(reveal.toISOString())} ; vous pouvez les retoucher jusque-là`;
  return (
    <>
      <p className="mb-2 text-sm"><Link href={`/admin/sessions/${s.id}`} className="text-brand-900">← {sessionTitle(d, s, rvTitles)}</Link></p>
      <PageHeader
        title="Tables"
        subtitle={`${sessionTitle(d, s, rvTitles)} · ${adminDate(s.startAt)} · ${d.isDemo ? Object.keys(members).length : seats} participants · tables de ${e.groupConfig.minSize} à ${e.groupConfig.maxSize}`}
        actions={
          <Link href={`/admin/sessions/${s.id}/supports`} className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">
            Supports imprimés (marque-places)
          </Link>
        }
      />
      {s.groupsNeedReview && (
        <p role="status" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Une réservation a changé depuis l&apos;enregistrement (annulation, déplacement ou nouvelle place) : vérifiez la composition et enregistrez-la à nouveau.
        </p>
      )}
      {status !== "revealed" && d.now.getTime() < closes.getTime() && groups.length > 0 && (
        <p className="mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900">Les réservations sont encore ouvertes (jusqu&apos;au {adminDate(closes.toISOString())}) : sans retouche de votre part, les tables seront recomposées avec la liste définitive.</p>
      )}
      {questions.length > 0 && (
        <p className="mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900" data-testid="questionnaire-summary">
          Questionnaire : {confirmed.filter((r) => r.answers).length} réponse(s) sur {confirmed.length} participant(s). La composition en tient compte
          ({questions.filter((q) => q.match === "same").length} question(s) « réunir », {questions.filter((q) => q.match === "mix").length} « mélanger »).
        </p>
      )}
      {Object.keys(members).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Pas encore de participant confirmé pour former une table.</p>
      ) : (
        <GroupsBoard
          initial={groups.map(({ id, label, memberIds }) => ({ id, label, memberIds }))}
          members={members}
          config={e.groupConfig}
          interestLabels={{ ...INTEREST_LABELS, ...(frMessages.labels.interests as Record<string, string>) }}
          prefix={e.bookingMode === "social_dinner" ? "Table" : "Équipe"}
          live={!d.isDemo}
          sessionId={s.id}
          status={status}
          unassigned={unassigned}
          questions={questions.map(({ id, kind, match }) => ({ id, kind, match }))}
          venues={venues}
          timing={timing}
        />
      )}
    </>
  );
}
