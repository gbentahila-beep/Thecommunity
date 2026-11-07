import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerActions } from "@/components/admin/partner-actions";
import { PartnerForm } from "@/components/admin/partner-form";
import { PARTNER_STATUS_LABELS, PARTNER_STATUS_TONES } from "@/components/admin/partner-labels";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { partnerToValues } from "@/lib/partner-forms";

export const metadata = { title: "Partenaire" };

export default async function PartnerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp, d] = await Promise.all([params, searchParams, getAdminData()]);
  const p = d.partners.find((x) => x.id === id);
  if (!p) notFound();
  const me = d.isDemo ? null : await requireAdmin();
  const exps = Object.entries(d.economics).filter(([, eco]) => eco.partnerId === p.id).flatMap(([eid]) => (d.experiences.has(eid) ? [d.experiences.get(eid)!] : []));
  return (
    <>
      <Link href="/admin/partenaires" className="mb-3 inline-block text-sm font-medium text-plum-900">← Partenaires</Link>
      <PageHeader title={p.name} subtitle={<Badge tone={PARTNER_STATUS_TONES[p.status]}>{PARTNER_STATUS_LABELS[p.status]}</Badge>} />
      {sp.cree === "1" && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Partenaire ajouté.</p>}
      {sp.depuis === "candidature" && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Partenaire créé depuis la candidature (statut « prospect »). Complétez la fiche après votre échange.</p>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <PartnerForm id={p.id} initial={partnerToValues(p)} cities={d.cities.map((c) => ({ id: c.id, label: c.name.fr }))} live={!d.isDemo} />
        </Card>
        <div className="space-y-6">
          <Card title="Expériences rattachées">
            {exps.length === 0 ? (
              <p className="text-sm text-muted">Aucune. Le partenaire se choisit dans la fiche d&apos;une expérience (section « Partenaire et économie »).</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {exps.map((e) => <li key={e.id}><Link href={`/admin/experiences/${e.id}`} className="text-plum-900 underline">{e.title.fr}</Link></li>)}
              </ul>
            )}
          </Card>
          <Card title="Archiver ou supprimer">
            <p className="mb-3 text-sm text-muted">Un partenaire archivé n&apos;est plus proposé dans les fiches d&apos;expériences ; son historique est conservé.</p>
            {d.isDemo ? (
              <p className="text-xs text-muted">Démonstration : disponible sur le site en ligne.</p>
            ) : (
              <PartnerActions id={p.id} status={p.status} canDelete={me?.role === "superadmin"} linkedCount={exps.length} />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
