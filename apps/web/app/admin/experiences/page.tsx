import { MediaImage as Image } from "@/components/media";
import Link from "next/link";
import { CATEGORY_LABELS, MODE_LABELS } from "@/components/admin/labels";
import { Badge, Card, dh, PageHeader, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Expériences" };

const FILTERS = [
  { key: "current", label: "En cours" },
  { key: "archived", label: "Archivées" },
] as const;

const STATUS: Record<string, { label: string; tone: "green" | "gray" | "amber" }> = {
  published: { label: "Publiée", tone: "green" },
  draft: { label: "Brouillon", tone: "gray" },
  archived: { label: "Archivée", tone: "amber" },
};

export default async function ExperiencesAdminPage({ searchParams }: PageProps<"/admin/experiences">) {
  const sp = await searchParams;
  const filter = sp.vue === "archived" ? "archived" : "current";
  const d = await getAdminData();
  const all = [...d.experiences.values()];
  const archivedCount = all.filter((e) => e.status === "archived").length;
  const list = all.filter((e) => (filter === "archived" ? e.status === "archived" : e.status !== "archived"));
  return (
    <>
      <PageHeader
        title="Expériences"
        subtitle={`${all.length - archivedCount} expérience${all.length - archivedCount > 1 ? "s" : ""} · ${archivedCount} archivée${archivedCount > 1 ? "s" : ""}`}
        actions={<Link href="/admin/experiences/nouvelle" className="rounded-full bg-plum-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">+ Nouvelle expérience</Link>}
      />
      {sp.supprime === "1" && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Expérience supprimée.</p>}
      <nav aria-label="Filtrer les expériences" className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "current" ? "/admin/experiences" : "/admin/experiences?vue=archived"}
            aria-current={filter === f.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${filter === f.key ? "bg-plum-900 text-white" : "bg-white text-ink hover:bg-cream"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <Card><p className="text-sm text-muted">{filter === "archived" ? "Aucune expérience archivée." : "Aucune expérience : créez la première."}</p></Card>
      ) : (
      <Card>
        <Table head={["Expérience", "Univers", "Mode", "Prix", "Modèle", "Prochaines dates", "Statut", ""]} caption="Expériences">
          {list.map((e) => {
            const eco = d.economics[e.id];
            const partner = d.partners.find((p) => p.id === eco?.partnerId);
            const count = d.sessions.filter((s) => s.experienceId === e.id).length;
            return (
              <tr key={e.id}>
                <td>
                  <span className="flex items-center gap-3">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cream-deep">{e.images[0] && <Image src={e.images[0].path} alt="" fill sizes="44px" className="object-cover" />}</span>
                    <span><span className="block font-medium text-ink">{e.title.fr}</span><span className="text-xs text-muted">{e.district}{partner ? ` · ${partner.name}` : ""}</span></span>
                  </span>
                </td>
                <td>{CATEGORY_LABELS[e.categoryId]}</td>
                <td className="text-muted">{MODE_LABELS[e.bookingMode]}</td>
                <td className="tabular-nums">{dh(e.price.amount)}</td>
                <td className="text-muted">{eco?.model === "commission" ? `Commission ${eco.commissionPercent} %` : `Coût ${dh(eco?.costPerSeat ?? 0)}`}</td>
                <td className="tabular-nums">
                  {count > 0 ? count : (
                    <Link href={`/admin/experiences/${e.id}#dates`} className="text-xs font-semibold text-amber-800 underline">
                      Aucune — ajouter des dates
                    </Link>
                  )}
                </td>
                <td><Badge tone={(STATUS[e.status] ?? STATUS.draft!).tone}>{(STATUS[e.status] ?? STATUS.draft!).label}</Badge></td>
                <td className="whitespace-nowrap text-end">
                  <Link href={`/admin/experiences/${e.id}`} className="font-medium text-plum-900">Modifier</Link> ·{" "}
                  {e.status === "published" ? <Link href={`/experiences/${e.slug}`} className="font-medium text-plum-900">Voir</Link> : <span className="text-muted">Hors ligne</span>}
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
