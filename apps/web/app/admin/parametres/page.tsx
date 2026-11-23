import { describePolicy } from "@thecommunity/shared";
import { PolicyForm } from "@/components/admin/policy-forms";
import { getCancellationPolicies } from "@/lib/data/policies";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { CompanyForm } from "@/components/admin/company-form";
import { CategoryForm, CityForm } from "@/components/admin/place-forms";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { getAllocationSettings, getCompanySettings, getPaymentSettings, getWenzyPrice } from "@/lib/data/admin-mail";
import { AllocationSettingsForm, WhatsAppSettingsForm } from "@/components/admin/allocation-settings-form";
import { DEFAULT_ALLOCATION_SETTINGS } from "@thecommunity/shared";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { WenzyPriceForm } from "@/components/admin/wenzy-price-form";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Paramètres" };

export default async function SettingsAdminPage() {
  const [{ cities, categories: allCategories }, company, me, wenzyPrice, payment] = await Promise.all([
    getAdminData(),
    getCompanySettings(),
    FIREBASE_ENABLED ? requireAdmin() : Promise.resolve(null),
    getWenzyPrice(),
    getPaymentSettings(),
  ]);
  const [policies, alloc] = await Promise.all([getCancellationPolicies(), getAllocationSettings()]);
  const byOrder = (a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0);
  // Étape R : les anciens univers retirés (Jeux, Rencontres, Culture) ne sont plus listés.
  const categories = allCategories.filter((c) => !(c as { retiredAt?: unknown }).retiredAt);
  const mains = categories.filter((c) => !c.parentId).sort(byOrder);
  const orderedCategories = mains.flatMap((m) => [m, ...categories.filter((c) => c.parentId === m.id).sort(byOrder)]);
  // Sous-catégories dont la parente a disparu : listées à la fin pour rester modifiables.
  orderedCategories.push(...categories.filter((c) => c.parentId && !mains.some((m) => m.id === c.parentId)));
  const parents = mains.map((c) => ({ id: c.id, label: c.name.fr }));
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
                    <span className="ms-auto text-sm font-semibold text-brand-900">{company ? (me?.role === "superadmin" ? "Modifier" : "Voir") : "Voir"}</span>
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
              <summary className="cursor-pointer text-sm font-semibold text-brand-900">+ Ajouter une ville</summary>
              <div className="mt-3"><CityForm canEdit nextOrder={cities.length + 1} /></div>
            </details>
          )}
          {!company && <p className="mt-3 text-xs text-muted">Démonstration : les modifications se font sur le site en ligne (super-admin).</p>}
        </Card>
        <Card title="Catégories (univers)" className="xl:col-span-2">
          {/* Étape 19 : catégories dynamiques ; les sous-catégories sont listées sous leur catégorie principale. */}
          <ul className="divide-y divide-line">
            {orderedCategories.map((c) => (
              <li key={c.id} className={c.parentId ? "ps-6" : undefined}>
                <details className="py-3">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
                    {c.parentId && <span aria-hidden className="text-muted">↳</span>}
                    <span className="font-medium">{c.name.fr}</span>
                    <span className="font-mono text-xs text-muted">/{c.id}</span>
                    {c.parentId && <Badge tone="gray">Sous-catégorie</Badge>}
                    {c.isActive === false && <Badge tone="gray">Masquée</Badge>}
                    <span className="ms-auto text-sm font-semibold text-brand-900">{company && me?.role === "superadmin" ? "Modifier" : "Voir"}</span>
                  </summary>
                  <div className="mt-3">
                    <CategoryForm category={c} canEdit={Boolean(company) && me?.role === "superadmin"} parents={parents} hasChildren={categories.some((x) => x.parentId === c.id)} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {company && me?.role === "superadmin" && (
            <details className="mt-3 rounded-xl border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand-900">+ Ajouter une catégorie ou une sous-catégorie</summary>
              <div className="mt-3"><CategoryForm canEdit parents={parents} nextOrder={categories.length + 1} /></div>
            </details>
          )}
          <p className="mt-3 text-xs text-muted">Les 4 univers (Tables, Bouger, Sortir, Découvrir) gardent leurs adresses (/casablanca/eat…). Une nouvelle catégorie apparaît dans le menu, sur l&apos;accueil et dans le formulaire des expériences dès qu&apos;elle est visible ; une sous-catégorie a sa propre page (/casablanca/padel) et se choisit sur la fiche de l&apos;expérience. {!company && "Démonstration : les modifications se font sur le site en ligne (super-admin)."}</p>
        </Card>
        <Card title="Politiques d'annulation" className="xl:col-span-2">
          {/* Étape 22 : politiques à paliers, choisies sur chaque activité et copiées sur chaque réservation. */}
          <ul className="mb-4 divide-y divide-line text-sm" data-testid="policies">
            {policies.map((p) => (
              <li key={p.id} className="py-2">
                <span className="font-medium">{p.label.fr}</span> <span className="font-mono text-xs text-muted">{p.id}</span>
                <p className="text-muted">{describePolicy(p.rules)} · annulation par l&apos;organisateur ou par Wenzy : 100 %</p>
              </li>
            ))}
          </ul>
          <details className="rounded-xl border border-dashed border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">+ Nouvelle politique</summary>
            <div className="mt-3"><PolicyForm live={Boolean(company)} canEdit={!company || me?.role === "superadmin"} /></div>
          </details>
        </Card>
        <Card title="Prix Wenzy et réservations">
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">Blocage d&apos;une place pendant le paiement</dt><dd>15 minutes</dd></div>
            <div><dt className="text-xs text-muted">Fermeture des réservations</dt><dd>12 h avant (Tables ; au plus tard 18 h la veille pour un début avant 14 h) · 2 h (autres)</dd></div>
            <div><dt className="text-xs text-muted">Âge minimum</dt><dd>18 ans</dd></div>
          </dl>
          {wenzyPrice !== null ? (
            <WenzyPriceForm initial={wenzyPrice} canEdit={me?.role === "superadmin"} />
          ) : (
            <p className="text-sm text-muted" data-testid="wenzy-price-demo">Prix Wenzy : 35 DH par place, frais compris. Démonstration : il se règle ici sur le site en ligne (super-admin).</p>
          )}
        </Card>
        <Card title="Lieux : délais de réponse">
          <AllocationSettingsForm initial={alloc?.allocation ?? DEFAULT_ALLOCATION_SETTINGS} live={Boolean(alloc)} />
        </Card>
        <Card title="WhatsApp">
          {alloc ? <WhatsAppSettingsForm initial={{ ...alloc.whatsapp }} canEdit={me?.role === "superadmin"} /> : <p className="text-sm text-muted">Démonstration : messages prédéfinis à envoyer depuis WhatsApp Web ; l&apos;envoi automatique s&apos;active avec un compte WhatsApp Business API.</p>}
        </Card>
      </div>
    </>
  );
}
