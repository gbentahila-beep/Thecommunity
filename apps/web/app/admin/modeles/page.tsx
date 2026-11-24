import { isCalendarTemplate, TEMPLATE_UNIVERSES, type EventTemplate } from "@thecommunity/shared";
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
  const byUniverse = (all: EventTemplate[]) =>
    groups.map((g) => {
      const list = all.filter((t) => t.values.categoryId === g);
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
    });
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/experiences" className="text-brand-900">← Événements</Link></p>
      <PageHeader
        title="Modèles"
        subtitle={`${templates.filter((t) => t.isActive).length} modèles proposés à la création d'un événement`}
        actions={<Link href="/admin/experiences/nouvelle?modele=vide" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouveau modèle</Link>}
      />
      <p className="mb-5 max-w-3xl text-sm text-muted">
        Pour <strong>modifier</strong> un modèle : ouvrez-le, changez ce qu&apos;il faut dans le formulaire, puis cliquez sur « Mettre à jour le modèle » en bas de page. Pour en <strong>créer</strong> un : « Nouveau modèle », remplissez le formulaire, donnez-lui un nom et cliquez sur « Enregistrer comme nouveau modèle ». Les événements déjà créés ne changent pas.
      </p>
      {/* docs/25 : d'abord les modèles du calendrier de lancement, puis ceux gardés pour plus tard (repliés). */}
      <section data-testid="templates-calendar">
        <h2 className="mb-1 text-lg font-semibold text-ink">Au calendrier</h2>
        <p className="mb-4 text-sm text-muted">Les rendez-vous de la semaine (dîner, café, brunch), les activités du samedi et les événements.</p>
        <div className="space-y-6">{byUniverse(templates.filter(isCalendarTemplate))}</div>
      </section>
      <details className="mt-10" data-testid="templates-later">
        <summary className="cursor-pointer text-lg font-semibold text-ink">Pour plus tard ({templates.filter((t) => !isCalendarTemplate(t)).length})</summary>
        <p className="mt-1 mb-4 text-sm text-muted">Formats prêts mais pas au programme du lancement (déjeuner, quiz, soirée jeux…). Ils restent utilisables pour un événement ponctuel.</p>
        <div className="space-y-6">{byUniverse(templates.filter((t) => !isCalendarTemplate(t)))}</div>
      </details>
    </>
  );
}
