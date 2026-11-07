import Link from "next/link";
import { PartnerForm } from "@/components/admin/partner-form";
import { Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { emptyPartnerValues } from "@/lib/partner-forms";

export const metadata = { title: "Nouveau partenaire" };

export default async function NewPartnerPage() {
  const d = await getAdminData();
  return (
    <>
      <Link href="/admin/partenaires" className="mb-3 inline-block text-sm font-medium text-plum-900">← Partenaires</Link>
      <PageHeader title="Nouveau partenaire" subtitle="Restaurant, studio, atelier, lieu ou organisateur qui accueille nos groupes." />
      <Card>
        <PartnerForm initial={emptyPartnerValues()} cities={d.cities.map((c) => ({ id: c.id, label: c.name.fr }))} live={!d.isDemo} />
      </Card>
    </>
  );
}
