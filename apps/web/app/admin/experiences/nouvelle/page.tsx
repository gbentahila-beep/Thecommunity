import { isCalendarTemplate, isSpecialTemplate, TEMPLATE_UNIVERSES, tierRange, VENUE_TIERS, type EventTemplate, type VenueTier } from "@thecommunity/shared";
import Link from "next/link";
import { ExperienceForm } from "@/components/admin/experience-form";
import { PageHeader } from "@/components/admin/ui";
import { mediaUrl } from "@/components/media";
import { emptyExperienceValues, formOptions, proposalToValues, templateToValues } from "@/lib/admin-forms";
import { getAdminData } from "@/lib/data/admin";
import { getWenzyPrice } from "@/lib/data/admin-mail";
import { getTemplates } from "@/lib/data/admin-templates";
import { getCancellationPolicies } from "@/lib/data/policies";
import { getPendingProposal } from "@/lib/data/proposals";

export const metadata = { title: "Nouvelle expérience" };

const TIER_LABEL: Record<VenueTier, string> = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" };
const card = "group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line transition hover:ring-brand-700";

/**
 * docs/22, décisions 21 et 22 : créer un événement en partant d'un modèle, en 3 temps (univers → modèle → gamme pour
 * les Tables), puis le formulaire pré-rempli. « Partir de zéro » reste possible.
 */
export default async function NewExperiencePage({ searchParams }: PageProps<"/admin/experiences/nouvelle">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const [d, policies, wenzyPrice, templates] = await Promise.all([getAdminData(), getCancellationPolicies(), getWenzyPrice(), getTemplates()]);
  const catName = new Map(d.categories.map((c) => [c.id, c.name.fr]));
  const active = templates.filter((t) => t.isActive);
  const formProps = { ...formOptions(d, policies), ...(wenzyPrice !== null ? { wenzyPrice } : {}) };

  // 18d : création à partir d'une sortie proposée (pré-remplie), sans passer par les modèles.
  const proposal = one("proposition") ? await getPendingProposal(one("proposition")) : null;
  if (proposal) {
    return (
      <div className="max-w-3xl">
        <p className="mb-2 text-sm"><Link href="/admin/propositions" className="text-brand-900">← Sorties proposées</Link></p>
        <PageHeader title="Nouvelle expérience" subtitle="Pré-remplie à partir d'une proposition." />
        <p role="status" data-testid="from-proposal" className="mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Pré-remplie à partir de la proposition de <strong>{proposal.firstName}</strong> (« {proposal.title} »). Complétez le lieu, la sécurité et les dates : rien n&apos;est publié avant votre enregistrement. Dates envisagées : {proposal.datesIdea}.
        </p>
        <ExperienceForm mode="create" live={!d.isDemo} initial={proposalToValues(proposal, d.now)} {...formProps} />
      </div>
    );
  }

  const modele = one("modele");
  const template = active.find((t) => t.id === modele) ?? templates.find((t) => t.id === modele) ?? null;
  const gamme = (VENUE_TIERS as readonly string[]).includes(one("gamme")) ? (one("gamme") as VenueTier) : null;
  const univers = one("univers") || template?.values.categoryId || "";

  // Étape finale : formulaire pré-rempli (ou vide).
  if (modele === "vide" || (template && (!template.tiers || gamme))) {
    const meta = template ? { id: template.id, name: template.name, image: template.image, order: template.order, isActive: template.isActive, builtIn: template.builtIn, tiers: template.tiers } : null;
    return (
      <div className="max-w-3xl">
        <Steps univers={univers} template={template} gamme={gamme} catName={catName} />
        <PageHeader title={template ? `Nouvel événement : ${template.name}${gamme ? ` · ${TIER_LABEL[gamme]}` : ""}` : "Nouvel événement (sans modèle)"} subtitle={template ? "Tout est pré-rempli : choisissez la date, puis le lieu maintenant ou plus tard." : "Formulaire vide."} />
        <ExperienceForm mode="create" live={!d.isDemo} initial={template ? templateToValues(template, gamme, d.now) : emptyExperienceValues(d.now)} {...formProps} {...(meta ? { template: meta } : {})} />
      </div>
    );
  }

  // Étape 3 (Tables) : la gamme.
  if (template?.tiers) {
    return (
      <div className="max-w-4xl">
        <Steps univers={univers} template={template} gamme={null} catName={catName} />
        <PageHeader title={`${template.name} : quelle gamme ?`} subtitle="La gamme fixe le budget sur place et réunit des personnes qui choisissent le même type d'adresse." />
        <ul className="grid gap-4 sm:grid-cols-3" data-testid="tier-choice">
          {VENUE_TIERS.filter((t) => template.tiers?.[t]).map((t) => {
            const r = tierRange(t, template.values.subcategoryId);
            return (
              <li key={t}>
                <Link href={`/admin/experiences/nouvelle?modele=${template.id}&gamme=${t}`} className={`${card} p-5`}>
                  <span className="text-lg font-semibold text-ink">{TIER_LABEL[t]}</span>
                  <span className="mt-1 text-sm text-ink">Sur place ≈ {r.min}–{r.max} DH par personne</span>
                  <span className="mt-1 text-sm text-muted">{template.tiers?.[t]?.ambiance}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Étape 2 : les modèles d'un univers.
  if (univers) {
    const list = active.filter((t) => t.values.categoryId === univers);
    return (
      <div className="max-w-5xl">
        <Steps univers={univers} template={null} gamme={null} catName={catName} />
        <PageHeader title={`${catName.get(univers) ?? "Univers"} : quel modèle ?`} subtitle="Tout sera pré-rempli, photo comprise. Vous pourrez tout modifier." />
        {/* docs/25 : les modèles du calendrier d'abord, ceux « pour plus tard » ensuite. */}
        {/* 25/11 : les éditions Girls only à part — créées à la main, une à une (rien d'automatique). */}
        {([["calendar", list.filter((t) => isCalendarTemplate(t) && !isSpecialTemplate(t))], ["special", list.filter(isSpecialTemplate)], ["later", list.filter((t) => !isCalendarTemplate(t))]] as const).map(([k, items]) =>
          items.length === 0 ? null : (
            <section key={k} className={k !== "calendar" ? "mt-8" : ""}>
              <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted uppercase">{k === "calendar" ? "Au calendrier" : k === "special" ? "Éditions spéciales Girls only" : "Pour plus tard"}</h2>
              {k === "special" && <p className="mb-3 text-sm text-muted">Réservées aux femmes (vérifié à la réservation). Rien d&apos;automatique : vous créez chaque édition ici, avec sa date, sa gamme et ses places.</p>}
              {k !== "special" && <div className="mb-2" />}
              <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${k === "later" ? "opacity-80" : ""}`} data-testid="template-choice">
                {items.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/experiences/nouvelle?modele=${t.id}`} className={card}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- photo du modèle (fichier du site ou Storage) */}
                      <img src={mediaUrl(t.image)} alt="" className="aspect-[4/3] w-full object-cover" />
                      <span className="p-4 font-semibold text-ink">{t.name}{t.tiers && <span className="block text-xs font-normal text-muted">Casual · Premium · Exclusive</span>}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
        {list.length === 0 && <p className="text-sm text-muted">Aucun modèle dans cet univers pour l&apos;instant.</p>}
        <p className="mt-6 text-sm text-muted">Rien ne correspond ? <Link href="/admin/experiences/nouvelle?modele=vide" className="font-semibold text-brand-900 underline">Partir d&apos;une page blanche</Link></p>
      </div>
    );
  }

  // Étape 1 (refonte UX du 25/11) : ce que l'on veut créer, en mots simples ; l'univers en découle.
  const INTENTS = [
    { u: "move", title: "Une activité pour le samedi", text: "Pilates, tennis, atelier… Elle passe le samedi, dans le planning des samedis : pas de date à saisir.", tone: "border-s-emerald-600" },
    { u: "discover", title: "Un événement avec sa date", text: "Soirée, afterwork, padel un autre jour… Vous choisissez la date et les places.", tone: "border-s-amber-500" },
    { u: "eat", title: "Une Table spéciale (dont Girls only)", text: "Café, brunch, déjeuner ou dîner en tables composées, par exemple une édition Girls only. Les rendez-vous de la semaine existent déjà et créent leurs dates tout seuls.", tone: "border-s-brand-700" },
  ] as const;
  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-sm"><Link href="/admin/experiences" className="text-brand-900">← Événements</Link></p>
      <PageHeader title="Que voulez-vous créer ?" subtitle="Choisissez, puis un modèle : tout est pré-rempli, photo comprise." actions={<Link href="/admin/modeles" className="text-sm font-semibold text-brand-900 underline">Gérer les modèles</Link>} />
      <ul className="grid gap-4" data-testid="universe-choice">
        {INTENTS.filter((x) => (TEMPLATE_UNIVERSES as readonly string[]).includes(x.u)).map((x) => {
          const list = active.filter((t) => t.values.categoryId === x.u && isCalendarTemplate(t) && !isSpecialTemplate(t));
          return (
            <li key={x.u}>
              <Link href={`/admin/experiences/nouvelle?univers=${x.u}`} className={`${card} border-s-4 p-5 ${x.tone}`}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-semibold text-ink">{x.title}</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">{catName.get(x.u) ?? x.u}</span>
                </span>
                <span className="mt-1 text-sm text-ink/80">{x.text}</span>
                {list.length > 0 && <span className="mt-2 text-xs text-muted">Modèles : {list.map((t) => t.name).join(" · ")}{x.u === "eat" ? " · éditions Girls only" : ""}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-muted">Rien ne correspond ? <Link href="/admin/experiences/nouvelle?modele=vide" className="font-semibold text-brand-900 underline">Partir d&apos;une page blanche</Link></p>
    </div>
  );
}

/** Fil des étapes : Univers › Modèle › Gamme. */
function Steps({ univers, template, gamme, catName }: { univers: string; template: EventTemplate | null; gamme: VenueTier | null; catName: Map<string, string> }) {
  return (
    <nav aria-label="Étapes" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-muted" data-testid="template-steps">
      <Link href="/admin/experiences/nouvelle" className="text-brand-900">Créer</Link>
      {univers && <>›<Link href={`/admin/experiences/nouvelle?univers=${univers}`} className="text-brand-900">{catName.get(univers) ?? univers}</Link></>}
      {template && <>›{template.tiers ? <Link href={`/admin/experiences/nouvelle?modele=${template.id}`} className="text-brand-900">{template.name}</Link> : <span>{template.name}</span>}</>}
      {gamme && <>›<span>{TIER_LABEL[gamme]}</span></>}
    </nav>
  );
}
