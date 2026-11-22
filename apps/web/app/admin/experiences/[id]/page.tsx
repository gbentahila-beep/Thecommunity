import { PAYMENT_MODELS } from "@thecommunity/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExperienceActions } from "@/components/admin/experience-actions";
import { ExperienceForm } from "@/components/admin/experience-form";
import { ExperienceReview } from "@/components/admin/organizer-actions";
import { adminDate, Card, FillBar, PageHeader } from "@/components/admin/ui";
import { experienceToValues, formOptions } from "@/lib/admin-forms";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { getWenzyPrice } from "@/lib/data/admin-mail";
import { getCancellationPolicies } from "@/lib/data/policies";

export const metadata = { title: "Modifier une expérience" };

export default async function EditExperiencePage({ params }: PageProps<"/admin/experiences/[id]">) {
  const { id } = await params;
  const [d, policies, wenzyPrice] = await Promise.all([getAdminData(), getCancellationPolicies(), getWenzyPrice()]);
  const e = d.experiences.get(id);
  if (!e) notFound();
  const sessions = d.sessions.filter((s) => s.experienceId === e.id);
  const me = d.isDemo ? null : await requireAdmin();
  const archived = e.status === "archived";
  const bookedSeats = sessions.filter((s) => new Date(s.startAt).getTime() > d.now.getTime()).reduce((n, s) => n + s.seatsConfirmed, 0);
  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-sm"><Link href="/admin/experiences" className="text-brand-900">← Expériences</Link></p>
      <PageHeader title={e.title.fr} subtitle="Modifiable même après publication : en cas de changement de date ou de lieu, les participants sont prévenus automatiquement (notification + e-mail)." />
      {e.organizerId && (
        <Card title={`Activité proposée par ${e.organizerSnapshot?.name ?? "un organisateur"}`} className="mb-5">
          <p className="mb-3 text-sm text-muted">
            {e.status === "pending_review" ? "Envoyée pour validation : publiez-la ou refusez-la avec un message (l'organisateur est prévenu)." : e.reviewFlag ? "Publiée, puis modifiée par l'organisateur : relisez la fiche ci-dessous." : e.status === "rejected" ? `Refusée : « ${e.rejectionMessage ?? ""} »` : "Les réglages économiques suivent le contrat organisateur (commission)."}{" "}
            <Link href={`/admin/organisateurs/${e.organizerId}`} className="font-semibold text-brand-900 underline">Voir l&apos;organisateur</Link>
          </p>
          <ExperienceReview experienceId={e.id} status={e.status} reviewFlag={Boolean(e.reviewFlag)} live={!d.isDemo} />
        </Card>
      )}
      {archived && (
        <p role="status" className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Expérience <strong>archivée</strong> : elle n&apos;apparaît plus sur le site. Réactivez-la pour la republier ou lui ajouter des dates.
        </p>
      )}
      <Card title="Archiver ou supprimer" className="mb-5">
        <ExperienceActions id={e.id} status={e.status} canDelete={me?.role === "superadmin"} live={!d.isDemo} />
      </Card>
      <Card title="Dates programmées" className="mb-5">
        <ul className="divide-y divide-line text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>{adminDate(s.startAt)}</span>
              <FillBar value={s.seatsConfirmed} max={s.capacity} />
              <Link href={`/admin/sessions/${s.id}`} className="font-medium text-brand-900">Participants</Link>
            </li>
          ))}
        </ul>
      </Card>
      <ExperienceForm
        mode="edit"
        live={!d.isDemo}
        experienceId={e.id}
        existingImages={e.images ?? []}
        bookedSeats={bookedSeats}
        initial={experienceToValues(e, d.economics[e.id], d.now)}
        {...formOptions(d, policies)}
        {...(wenzyPrice !== null ? { wenzyPrice } : {})}
        {...(e.organizerId ? { organizer: { orgId: e.organizerId, currentStatus: e.status, asTeam: true, models: [...PAYMENT_MODELS] } } : {})}
      />
    </div>
  );
}
