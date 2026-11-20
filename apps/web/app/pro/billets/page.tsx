import { ScanLine } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RESERVATION_STATUS } from "@/components/admin/labels";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Billets" };

/** Étape 20 — vérifier un billet à l'entrée (code ou QR code) : seulement ceux des activités de l'organisateur. */
export default async function ProTicketsPage({ searchParams }: PageProps<"/pro/billets">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { organizer } = await requireApprovedOrganizer();
  const d = await getProData(organizer.id);
  const code = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const needle = q.toLowerCase();
  const matches = !q ? [] : d.reservations.filter((r) => (code.length >= 4 && r.code.startsWith(code)) || r.id === q || r.participant.toLowerCase().includes(needle));
  if (matches.length === 1) redirect(`/pro/billets/${encodeURIComponent(matches[0]!.id)}`);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Billets" subtitle="Vérifier un billet à l'entrée et pointer la présence." />
      <Card className="mb-5">
        <p className="flex items-start gap-3 text-sm text-ink">
          <ScanLine className="mt-0.5 size-5 shrink-0 text-plum-900" aria-hidden />
          <span><strong>Scanner :</strong> visez le QR code du billet avec l&apos;appareil photo du téléphone (connecté à votre espace organisateur) : la fiche du billet s&apos;ouvre ici.</span>
        </p>
        <form className="mt-4 flex flex-wrap gap-2" role="search">
          <label className="sr-only" htmlFor="q">Code du billet ou prénom</label>
          <input id="q" name="q" defaultValue={q} autoCapitalize="characters" placeholder="Code du billet (ex. AB3DE9FG) ou prénom" className="min-w-56 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm" />
          <button className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">Rechercher</button>
        </form>
      </Card>
      {q && (
        <Card>
          {matches.length === 0 ? (
            <p className="text-sm text-muted">Aucun billet de vos activités ne correspond à « {q} ».</p>
          ) : (
            <ul className="divide-y divide-line">
              {matches.slice(0, 30).map((r) => {
                const st = RESERVATION_STATUS[r.status as keyof typeof RESERVATION_STATUS] ?? [r.status, "gray"];
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <Link href={`/pro/billets/${encodeURIComponent(r.id)}`} className="font-medium text-plum-900 underline">{r.participant}</Link>
                    <span className="text-muted">{r.title} · {adminDate(r.sessionStartAt)}</span>
                    <Badge tone={st[1]}>{st[0]}</Badge>
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
