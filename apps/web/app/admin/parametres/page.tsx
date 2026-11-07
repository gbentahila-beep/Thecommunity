import { DEFAULT_CANCELLATION_POLICY } from "@thecommunity/shared";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { CompanyForm } from "@/components/admin/company-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { getCompanySettings } from "@/lib/data/admin-mail";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Paramètres" };

export default async function SettingsAdminPage() {
  const [{ cities, categories }, company, me] = await Promise.all([
    getAdminData(),
    getCompanySettings(),
    FIREBASE_ENABLED ? requireAdmin() : Promise.resolve(null),
  ]);
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Lecture seule en phase 2 · modification réservée aux super-admins en phase 3, journalisée." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Société (factures) et envoi des e-mails" className="xl:col-span-2">
          {company ? (
            <CompanyForm initial={company} canEdit={me?.role === "superadmin"} />
          ) : (
            <p className="text-sm text-muted">Démonstration : la raison sociale, l&apos;ICE, la TVA et l&apos;envoi des e-mails se règlent ici sur le site en ligne (super-admin). Tant qu&apos;ils ne sont pas renseignés, les documents s&apos;intitulent « Reçu — projet d&apos;essai ».</p>
          )}
        </Card>
        <Card title="Villes">
          <Table head={["Ville", "Fuseau", "Devise", "Statut"]} caption="Villes">
            {cities.map((c) => (
              <tr key={c.id}><td className="font-medium">{c.name.fr} <span className="text-muted" lang="ar">· {c.name.ar}</span></td><td className="text-muted">{c.timezone}</td><td>{c.currency}</td><td><Badge tone={c.isActive ? "green" : "amber"}>{c.isActive ? "Ouverte" : "Bientôt"}</Badge></td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Univers (catégories)">
          <Table head={["Clé", "Nom", "Mode par défaut"]} caption="Univers">
            {categories.map((c) => (<tr key={c.id}><td className="font-mono text-xs">{c.id}</td><td>{c.name.fr}</td><td className="text-muted">{c.defaultBookingMode}</td></tr>))}
          </Table>
        </Card>
        <Card title="Politique d'annulation par défaut">
          <p className="text-sm font-medium">{DEFAULT_CANCELLATION_POLICY.label.fr}</p>
          <ul className="mt-2 list-disc ps-5 text-sm text-muted">
            {DEFAULT_CANCELLATION_POLICY.rules.map((r) => <li key={r.hoursBefore}>{r.hoursBefore > 0 ? `${r.hoursBefore} h ou plus avant` : "Moins de 48 h avant"} : remboursement {r.refundPercent} %</li>)}
            <li>Annulation par The Host Club : remboursement 100 %</li>
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
