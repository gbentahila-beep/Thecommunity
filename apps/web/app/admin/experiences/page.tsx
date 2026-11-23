import type { Experience } from "@thecommunity/shared";
import { MediaImage as Image } from "@/components/media";
import Link from "next/link";
import { MODE_LABELS } from "@/components/admin/labels";
import { Badge, Card, dh, PageHeader, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Événements" };

const FILTERS = [
  { key: "current", label: "En cours" },
  { key: "review", label: "À valider (organisateurs)" },
  { key: "archived", label: "Archivées" },
] as const;

const STATUS: Record<string, { label: string; tone: "green" | "gray" | "amber" }> = {
  published: { label: "Publiée", tone: "green" },
  draft: { label: "Brouillon", tone: "gray" },
  archived: { label: "Archivée", tone: "amber" },
  pending_review: { label: "À valider", tone: "amber" },
  rejected: { label: "Refusée", tone: "gray" },
};

/** Étape R : ce que le participant paie sur place (plus de coût ni de commission : prix Wenzy unique en ligne). */
function onSite(e: Experience) {
  if (e.pricing?.model === "fixed_partner" && e.pricing.partner?.price) return dh(e.pricing.partner.price.amount);
  if (e.pricing?.model === "variable_consumption") return e.budgetRange ? `Conso ${dh(e.budgetRange.min)}–${dh(e.budgetRange.max)}` : "Conso";
  return "Rien";
}

export default async function ExperiencesAdminPage({ searchParams }: PageProps<"/admin/experiences">) {
  const sp = await searchParams;
  const filter = sp.vue === "archived" ? "archived" : sp.vue === "review" ? "review" : "current";
  const d = await getAdminData();
  // Étape 19 : noms des catégories lus dans la base (catégories dynamiques).
  const catName = new Map(d.categories.map((c) => [c.id, c.name.fr]));
  const all = [...d.experiences.values()];
  const archivedCount = all.filter((e) => e.status === "archived").length;
  // Étape 20 : « À valider » = activités envoyées par un organisateur ou publiées puis modifiées par lui.
  const toReview = (e: (typeof all)[number]) => e.status === "pending_review" || Boolean(e.reviewFlag);
  const list = all.filter((e) => (filter === "archived" ? e.status === "archived" : filter === "review" ? toReview(e) : e.status !== "archived"));
  const reviewCount = all.filter(toReview).length;
  return (
    <>
      <PageHeader
        title="Événements"
        subtitle={`${all.length - archivedCount} expérience${all.length - archivedCount > 1 ? "s" : ""} · ${archivedCount} archivée${archivedCount > 1 ? "s" : ""}`}
        actions={<Link href="/admin/experiences/nouvelle" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouvel événement</Link>}
      />
      {sp.supprime === "1" && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Expérience supprimée.</p>}
      <nav aria-label="Filtrer les expériences" className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "current" ? "/admin/experiences" : `/admin/experiences?vue=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${filter === f.key ? "bg-brand-900 text-white" : "bg-white text-ink hover:bg-cream"}`}
          >
            {f.label}{f.key === "review" && reviewCount > 0 ? ` (${reviewCount})` : ""}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <Card><p className="text-sm text-muted">{filter === "archived" ? "Aucune expérience archivée." : filter === "review" ? "Rien à valider." : "Aucune expérience : créez la première."}</p></Card>
      ) : (
      <Card>
        <Table head={["Événement", "Univers", "Mode", "En ligne", "Sur place", "Prochaines dates", "Statut", ""]} caption="Événements">
          {list.map((e) => {
            const eco = d.economics[e.id];
            const partner = d.partners.find((p) => p.id === eco?.partnerId);
            const count = d.sessions.filter((s) => s.experienceId === e.id).length;
            return (
              <tr key={e.id}>
                <td>
                  <span className="flex items-center gap-3">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cream-deep">{e.images[0] && <Image src={e.images[0].path} alt="" fill sizes="44px" className="object-cover" />}</span>
                    <span><span className="block font-medium text-ink">{e.title.fr}</span><span className="text-xs text-muted">{e.district}{partner ? ` · ${partner.name}` : ""}{e.organizerSnapshot ? ` · par ${e.organizerSnapshot.name}` : ""}</span></span>
                  </span>
                </td>
                <td>{catName.get(e.categoryId) ?? e.categoryId}{e.subcategoryId ? ` · ${catName.get(e.subcategoryId) ?? e.subcategoryId}` : ""}</td>
                <td className="text-muted">{MODE_LABELS[e.bookingMode]}</td>
                <td className="tabular-nums">{dh(e.price.amount)}</td>
                <td className="text-muted">{onSite(e)}</td>
                <td className="tabular-nums">
                  {count > 0 ? count : (
                    <Link href={`/admin/experiences/${e.id}#dates`} className="text-xs font-semibold text-amber-800 underline">
                      Aucune — ajouter des dates
                    </Link>
                  )}
                </td>
                <td><Badge tone={(STATUS[e.status] ?? STATUS.draft!).tone}>{(STATUS[e.status] ?? STATUS.draft!).label}</Badge>{e.reviewFlag ? <span className="ms-1"><Badge tone="amber">Modifiée</Badge></span> : null}</td>
                <td className="whitespace-nowrap text-end">
                  <Link href={`/admin/experiences/${e.id}`} className="font-medium text-brand-900">Modifier</Link> ·{" "}
                  {e.status === "published" ? <Link href={`/experiences/${e.slug}`} className="font-medium text-brand-900">Voir</Link> : <span className="text-muted">Hors ligne</span>}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      )}
    </>
  );
}
