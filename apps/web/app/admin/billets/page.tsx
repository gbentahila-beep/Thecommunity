import { ticketCode, ticketPath } from "@thecommunity/shared";
import { ScanLine } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RESERVATION_STATUS } from "@/components/admin/labels";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Billets" };

/**
 * Vérifier un billet (étape 11d). Le scan se fait avec l'appareil photo du téléphone : le QR code ouvre
 * directement la fiche du billet. En secours : code du billet, nom ou e-mail.
 */
export default async function TicketsPage({ searchParams }: PageProps<"/admin/billets">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const d = await getAdminData();
  const needle = q.toLowerCase().replace(/\s+/g, " ");
  const code = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const matches = !q
    ? []
    : d.reservations.filter((r) => {
        const u = d.usersById.get(r.userId);
        return (code.length >= 4 && ticketCode(r.id).startsWith(code)) || r.id === q || (u && [`${u.firstName} ${u.lastName}`, u.email].some((x) => x.toLowerCase().includes(needle)));
      });
  if (matches.length === 1) redirect(ticketPath(matches[0].id));
  const sorted = matches.sort((a, b) => Math.abs(new Date(a.sessionStartAt).getTime() - d.now.getTime()) - Math.abs(new Date(b.sessionStartAt).getTime() - d.now.getTime()));

  return (
    <div className="max-w-2xl">
      <PageHeader title="Billets" subtitle="Vérifier un billet à l'accueil, pointer la présence et la part partenaire." />
      <Card className="mb-5">
        <p className="flex items-start gap-3 text-sm text-ink">
          <ScanLine className="mt-0.5 size-5 shrink-0 text-plum-900" aria-hidden />
          <span>
            <strong>Scanner :</strong> ouvrez l&apos;appareil photo du téléphone et visez le QR code du billet ; la fiche du billet s&apos;ouvre ici (connectez-vous au back-office une fois sur ce téléphone).
          </span>
        </p>
        <form className="mt-4 flex flex-wrap gap-2" role="search">
          <label className="sr-only" htmlFor="q">Code du billet, nom ou e-mail</label>
          <input id="q" name="q" defaultValue={q} autoCapitalize="characters" placeholder="Code du billet (ex. AB3DE9FG), nom ou e-mail" className="min-w-56 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm" />
          <button className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">Rechercher</button>
        </form>
      </Card>
      {q && (
        <Card title={sorted.length ? `${sorted.length} billet${sorted.length > 1 ? "s" : ""}` : undefined}>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted">Aucun billet ne correspond à « {q} ».</p>
          ) : (
            <ul className="divide-y divide-line">
              {sorted.slice(0, 30).map((r) => {
                const u = d.usersById.get(r.userId);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <Link href={ticketPath(r.id)} className="font-medium text-plum-900 underline">{u ? `${u.firstName} ${u.lastName}` : "Compte supprimé"}</Link>
                    <span className="text-muted">{d.experiences.get(r.experienceId)?.title.fr} · {adminDate(r.sessionStartAt)}</span>
                    <Badge tone={RESERVATION_STATUS[r.status][1]}>{RESERVATION_STATUS[r.status][0]}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
