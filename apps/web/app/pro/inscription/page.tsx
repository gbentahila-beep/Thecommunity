import { ORGANIZER_UNIVERSES } from "@thecommunity/shared";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { OrganizerApplicationForm, type ApplicationValues } from "@/components/pro/organizer-application-form";
import { getCategories, getCities } from "@/lib/data";
import { getOrganizerSpace } from "@/lib/data/organizer";

export const metadata = { title: "Créer mon compte organisateur" };

/** Étape 20 — inscription organisateur (ou complément demandé par l'équipe, formulaire pré-rempli). */
export default async function ProApplicationPage() {
  const space = await getOrganizerSpace();
  const resubmit = space.status === "info_requested";
  if (!space.isDemo && space.status !== "none" && !resubmit) redirect("/pro");
  const [cities, categories] = await Promise.all([getCities(), getCategories()]);
  const o = resubmit ? space.organizer : null;
  const det = resubmit ? space.details : null;
  const initial: ApplicationValues = {
    businessName: o?.name ?? "",
    contactName: det?.contactName ?? "",
    email: det?.email ?? space.user?.email ?? "",
    phone: det?.phone ?? "",
    cityId: o?.cityId ?? "casablanca",
    address: det?.address ?? "",
    categoryIds: o?.categoryIds ?? [],
    description: o?.description.fr ?? "",
    website: o?.website ?? "",
    instagram: o?.instagram ?? "",
    documents: det?.documents ?? [],
    logoPath: det?.pendingLogoPath ?? "",
  };
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={resubmit ? "Compléter ma demande" : "Créer mon compte organisateur"}
        subtitle={resubmit && det?.decisionMessage ? `Message de l'équipe : ${det.decisionMessage}` : "Quelques minutes suffisent. L'équipe relit chaque demande avant d'ouvrir l'espace organisateur."}
      />
      <OrganizerApplicationForm
        initial={initial}
        cities={cities.filter((c) => c.isActive).map((c) => ({ id: c.id, label: c.name.fr }))}
        categories={categories.filter((c) => ORGANIZER_UNIVERSES.includes(c.id)).map((c) => ({ id: c.id, label: c.name.fr }))}
        uid={space.user?.uid ?? "demo"}
        live={!space.isDemo}
        emailVerified={space.user?.emailVerified ?? true}
        resubmit={resubmit}
      />
    </div>
  );
}
