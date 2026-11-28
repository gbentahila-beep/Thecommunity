import { VENUE_TIERS } from "@thecommunity/shared";
import { ShowcaseForm, type ShowcaseOption } from "@/components/admin/showcase-form";
import { Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getTemplates } from "@/lib/data/admin-templates";

export const metadata = { title: "Vitrine" };

const TIER_LABEL = { casual: "Décontractée", premium: "Premium", exclusive: "Exclusive" } as const;

/**
 * Vitrine (docs/22, étape M, décision 35) : remplacer TOUS les événements par ceux des modèles validés.
 * Tables : une par modèle et gamme cochés (lieu attribué automatiquement). Activités : seulement si un lieu partenaire
 * actif accueille ce format (renseigné sur sa fiche). Réservé aux super-admins, confirmation « SUPPRIMER ».
 */
export default async function ShowcasePage() {
  const [d, templates] = await Promise.all([getAdminData(), getTemplates()]);
  const active = d.partners.filter((p) => p.status === "active");
  const options: ShowcaseOption[] = [];
  for (const t of templates.filter((x) => x.isActive)) {
    if (t.values.revealPolicy === "on_group_reveal") {
      for (const tier of VENUE_TIERS) {
        const venues = active.filter((p) => (p.formats ?? []).includes(t.id) && (p.tiers ?? []).includes(tier)).length;
        options.push({ key: `${t.id}:${tier}`, templateId: t.id, tier, label: `${t.name} · ${TIER_LABEL[tier]}`, venues, kind: "tables" });
      }
    } else {
      const venues = active.filter((p) => (p.formats ?? []).includes(t.id) && (p.address ?? "").trim().length >= 5 && p.district.trim().length >= 2).length;
      options.push({ key: t.id, templateId: t.id, tier: null, label: t.name, venues, kind: "activity" });
    }
  }
  const canRun = !d.isDemo && d.admin?.role === "superadmin";
  return (
    <>
      <PageHeader title="Vitrine" subtitle="Remplacer tous les événements par ceux des modèles validés" />
      <Card title="Ce que fait cette action">
        <ul className="list-disc space-y-1.5 ps-5 text-sm text-muted">
          <li>Les dates à venir qui ont des participants sont <strong>annulées et remboursées intégralement</strong> ; chaque personne est prévenue.</li>
          <li>Les événements qui n&apos;ont jamais eu de réservation, de demande ni d&apos;avis sont <strong>supprimés définitivement</strong>. Les autres sont archivés (factures, avis et statistiques conservés).</li>
          <li>Puis de nouveaux événements sont créés à partir des modèles cochés, avec leur photo et quelques dates hebdomadaires (au plus tôt dans 2 jours).</li>
          <li>Tables : le lieu est attribué automatiquement à chaque date, parmi les lieux partenaires de la gamme. Activités : créées seulement si un lieu partenaire actif accueille ce format (case « formats » de sa fiche, adresse et quartier remplis).</li>
        </ul>
      </Card>
      <div className="mt-6">
        <ShowcaseForm options={options} canRun={canRun} reason={d.isDemo ? "demo" : canRun ? null : "role"} />
      </div>
    </>
  );
}
