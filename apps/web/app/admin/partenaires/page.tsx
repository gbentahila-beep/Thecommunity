import { Badge, Card, dh, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { DEMO_ECONOMICS } from "@/lib/data/demo-admin";

export const metadata = { title: "Partenaires" };
const TYPES = { restaurant: "Restaurant", studio: "Studio", venue: "Lieu", workshop: "Atelier" } as const;

export default async function PartnersAdminPage() {
  const d = await getAdminData();
  return (
    <>
      <PageHeader title="Partenaires" subtitle={`${d.partners.length} partenaires`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {d.partners.map((p) => {
          const exps = Object.entries(DEMO_ECONOMICS).filter(([, eco]) => eco.partnerId === p.id).map(([id]) => d.experiences.get(id)!);
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
