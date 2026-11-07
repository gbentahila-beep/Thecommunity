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
  const s = d.sessions.find((x) => x.id === id);
  if (!s) notFound();
  const e = d.experiences.get(s.experienceId)!;
  if (!e.groupConfig) notFound();
  const groups = d.groups.filter((g) => g.sessionId === s.id);
  const members: Record<string, BoardMember> = Object.fromEntries(
    groups.flatMap((g) => g.memberIds).map((uid) => [uid, memberSummary(d.usersById.get(uid)!)]),
  );
  return (
    <>
      <p className="mb-2 text-sm"><Link href={`/admin/sessions/${s.id}`} className="text-plum-900">← Participants</Link></p>
      <PageHeader
        title={`Groupes · ${e.title.fr}`}
        subtitle={`${adminDate(s.startAt)} · ${Object.keys(members).length} participants confirmés · cible ${e.groupConfig.targetSize} (min ${e.groupConfig.minSize}, max ${e.groupConfig.maxSize})`}
      />
      <div className="mb-4">
        <DemoNote>
          Proposition provisoire : répartition par âge en serpentin. L&apos;algorithme de matching (langues, intérêts, âges, rencontres passées) arrive en phase 6.
          Glissez-déposez un participant, ou utilisez la liste « Déplacer vers » (mobile et clavier).
        </DemoNote>
      </div>
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Pas encore assez de participants pour former un groupe.</p>
      ) : (
        <GroupsBoard
          initial={groups.map(({ id, label, memberIds }) => ({ id, label, memberIds }))}
          members={members}
          config={e.groupConfig}
          interestLabels={INTEREST_LABELS}
          prefix={e.bookingMode === "social_dinner" ? "Table" : "Équipe"}
        />
      )}
    </>
  );
}
