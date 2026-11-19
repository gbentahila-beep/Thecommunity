import Link from "next/link";
import { ExperienceForm } from "@/components/admin/experience-form";
import { PageHeader } from "@/components/admin/ui";
import { emptyExperienceValues, formOptions, proposalToValues } from "@/lib/admin-forms";
import { getAdminData } from "@/lib/data/admin";
import { getPendingProposal } from "@/lib/data/proposals";

export const metadata = { title: "Nouvelle expérience" };

export default async function NewExperiencePage({ searchParams }: PageProps<"/admin/experiences/nouvelle">) {
  const sp = await searchParams;
  const d = await getAdminData();
  // 18d : création à partir de la sortie proposée par un membre de confiance (formulaire pré-rempli).
  const proposal = typeof sp.proposition === "string" ? await getPendingProposal(sp.proposition) : null;
  const initial = proposal ? proposalToValues(proposal, d.now) : emptyExperienceValues(d.now);
  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-sm"><Link href={proposal ? "/admin/propositions" : "/admin/experiences"} className="text-plum-900">← {proposal ? "Sorties proposées" : "Expériences"}</Link></p>
      <PageHeader title="Nouvelle expérience" subtitle="Fiche, format, économie et dates en une seule fois." />
      {proposal && (
        <p role="status" data-testid="from-proposal" className="mb-4 rounded-2xl bg-plum-50 px-4 py-3 text-sm text-plum-900">
          Pré-remplie à partir de la proposition de <strong>{proposal.firstName}</strong> (« {proposal.title} »). Complétez le lieu exact, le prix, la sécurité et les dates :
          rien n&apos;est publié avant votre enregistrement, et {proposal.firstName} est prévenu·e quand la fiche est créée. Dates envisagées : {proposal.datesIdea}.
        </p>
      )}
      <ExperienceForm mode="create" live={!d.isDemo} initial={initial} {...formOptions(d)} />
    </div>
  );
}
