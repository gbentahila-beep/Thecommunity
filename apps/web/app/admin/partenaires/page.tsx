import { adminDate, Badge, Card, dh, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getPartnerApplications } from "@/lib/data/admin-help";

export const metadata = { title: "Partenaires" };
const TYPES = { restaurant: "Restaurant", studio: "Studio", venue: "Lieu", workshop: "Atelier" } as const;
const APPLICATION_TYPES: Record<string, string> = {
  restaurant: "Restaurant ou café",
  studio: "Studio sport / bien-être",
  workshop: "Atelier créatif",
  venue: "Lieu",
  organizer: "Organisateur indépendant",
  other: "Autre",
};

export default async function PartnersAdminPage() {
  const [d, { applications, isDemo }] = await Promise.all([getAdminData(), getPartnerApplications()]);
  return (
    <>
      <PageHeader title="Partenaires" subtitle={`${d.partners.length} partenaires · ${applications.length} candidature(s) reçue(s)`} />
      <Card title="Candidatures reçues (formulaire « Devenir partenaire »)" className="mb-6">
        {isDemo ? (
          <p className="text-sm text-muted">Démonstration : les candidatures sont enregistrées sur le site en ligne.</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-muted">Aucune candidature pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {applications.map((a) => (
              <li key={a.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {a.businessName} <span className="font-normal text-muted">· {APPLICATION_TYPES[a.type] ?? a.type} · {a.city}</span>
                  </p>
                  <span className="text-xs text-muted">{a.createdAt ? adminDate(a.createdAt) : ""}</span>
                </div>
                <p className="mt-1 text-sm">
                  {a.contactName} · <a href={`mailto:${a.email}`} className="text-plum-900 underline">{a.email}</a>
                  {a.phone && <> · <a href={`tel:${a.phone}`} className="text-plum-900 underline">{a.phone}</a></>}
                  {a.link && <> · <span className="break-all">{a.link}</span></>}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink/85">{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {d.partners.map((p) => {
          const exps = Object.entries(d.economics).filter(([, eco]) => eco.partnerId === p.id).flatMap(([id]) => (d.experiences.has(id) ? [d.experiences.get(id)!] : []));
          const revenue = d.reservations.filter((r) => r.status === "confirmed" && exps.some((e) => e.id === r.experienceId)).reduce((a, r) => a + r.total, 0);
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-ink">{p.name}</h2>
                  <p className="text-sm text-muted">{TYPES[p.type]} · {p.district}</p>
                </div>
                <Badge tone={p.status === "active" ? "green" : "amber"}>{p.status === "active" ? "Actif" : "Prospect"}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted">Contact</dt><dd>{p.contactName}<span className="block text-xs text-muted">{p.contactEmail}</span></dd></div>
                <div><dt className="text-xs text-muted">Commission par défaut</dt><dd className="tabular-nums">{p.defaultCommissionPercent ? `${p.defaultCommissionPercent} %` : "Achat-revente"}</dd></div>
                <div><dt className="text-xs text-muted">Expériences</dt><dd>{exps.map((e) => e.title.fr).join(", ") || "—"}</dd></div>
                <div><dt className="text-xs text-muted">Ventes à venir</dt><dd className="tabular-nums">{dh(revenue)}</dd></div>
              </dl>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">Création et modification des partenaires, documents et RIB (accès restreint) : phase 3. Espace organisateur : version ultérieure.</p>
    </>
  );
}
