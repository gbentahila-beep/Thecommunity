import { notFound } from "next/navigation";
import Link from "next/link";
import { ExperienceForm } from "@/components/admin/experience-form";
import { Badge, PageHeader } from "@/components/admin/ui";
import { experienceToValues } from "@/lib/admin-forms";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";
import { EXPERIENCE_STATUS_PRO, proFormOptions } from "@/lib/pro-forms";

export const metadata = { title: "Modifier l'activité" };

/** Étape 20 — modifier une activité de l'organisateur (jamais celle d'un autre : contrôlé ici et par le serveur). */
export default async function ProEditActivityPage({ params }: PageProps<"/pro/activites/[id]">) {
  const { id } = await params;
  const space = await requireApprovedOrganizer();
  const d = await getProData(space.organizer.id);
  const e = d.experiences.find((x) => x.id === id);
  if (!e) notFound();
  const options = await proFormOptions();
  const st = EXPERIENCE_STATUS_PRO[e.status] ?? { label: e.status, tone: "gray" as const };
  const nowIso = d.now.toISOString();
  const bookedSeats = d.sessions.filter((s) => s.experienceId === e.id && s.startAt >= nowIso).reduce((a, s) => a + s.seatsConfirmed, 0);
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={e.title.fr}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><Badge tone={st.tone}>{st.label}</Badge>{e.status === "published" && <Link href={`/experiences/${e.slug}`} className="text-plum-900 underline">Voir sur le site</Link>}</span>}
      />
      {e.status === "rejected" && e.rejectionMessage && (
        <p role="note" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900" data-testid="rejection-message"><strong>Message de l&apos;équipe :</strong> {e.rejectionMessage}</p>
      )}
      <ExperienceForm
        initial={experienceToValues(e, undefined, d.now)}
        {...options}
        mode="edit"
        experienceId={e.id}
        existingImages={e.images}
        live={!space.isDemo}
        bookedSeats={bookedSeats}
        organizer={{ orgId: space.organizer.id, currentStatus: e.status }}
      />
    </div>
  );
}
