import type { Experience } from "@thecommunity/shared";
import { MediaImage as Image } from "@/components/media";
import Link from "next/link";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getRendezvousTitles } from "@/lib/data/admin-todo";

export const metadata = { title: "Événements" };

const FILTERS = [
  { key: "current", label: "En ligne et brouillons" },
  { key: "review", label: "À valider" },
  { key: "archived", label: "Archivés" },
] as const;

const STATUS: Record<string, { label: string; tone: "green" | "gray" | "amber" }> = {
  published: { label: "En ligne", tone: "green" },
  draft: { label: "Brouillon", tone: "gray" },
  archived: { label: "Archivé", tone: "amber" },
  pending_review: { label: "À valider", tone: "amber" },
  rejected: { label: "Refusé", tone: "gray" },
};
const TIER = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" } as const;
const TIER_ORDER = ["casual", "premium", "exclusive"];

const SECTIONS = [
  { key: "move", title: "Activités du samedi", hint: "Elles passent le samedi, via le planning des samedis.", bar: "border-s-emerald-600" },
  { key: "discover", title: "Événements", hint: "Chacun a ses propres dates (soirées, afterworks…).", bar: "border-s-amber-500" },
  { key: "eat", title: "Tables", hint: "Les gammes des rendez-vous de la semaine (dîner, café, brunch) et les éditions Girls only.", bar: "border-s-brand-700" },
] as const;

/**
 * Refonte UX du 25/11 : les fiches, rangées comme on les pense (activités du samedi, événements, Tables). Chaque ligne
 * dit ce qui compte : nom clair (gamme comprise), prochaine date et remplissage, place dans la rotation, statut.
 */
export default async function ExperiencesAdminPage({ searchParams }: PageProps<"/admin/experiences">) {
  const sp = await searchParams;
  const filter = sp.vue === "archived" ? "archived" : sp.vue === "review" ? "review" : "current";
  const [d, rvTitles] = await Promise.all([getAdminData(), getRendezvousTitles()]);
  const all = [...d.experiences.values()];
  const toReview = (e: (typeof all)[number]) => e.status === "pending_review" || Boolean(e.reviewFlag);
  const counts = { current: all.filter((e) => e.status !== "archived").length, review: all.filter(toReview).length, archived: all.filter((e) => e.status === "archived").length };
  const list = all.filter((e) => (filter === "archived" ? e.status === "archived" : filter === "review" ? toReview(e) : e.status !== "archived"));
  const x = (e: Experience) => e as Experience & { rendezvousId?: string | null; rendezvousKind?: string | null };
  const nameOf = (e: Experience) => {
    const rv = x(e).rendezvousId;
    const base = rv && x(e).rendezvousKind !== "rotation" ? rvTitles.get(rv) || e.title.fr : e.title.fr;
    return `${base}${e.venueTier ? ` · ${TIER[e.venueTier as keyof typeof TIER] ?? e.venueTier}` : ""}`;
  };
  const next = (e: Experience) => d.sessions.filter((s) => s.experienceId === e.id && (s.status === "published" || s.status === "full")).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const sectionOf = (e: Experience) => (e.categoryId === "move" ? "move" : e.categoryId === "eat" ? "eat" : "discover");
  const sorted = (items: Experience[]) => [...items].sort((a, b) => nameOf(a).localeCompare(nameOf(b), "fr") || TIER_ORDER.indexOf(a.venueTier ?? "") - TIER_ORDER.indexOf(b.venueTier ?? ""));

  return (
    <>
      <PageHeader
        title="Événements"
        subtitle="Les fiches : textes, photos, prix, lieu. Les dates se gèrent dans le calendrier et les rendez-vous."
        actions={
          <>
            <Link href="/admin/modeles" className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">Modèles</Link>
            <Link href="/admin/experiences/nouvelle" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Créer</Link>
          </>
        }
      />
      {sp.supprime === "1" && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Événement supprimé.</p>}
      <nav aria-label="Filtrer les événements" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "current" ? "/admin/experiences" : `/admin/experiences?vue=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${filter === f.key ? "bg-brand-900 text-white" : "bg-white text-ink hover:bg-cream"}`}
          >
            {f.label} <span className={filter === f.key ? "text-white/80" : f.key === "review" && counts.review ? "font-bold text-amber-800" : "text-muted"}>{counts[f.key]}</span>
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <Card><p className="text-sm text-muted">{filter === "archived" ? "Aucun événement archivé." : filter === "review" ? "Rien à valider." : "Aucun événement : créez le premier."}</p></Card>
      ) : (
        <div className="space-y-6" data-testid="experience-sections">
          {SECTIONS.map((sec) => {
            const items = sorted(list.filter((e) => sectionOf(e) === sec.key));
            if (items.length === 0) return null;
            return (
              <Card key={sec.key}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink">{sec.title} <span className="text-sm font-normal text-muted">({items.length})</span></h2>
                  <p className="text-xs text-muted">{sec.hint}</p>
                </div>
                <ul className="divide-y divide-line">
                  {items.map((e) => {
                    const dates = next(e);
                    const first = dates[0];
                    const partner = d.partners.find((p) => p.id === d.economics[e.id]?.partnerId);
                    const st = STATUS[e.status] ?? STATUS.draft!;
                    const inRotation = x(e).rendezvousKind === "rotation";
                    return (
                      <li key={e.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-s-4 py-3 ps-3 ${sec.bar}`} data-testid="experience-row">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-cream-deep">{e.images[0] && <Image src={e.images[0].path} alt="" fill sizes="48px" className="object-cover" />}</span>
                        <span className="min-w-48 flex-1">
                          <Link href={`/admin/experiences/${e.id}`} className="font-semibold text-ink hover:text-brand-900">{nameOf(e)}</Link>
                          <span className="block text-xs text-muted">{[e.district, partner?.name, e.organizerSnapshot ? `par ${e.organizerSnapshot.name}` : ""].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="w-56 text-sm">
                          {first ? (
                            <Link href={`/admin/sessions/${first.id}`} className="hover:text-brand-900">
                              <span className="block text-ink">{adminDate(first.startAt)}</span>
                              <span className="text-xs text-muted">{first.seatsConfirmed}/{first.capacity} inscrits{dates.length > 1 ? ` · ${dates.length - 1} autre${dates.length > 2 ? "s" : ""} date${dates.length > 2 ? "s" : ""}` : ""}</span>
                            </Link>
                          ) : sec.key === "move" ? (
                            <Link href={`/admin/experiences/${e.id}`} className="text-xs font-semibold text-amber-800 underline">{inRotation ? "Dans la rotation, pas de samedi proche" : "Pas encore programmée : la programmer"}</Link>
                          ) : (
                            <Link href={`/admin/experiences/${e.id}#dates`} className="text-xs font-semibold text-amber-800 underline">Aucune date : en ajouter</Link>
                          )}
                        </span>
                        <span className="flex w-32 flex-wrap gap-1">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {e.reviewFlag ? <Badge tone="amber">Modifié</Badge> : null}
                          {inRotation && <Badge tone="green">Rotation</Badge>}
                        </span>
                        <span className="whitespace-nowrap text-sm">
                          <Link href={`/admin/experiences/${e.id}`} className="font-semibold text-brand-900">Modifier</Link>
                          {e.status === "published" && <> · <Link href={`/experiences/${e.slug}`} className="text-brand-900">Voir</Link></>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
