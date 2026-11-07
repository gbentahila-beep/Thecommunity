import { MediaImage as Image } from "@/components/media";
import Link from "next/link";
import { CATEGORY_LABELS, MODE_LABELS } from "@/components/admin/labels";
import { Badge, Card, dh, PageHeader, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Expériences" };

export default async function ExperiencesAdminPage() {
  const d = await getAdminData();
  const list = [...d.experiences.values()];
  return (
    <>
      <PageHeader
        title="Expériences"
        subtitle={`${list.length} expérience${list.length > 1 ? "s" : ""}`}
        actions={<Link href="/admin/experiences/nouvelle" className="rounded-full bg-plum-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">+ Nouvelle expérience</Link>}
      />
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
                <td><Badge tone={e.status === "published" ? "green" : "gray"}>{e.status === "published" ? "Publiée" : "Brouillon"}</Badge></td>
                <td className="whitespace-nowrap text-end">
                  <Link href={`/admin/experiences/${e.id}`} className="font-medium text-plum-900">Modifier</Link> ·{" "}
                  <Link href={`/experiences/${e.slug}`} className="font-medium text-plum-900">Voir</Link>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
