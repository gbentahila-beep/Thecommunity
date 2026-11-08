import { ageBand, ageOn } from "@thecommunity/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupsBoard, type BoardMember } from "@/components/admin/groups-board";
import { INTEREST_LABELS } from "@/components/admin/labels";
import { adminDate, DemoNote, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { memberSummary } from "@/lib/data/demo-admin";

export const metadata = { title: "Groupes" };

export default async function GroupsPage({ params }: PageProps<"/admin/sessions/[id]/groupes">) {
  const { id } = await params;
  const d = await getAdminData();
  const s = d.sessions.find((x) => x.id === id) ?? d.recentSessions.find((x) => x.id === id);
  if (!s) notFound();
  const e = d.experiences.get(s.experienceId)!;
  if (!e.groupConfig) notFound();
  const groups = d.groups.filter((g) => g.sessionId === s.id);
  // Participants confirmés : la langue de table choisie à la réservation passe avant celles du profil.
  const confirmed = d.reservations.filter((r) => r.sessionId === s.id && (r.status === "confirmed" || r.status === "attended"));
  const members: Record<string, BoardMember> = {};
  for (const r of confirmed) {
    const u = d.usersById.get(r.userId);
    if (!u) continue;
    members[u.uid] = {
      uid: u.uid,
      firstName: `${u.firstName} ${u.lastName.charAt(0)}.`,
      ageBand: ageBand(ageOn(u.birthDate)),
      gender: u.gender,
      languages: r.preferences?.languages?.length ? r.preferences.languages : u.languages,
      interests: u.interests,
      seats: r.seats,
    };
  }
  // Démonstration : les groupes fictifs renvoient à des membres qui n'ont pas forcément de réservation.
  for (const uid of groups.flatMap((g) => g.memberIds)) if (!members[uid] && d.usersById.get(uid)) members[uid] = memberSummary(d.usersById.get(uid)!);
  const placed = new Set(groups.flatMap((g) => g.memberIds));
  const unassigned = Object.keys(members).filter((uid) => !placed.has(uid));
  const status = s.groupsStatus ?? (groups.length ? "proposed" : "none");
  const seats = confirmed.reduce((a, r) => a + r.seats, 0);
  return (
    <>
      <p className="mb-2 text-sm"><Link href={`/admin/sessions/${s.id}`} className="text-plum-900">← Participants</Link></p>
      <PageHeader
        title={`Groupes · ${e.title.fr}`}
        subtitle={`${adminDate(s.startAt)} · ${d.isDemo ? Object.keys(members).length : seats} participants confirmés · cible ${e.groupConfig.targetSize} (min ${e.groupConfig.minSize}, max ${e.groupConfig.maxSize})`}
        actions={
          <Link href={`/admin/sessions/${s.id}/fiche-hote`} className="rounded-full border border-plum-900 px-4 py-2.5 text-sm font-semibold text-plum-900 hover:bg-plum-50">
            Fiche hôte et marque-places
          </Link>
        }
      />
      {s.groupsNeedReview && (
        <p role="status" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Une réservation a changé depuis l&apos;enregistrement (annulation, déplacement ou nouvelle place) : vérifiez la composition et enregistrez-la à nouveau.
        </p>
      )}
      <div className="mb-4">
        <DemoNote>Glissez-déposez un participant, ou utilisez la liste « Déplacer vers » (mobile et clavier). Une réservation à plusieurs places compte pour toutes ses places.</DemoNote>
      </div>
      {Object.keys(members).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Pas encore de participant confirmé pour former un groupe.</p>
      ) : (
        <GroupsBoard
          initial={groups.map(({ id, label, memberIds }) => ({ id, label, memberIds }))}
          members={members}
          config={e.groupConfig}
          interestLabels={INTEREST_LABELS}
          prefix={e.bookingMode === "social_dinner" ? "Table" : "Équipe"}
          live={!d.isDemo}
          sessionId={s.id}
          status={status}
          unassigned={unassigned}
        />
      )}
    </>
  );
}
