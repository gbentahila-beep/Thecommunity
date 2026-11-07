import Link from "next/link";
import { adminDate, Badge, Card, DemoNote, PageHeader, Table } from "@/components/admin/ui";
import { articleBySlug } from "@/content/help";
import { getHelpFeedbackStats } from "@/lib/data/admin-help";

export const metadata = { title: "Centre d'aide" };

/** Retours des lecteurs sur les articles du centre d'aide : les articles jugés peu utiles remontent en premier. */
export default async function HelpAdminPage() {
  const { stats, total, isDemo } = await getHelpFeedbackStats();
  return (
    <>
      <PageHeader title="Centre d'aide" subtitle={`${total} retours « Cet article vous a-t-il aidé ? »`} />
      {isDemo && <DemoNote>Démonstration : les retours sont enregistrés sur le site en ligne.</DemoNote>}
      <Card>
        <Table head={["Article", "Oui", "Non", "Utile", "Dernier retour"]} caption="Retours par article">
          {stats.map((s) => {
            const a = articleBySlug(s.article);
            const ratio = s.yes / Math.max(1, s.yes + s.no);
            return (
              <tr key={s.article}>
                <td>
                  {a ? (
                    <Link href={`/aide/${s.article}`} target="_blank" className="font-medium text-ink hover:text-plum-900">{a.title.fr}</Link>
                  ) : (
                    <span className="text-muted">{s.article} (article retiré)</span>
                  )}
                </td>
                <td className="tabular-nums">{s.yes}</td>
                <td className="tabular-nums">{s.no}</td>
                <td><Badge tone={ratio >= 0.7 ? "green" : ratio >= 0.4 ? "amber" : "red"}>{Math.round(ratio * 100)} %</Badge></td>
                <td className="whitespace-nowrap text-muted">{s.last ? adminDate(s.last, false) : "—"}</td>
              </tr>
            );
          })}
        </Table>
        {stats.length === 0 && <p className="mt-3 text-sm text-muted">Aucun retour pour l&apos;instant.</p>}
        <p className="mt-3 text-xs text-muted">Retours anonymes. Les articles sont rédigés dans apps/web/content/help.ts (français, anglais ; arabe à traduire).</p>
      </Card>
    </>
  );
}
