import { DEFAULT_CANCELLATION_POLICY } from "@thecommunity/shared";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { CompanyForm } from "@/components/admin/company-form";
import { CategoryForm, CityForm } from "@/components/admin/place-forms";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { getCompanySettings, getPaymentSettings, getServiceFee } from "@/lib/data/admin-mail";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { ServiceFeeForm } from "@/components/admin/service-fee-form";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Paramètres" };

export default async function SettingsAdminPage() {
  const [{ cities, categories }, company, me, serviceFee, payment] = await Promise.all([
    getAdminData(),
    getCompanySettings(),
    FIREBASE_ENABLED ? requireAdmin() : Promise.resolve(null),
    getServiceFee(),
    getPaymentSettings(),
  ]);
  return (
    <>
      <PageHeader title="Paramètres" subtitle={me?.role === "superadmin" ? "Modifications réservées aux super-admins, journalisées." : "Lecture seule : modifications réservées aux super-admins."} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Société (factures) et envoi des e-mails" className="xl:col-span-2">
          {company ? (
            <CompanyForm initial={company} canEdit={me?.role === "superadmin"} />
          ) : (
            <p className="text-sm text-muted">Démonstration : la raison sociale, l&apos;ICE, la TVA et l&apos;envoi des e-mails se règlent ici sur le site en ligne (super-admin). Tant qu&apos;ils ne sont pas renseignés, les documents s&apos;intitulent « Reçu — projet d&apos;essai ».</p>
          )}
        </Card>
        <Card title="Mode de paiement" className="xl:col-span-2">
          {payment ? (
            <PaymentSettingsForm initial={payment} canEdit={me?.role === "superadmin"} />
          ) : (
            <p className="text-sm text-muted">Démonstration : le mode de paiement (test ou virement bancaire avec le RIB de la société) se règle ici sur le site en ligne (super-admin).</p>
          )}
        </Card>
        <Card title="Villes" className="xl:col-span-2">
          <ul className="divide-y divide-line">
            {[...cities].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((c) => (
              <li key={c.id}>
                <details className="group py-3">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
                    <span className="font-medium">{c.name.fr}</span>
                    {c.name.ar && <span className="text-muted" lang="ar">{c.name.ar}</span>}
                    <span className="font-mono text-xs text-muted">/{c.id}</span>
                    <Badge tone={c.isActive ? "green" : "amber"}>{c.isActive ? "Ouverte" : c.isComingSoon ? "Bientôt" : "Masquée"}</Badge>
                    <span className="ms-auto text-sm font-semibold text-plum-900">{company ? (me?.role === "superadmin" ? "Modifier" : "Voir") : "Voir"}</span>
                  </summary>
                  <div className="mt-3">
                    <CityForm city={c} canEdit={Boolean(company) && me?.role === "superadmin"} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {company && me?.role === "superadmin" && (
            <details className="mt-3 rounded-xl border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold text-plum-900">+ Ajouter une ville</summary>
              <div className="mt-3"><CityForm canEdit nextOrder={cities.length + 1} /></div>
            </details>
          )}
          {!company && <p className="mt-3 text-xs text-muted">Démonstration : les modifications se font sur le site en ligne (super-admin).</p>}
        </Card>
        <Card title="Univers" className="xl:col-span-2">
          <ul className="divide-y divide-line">
            {[...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((c) => (
              <li key={c.id}>
                <details className="py-3">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
                    <span className="font-medium">{c.name.fr}</span>
                    <span className="font-mono text-xs text-muted">{c.id}</span>
                    {c.isActive === false && <Badge tone="gray">Masqué</Badge>}
                    <span className="ms-auto text-sm font-semibold text-plum-900">{company && me?.role === "superadmin" ? "Modifier" : "Voir"}</span>
                  </summary>
                  <div className="mt-3">
                    <CategoryForm category={c} canEdit={Boolean(company) && me?.role === "superadmin"} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Les cinq univers sont fixes (couleurs et pictogrammes du site) : on peut les renommer, les décrire, les ordonner ou les masquer.</p>
        </Card>
        <Card title="Politique d'annulation par défaut">
          <p className="text-sm font-medium">{DEFAULT_CANCELLATION_POLICY.label.fr}</p>
          <ul className="mt-2 list-disc ps-5 text-sm text-muted">
            {DEFAULT_CANCELLATION_POLICY.rules.map((r) => <li key={r.hoursBefore}>{r.hoursBefore > 0 ? `${r.hoursBefore} h ou plus avant` : "Moins de 48 h avant"} : remboursement {r.refundPercent} %</li>)}
            <li>Annulation par The Host Club : remboursement 100 %</li>
          </ul>
        </Card>
        <Card title="Réservations et frais de service">
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">Blocage d&apos;une place pendant le paiement</dt><dd>15 minutes</dd></div>
            <div><dt className="text-xs text-muted">Fermeture des réservations</dt><dd>12 h avant (dîners) · 2 h (autres)</dd></div>
            <div><dt className="text-xs text-muted">Âge minimum</dt><dd>18 ans</dd></div>
          </dl>
          {serviceFee ? (
            <ServiceFeeForm initial={serviceFee} canEdit={me?.role === "superadmin"} />
          ) : (
            <p className="text-sm text-muted">Frais de service : aucun. Démonstration : ils se règlent ici sur le site en ligne (super-admin).</p>
          )}
        </Card>
      </div>
    </>
  );
}
