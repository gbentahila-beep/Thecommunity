import { ExperienceForm } from "@/components/admin/experience-form";
import { PageHeader } from "@/components/admin/ui";
import { emptyExperienceValues } from "@/lib/admin-forms";
import { requireApprovedOrganizer } from "@/lib/data/organizer";
import { getOrganizerFinance } from "@/lib/data/finance";
import { currentRate, organizerPaymentModels, proFormOptions } from "@/lib/pro-forms";

export const metadata = { title: "Nouvelle activité" };

/** Étape 20 — création d'une activité par l'organisateur (envoyée pour validation). */
export default async function ProNewActivityPage() {
  const space = await requireApprovedOrganizer();
  const [options, models, fin] = await Promise.all([proFormOptions(), organizerPaymentModels(), getOrganizerFinance(space.organizer.id)]);
  const initial = { ...emptyExperienceValues(new Date()), categoryId: space.organizer.categoryIds[0] ?? "move", cityId: space.organizer.cityId };
  return (
    <div className="max-w-4xl">
      <PageHeader title="Nouvelle activité" subtitle="Enregistrez en brouillon, puis « Envoyer pour validation ». Vous êtes prévenu(e) dès la publication." />
      <ExperienceForm initial={initial} {...options} mode="create" live={!space.isDemo} organizer={{ orgId: space.organizer.id, models, ...currentRate(fin.rules, space.organizer.id, initial.categoryId) }} />
    </div>
  );
}
