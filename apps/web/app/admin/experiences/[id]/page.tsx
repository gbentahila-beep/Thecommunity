import Link from "next/link";
import { notFound } from "next/navigation";
import { ExperienceForm } from "@/components/admin/experience-form";
import { adminDate, Card, FillBar, PageHeader } from "@/components/admin/ui";
import { experienceToValues, formOptions } from "@/lib/admin-forms";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Modifier une expérience" };

export default async function EditExperiencePage({ params }: PageProps<"/admin/experiences/[id]">) {
  const { id } = await params;
  const d = await getAdminData();
  const e = d.experiences.get(id);
  if (!e) notFound();
  const sessions = d.sessions.filter((s) => s.experienceId === e.id);
  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-sm"><Link href="/admin/experiences" className="text-plum-900">← Expériences</Link></p>
      <PageHeader title={e.title.fr} subtitle="Modifiable même après publication : les participants concernés seront prévenus en cas de changement de date ou de lieu (phase 7)." />
      <Card title="Dates programmées" className="mb-5">
        <ul className="divide-y divide-line text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>{adminDate(s.startAt)}</span>
              <FillBar value={s.seatsConfirmed} max={s.capacity} />
              <Link href={`/admin/sessions/${s.id}`} className="font-medium text-plum-900">Participants</Link>
            </li>
          ))}
        </ul>
      </Card>
      <ExperienceForm
        mode="edit"
        live={!d.isDemo}
        experienceId={e.id}
        existingImages={e.images ?? []}
        initial={experienceToValues(e, d.economics[e.id], d.now)}
        {...formOptions(d)}
      />
    </div>
  );
}
