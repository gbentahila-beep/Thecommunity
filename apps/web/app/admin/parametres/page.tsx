import { DEFAULT_CANCELLATION_POLICY } from "@thecommunity/shared";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { DEMO_CATEGORIES, DEMO_CITIES } from "@/lib/data/demo";

export const metadata = { title: "Paramètres" };

export default function SettingsAdminPage() {
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Lecture seule en phase 2 · modification réservée aux super-admins en phase 3, journalisée." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Villes">
          <Table head={["Ville", "Fuseau", "Devise", "Statut"]} caption="Villes">
            {DEMO_CITIES.map((c) => (
              <tr key={c.id}><td className="font-medium">{c.name.fr} <span className="text-muted" lang="ar">· {c.name.ar}</span></td><td className="text-muted">{c.timezone}</td><td>{c.currency}</td><td><Badge tone={c.isActive ? "green" : "amber"}>{c.isActive ? "Ouverte" : "Bientôt"}</Badge></td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Univers (catégories)">
          <Table head={["Clé", "Nom", "Mode par défaut"]} caption="Univers">
            {DEMO_CATEGORIES.map((c) => (<tr key={c.id}><td className="font-mono text-xs">{c.id}</td><td>{c.name.fr}</td><td className="text-muted">{c.defaultBookingMode}</td></tr>))}
          </Table>
        </Card>
        <Card title="Politique d'annulation par défaut">
          <p className="text-sm font-medium">{DEFAULT_CANCELLATION_POLICY.label.fr}</p>
          <ul className="mt-2 list-disc ps-5 text-sm text-muted">
            {DEFAULT_CANCELLATION_POLICY.rules.map((r) => <li key={r.hoursBefore}>{r.hoursBefore > 0 ? `${r.hoursBefore} h ou plus avant` : "Moins de 48 h avant"} : remboursement {r.refundPercent} %</li>)}
            <li>Annulation par The Community : remboursement 100 %</li>
          </ul>
        </Card>
        <Card title="Réservations">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">Blocage d&apos;une place pendant le paiement</dt><dd>15 minutes</dd></div>
            <div><dt className="text-xs text-muted">Fermeture des réservations</dt><dd>12 h avant (dîners) · 2 h (autres)</dd></div>
            <div><dt className="text-xs text-muted">Âge minimum</dt><dd>18 ans</dd></div>
            <div><dt className="text-xs text-muted">Frais de service</dt><dd>Aucun</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
