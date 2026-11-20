import type { OutingProposal } from "@thecommunity/shared";
import Link from "next/link";
import { ProposalActions } from "@/components/admin/proposal-actions";
import { adminDate, Badge, Card, DemoNote, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getAdminProposals } from "@/lib/data/proposals";

export const metadata = { title: "Sorties proposées" };

const LEVEL: Record<string, string> = { all: "Tous niveaux", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Confirmé" };

/**
 * 18d — Sorties proposées par les membres de confiance. Rien n'est publié sans l'équipe : « Créer l'expérience »
 * ouvre le formulaire pré-rempli (prix, lieu, dates, sécurité à compléter), « Refuser » prévient le membre.
 * Le statut de membre de confiance se donne dans « Utilisateurs ».
 */
export default async function ProposalsPage() {
  const [{ pending, decided, isDemo }, { categories }] = await Promise.all([getAdminProposals(), getAdminData()]);
  // Étape 19 : noms des catégories lus dans la base.
  const CATEGORY = Object.fromEntries(categories.map((c) => [c.id, c.name.fr])) as Record<string, string>;
  return (
    <>
      <PageHeader title="Sorties proposées" subtitle={`${pending.length} en attente · par les membres de confiance (statut donné dans « Utilisateurs »)`} />
      {isDemo && <div className="mb-4"><DemoNote>Démonstration : propositions d&apos;exemple. Sur le site en ligne, les propositions des membres de confiance arrivent ici.</DemoNote></div>}
      {pending.length === 0 ? (
        <Card><p className="text-sm text-muted">Aucune proposition en attente. Donnez le statut « membre de confiance » à des habitués dans « Utilisateurs » : ils pourront proposer leurs sorties depuis leur espace.</p></Card>
      ) : (
        <ul className="space-y-4">
          {pending.map((p) => (
            <li key={p.id}><ProposalCard p={p} live={!isDemo} categoryName={CATEGORY[p.categoryId] ?? p.categoryId} /></li>
          ))}
        </ul>
      )}
      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-ink">Déjà traitées</h2>
          <ul className="space-y-2">
            {decided.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-card">
                <Badge tone={p.status === "accepted" ? "green" : "gray"}>{p.status === "accepted" ? "Retenue" : "Refusée"}</Badge>
                <span className="font-medium text-ink">{p.title}</span>
                <span className="text-muted">· {p.firstName} · {adminDate(p.createdAt, false)}</span>
                {p.experienceId && <Link href={`/admin/experiences/${p.experienceId}`} className="ms-auto text-plum-900 underline">Voir l&apos;expérience</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ProposalCard({ p, live, categoryName }: { p: OutingProposal; live: boolean; categoryName: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-card" data-testid="proposal">
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">{p.title}</h2>
          <p className="text-sm text-muted">Proposée par {p.firstName} · {adminDate(p.createdAt)} · {categoryName}</p>
        </div>
        {p.willHost && <Badge tone="plum">Le membre accueille le groupe</Badge>}
        {p.forGroupSize ? <Badge tone="green">Pour son ancien groupe ({p.forGroupSize} personnes), prévenu à la publication</Badge> : null}
      </header>
      <p className="whitespace-pre-line text-[15px] text-ink/90">{p.description}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-muted">Quartier : </dt><dd className="inline">{p.district}</dd></div>
        <div><dt className="inline text-muted">Lieu envisagé : </dt><dd className="inline">{p.venueIdea || "—"}</dd></div>
        <div><dt className="inline text-muted">Dates : </dt><dd className="inline">{p.datesIdea}</dd></div>
        <div><dt className="inline text-muted">Participants : </dt><dd className="inline">{p.capacity}</dd></div>
        <div><dt className="inline text-muted">Prix envisagé : </dt><dd className="inline">{p.priceIdeaDh != null ? `${p.priceIdeaDh} DH` : "—"}</dd></div>
        <div><dt className="inline text-muted">Niveau : </dt><dd className="inline">{p.level ? LEVEL[p.level] : "—"}</dd></div>
      </dl>
      {p.notes && <p className="mt-2 rounded-xl bg-cream p-3 text-sm text-ink/90">« {p.notes} »</p>}
      <div className="mt-4"><ProposalActions proposalId={p.id} live={live} /></div>
    </article>
  );
}
