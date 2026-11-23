import { TEMPLATE_UNIVERSES } from "@thecommunity/shared";
import Link from "next/link";
import { TemplateActions } from "@/components/admin/template-actions";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { mediaUrl } from "@/components/media";
import { getAdminData } from "@/lib/data/admin";
import { getTemplateState } from "@/lib/data/admin-templates";

export const metadata = { title: "Modèles" };

/**
 * Paramètres → Modèles (docs/22, décision 21). Créer : partir de zéro puis « Enregistrer comme nouveau modèle ».
 * Modifier : ouvrir le modèle, changer le formulaire, puis « Mettre à jour le modèle ». Masquer, supprimer, remettre d'origine.
 */
export default async function TemplatesPage() {
  const [d, { templates, savedIds }] = await Promise.all([getAdminData(), getTemplateState()]);
  const catName = new Map(d.categories.map((c) => [c.id, c.name.fr]));
  const groups = [...TEMPLATE_UNIVERSES, ...new Set(templates.map((t) => t.values.categoryId).filter((c) => !(TEMPLATE_UNIVERSES as readonly string[]).includes(c)))];
  return (
    <>
      <PageHeader
        title="Modèles"
        subtitle={`${templates.filter((t) => t.isActive).length} modèles proposés à la création d'un événement`}
        actions={<Link href="/admin/experiences/nouvelle?modele=vide" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouveau modèle</Link>}
      />
      <p className="mb-5 max-w-3xl text-sm text-muted">
        Pour <strong>modifier</strong> un modèle : ouvrez-le, changez ce qu&apos;il faut dans le formulaire, puis cliquez sur « Mettre à jour le modèle » en bas de page. Pour en <strong>créer</strong> un : « Nouveau modèle », remplissez le formulaire, donnez-lui un nom et cliquez sur « Enregistrer comme nouveau modèle ». Les événements déjà créés ne changent pas.
      </p>
      <div className="space-y-6">
        {groups.map((g) => {
          const list = templates.filter((t) => t.values.categoryId === g);
          if (list.length === 0) return null;
          return (
            <Card key={g} title={catName.get(g) ?? g}>
              <ul className="divide-y divide-line" data-testid="template-list">
                {list.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- photo du modèle */}
                    <img src={mediaUrl(t.image)} alt="" className="size-16 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{t.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                        {t.tiers && <Badge tone="gray">3 gammes</Badge>}
                        {t.builtIn ? <Badge tone="gray">{savedIds.has(t.id) ? "Du site, modifié" : "Du site"}</Badge> : <Badge tone="green">Créé dans l&apos;appli</Badge>}
                        {!t.isActive && <Badge tone="amber">Masqué</Badge>}
                      </p>
                    </div>
                    <Link href={`/admin/experiences/nouvelle?modele=${t.id}`} className="text-sm font-semibold text-brand-900 underline">Ouvrir</Link>
                    <TemplateActions template={t} saved={savedIds.has(t.id)} live={!d.isDemo} />
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
