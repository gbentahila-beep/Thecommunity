import { Plus } from "lucide-react";
import Link from "next/link";
import { ApplicationActions } from "@/components/admin/application-actions";
import { PARTNER_STATUS_LABELS, PARTNER_STATUS_TONES, PARTNER_TYPE_LABELS } from "@/components/admin/partner-labels";
import { adminDate, Badge, Card, dh, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getPartnerApplications } from "@/lib/data/admin-help";

export const metadata = { title: "Partenaires" };
const FILTERS = [
  { key: "current", label: "Actifs et prospects" },
  { key: "archived", label: "Archivés" },
] as const;

export default async function PartnersAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filter = sp.vue === "archived" ? "archived" : "current";
  const [d, { applications, isDemo }] = await Promise.all([getAdminData(), getPartnerApplications()]);
  const shown = d.partners
    .filter((p) => (filter === "archived" ? p.status === "archived" : p.status !== "archived"))
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name, "fr") : a.status === "active" ? -1 : 1));
  const pending = applications.filter((a) => a.status === "new");
  return (
    <>
      <PageHeader
        title="Partenaires"
        subtitle={`${d.partners.filter((p) => p.status !== "archived").length} partenaires · ${pending.length} candidature(s) à traiter`}
        actions={
          <Link href="/admin/partenaires/nouveau" className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">
            <Plus className="size-4" aria-hidden /> Nouveau partenaire
          </Link>
        }
      />
      {sp.supprime === "1" && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Partenaire supprimé.</p>}

      <Card title="Candidatures (formulaire « Devenir partenaire »)" className="mb-6">
        {isDemo ? (
          <p className="text-sm text-muted">Démonstration : les candidatures sont enregistrées sur le site en ligne.</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-muted">Aucune candidature pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {applications.map((a) => (
              <li key={a.id} className={`py-4 ${a.status !== "new" ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {a.businessName} <span className="font-normal text-muted">· {PARTNER_TYPE_LABELS[a.type] ?? a.type} · {a.city}</span>{" "}
                    {a.status === "converted" && <Badge tone="green">Partenaire créé</Badge>}
                    {a.status === "declined" && <Badge tone="gray">Écartée</Badge>}
                  </p>
                  <span className="text-xs text-muted">{a.createdAt ? adminDate(a.createdAt) : ""}</span>
                </div>
                <p className="mt-1 text-sm">
                  {a.contactName} · <a href={`mailto:${a.email}`} className="text-plum-900 underline">{a.email}</a>
                  {a.phone && <> · <a href={`tel:${a.phone}`} className="text-plum-900 underline">{a.phone}</a></>}
                  {a.link && <> · <span className="break-all">{a.link}</span></>}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink/85">{a.message}</p>
                <div className="mt-3"><ApplicationActions applicationId={a.id} status={a.status} partnerId={a.partnerId} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <nav aria-label="Filtrer les partenaires" className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "current" ? "/admin/partenaires" : "/admin/partenaires?vue=archived"}
            aria-current={filter === f.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${filter === f.key ? "bg-plum-900 text-white" : "bg-white text-ink hover:bg-cream"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <Card><p className="text-sm text-muted">{filter === "archived" ? "Aucun partenaire archivé." : "Aucun partenaire : ajoutez le premier."}</p></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const exps = Object.entries(d.economics).filter(([, eco]) => eco.partnerId === p.id).flatMap(([id]) => (d.experiences.has(id) ? [d.experiences.get(id)!] : []));
            const revenue = d.reservations.filter((r) => r.status === "confirmed" && exps.some((e) => e.id === r.experienceId)).reduce((a, r) => a + r.total, 0);
            const commission = p.model ? p.model === "commission" : p.defaultCommissionPercent > 0;
            return (
              <Link key={p.id} href={`/admin/partenaires/${p.id}`} className="block rounded-2xl bg-white p-4 shadow-card transition hover:shadow-float sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-ink">{p.name}</h2>
                    <p className="text-sm text-muted">{PARTNER_TYPE_LABELS[p.type] ?? p.type}{p.district ? ` · ${p.district}` : ""}</p>
                  </div>
                  <Badge tone={PARTNER_STATUS_TONES[p.status]}>{PARTNER_STATUS_LABELS[p.status]}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted">Contact</dt><dd>{p.contactName || "—"}<span className="block truncate text-xs text-muted">{p.contactEmail}</span></dd></div>
                  <div><dt className="text-xs text-muted">Modèle</dt><dd className="tabular-nums">{commission ? `Commission ${p.defaultCommissionPercent} %` : "Achat de prestation"}</dd></div>
                  <div><dt className="text-xs text-muted">Expériences</dt><dd>{exps.map((e) => e.title.fr).join(", ") || "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Ventes confirmées</dt><dd className="tabular-nums">{dh(revenue)}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
