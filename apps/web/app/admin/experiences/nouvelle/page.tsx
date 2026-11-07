import { connection } from "next/server";
import Link from "next/link";
import { ExperienceForm } from "@/components/admin/experience-form";
import { PageHeader } from "@/components/admin/ui";
import { emptyExperienceValues, formOptions } from "@/lib/admin-forms";

export const metadata = { title: "Nouvelle expérience" };

export default async function NewExperiencePage() {
  await connection();
  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-sm"><Link href="/admin/experiences" className="text-plum-900">← Expériences</Link></p>
      <PageHeader title="Nouvelle expérience" subtitle="Fiche, format, économie et dates en une seule fois." />
      <ExperienceForm mode="create" initial={emptyExperienceValues(new Date())} {...formOptions()} />
    </div>
  );
}
