import { Card, PageHeader } from "@/components/admin/ui";
import { OrganizerProfileForm } from "@/components/pro/organizer-profile-form";
import { requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Profil public" };

/** Étape 20 — profil public de l'organisateur (sa page sur le site, étape 23) et coordonnées. */
export default async function ProProfilePage() {
  const space = await requireApprovedOrganizer();
  const o = space.organizer;
  const det = space.details;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Profil public" subtitle={`${o.name} · nom et catégories modifiables par l'équipe (écrivez-nous).`} />
      <Card>
        <OrganizerProfileForm
          orgId={o.id}
          live={!space.isDemo}
          initial={{ description: o.description.fr ?? "", descriptionAr: o.description.ar ?? "", descriptionEn: o.description.en ?? "", website: o.website ?? "", instagram: o.instagram ?? "", phone: det?.phone ?? "", address: det?.address ?? "", logoPath: o.logoPath ?? "" }}
        />
      </Card>
    </div>
  );
}
