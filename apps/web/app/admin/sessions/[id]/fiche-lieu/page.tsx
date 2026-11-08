import Link from "next/link";
import { notFound } from "next/navigation";
import { DIET_LABELS, LANGUAGE_LABELS } from "@/components/admin/labels";
import { PrintButton } from "@/components/admin/print-button";
import { adminDate, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Fiche pour le lieu" };

/**
 * Ce que l'on transmet au lieu avant une date : nombre de participants, prénoms (accueil, marque-places),
 * régimes et allergies (seulement avec l'accord de la personne). Ni nom de famille, ni coordonnées.
 */
export default async function VenueSheetPage({ params }: PageProps<"/admin/sessions/[id]/fiche-lieu">) {
  const { id } = await params;
  const d = await getAdminData();
  const s = d.sessions.find((x) => x.id === id) ?? d.recentSessions.find((x) => x.id === id);
  if (!s) notFound();
  const e = d.experiences.get(s.experienceId)!;
  const partner = d.partners.find((p) => p.id === d.economics[e.id]?.partnerId);
  const people = d.reservations
    .filter((r) => r.sessionId === s.id && (r.status === "confirmed" || r.status === "attended"))
    .map((r) => ({ r, first: d.usersById.get(r.userId)?.firstName ?? "Participant" }))
    .sort((a, b) => a.first.localeCompare(b.first, "fr"));
  const seats = people.reduce((a, p) => a + p.r.seats, 0);
  const shared = people.filter((p) => p.r.preferences?.shareWithVenue && (p.r.preferences.diet !== "none" || p.r.preferences.allergies));
  const diets = new Map<string, number>();
  for (const p of shared) if (p.r.preferences!.diet !== "none") diets.set(p.r.preferences!.diet, (diets.get(p.r.preferences!.diet) ?? 0) + 1);
  const langs = new Map<string, number>();
  for (const p of people) for (const l of p.r.preferences?.languages ?? []) langs.set(l, (langs.get(l) ?? 0) + 1);
  return (
    <>
      <p className="mb-2 text-sm print:hidden"><Link href={`/admin/sessions/${s.id}`} className="text-plum-900">← Participants</Link></p>
      <PageHeader title="Fiche pour le lieu" subtitle={`${e.title.fr} · ${adminDate(s.startAt)}`} actions={<PrintButton label="Imprimer / PDF" />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Accueil">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">Lieu</dt><dd>{partner?.name ?? e.venue.name}</dd></div>
            <div><dt className="text-xs text-muted">Adresse</dt><dd>{e.venue.address}</dd></div>
            <div><dt className="text-xs text-muted">Date et heure</dt><dd>{adminDate(s.startAt)}</dd></div>
            <div><dt className="text-xs text-muted">Participants confirmés</dt><dd className="text-lg font-semibold">{seats}</dd></div>
          </dl>
          <p className="mt-4 text-sm">Accueil sous le nom « The Host Club ».</p>
        </Card>
        <Card title="Régimes et allergies">
          {shared.length === 0 ? (
            <p className="text-sm text-muted">Aucun régime ni allergie signalé.</p>
          ) : (
            <>
              {diets.size > 0 && (
                <ul className="mb-3 text-sm">
                  {[...diets].map(([diet, n]) => <li key={diet}>{DIET_LABELS[diet] ?? diet} : <strong>{n}</strong></li>)}
                </ul>
              )}
              <ul className="space-y-1 text-sm">
                {shared.map((p) => (
                  <li key={p.r.id}>
                    <strong>{p.first}</strong>
                    {p.r.preferences!.diet !== "none" && ` — ${DIET_LABELS[p.r.preferences!.diet] ?? p.r.preferences!.diet}`}
                    {p.r.preferences!.allergies && <span className="text-red-800"> — allergie : {p.r.preferences!.allergies}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card title="Prénoms (accueil et marque-places)">
          {people.length === 0 ? (
            <p className="text-sm text-muted">Aucune réservation confirmée pour l&apos;instant.</p>
          ) : (
            <ul className="columns-2 gap-6 text-sm">
              {people.map((p) => <li key={p.r.id}>{p.first}{p.r.seats > 1 ? ` (+${p.r.seats - 1})` : ""}</li>)}
            </ul>
          )}
        </Card>
        <Card title="Langues souhaitées à table">
          {langs.size === 0 ? <p className="text-sm text-muted">Non précisé.</p> : (
            <p className="text-sm">{[...langs].map(([l, n]) => `${LANGUAGE_LABELS[l] ?? l} : ${n}`).join(" · ")}</p>
          )}
        </Card>
      </div>
      <p className="mt-6 text-xs text-muted">Cette fiche ne contient ni nom de famille ni coordonnées. Régimes et allergies n&apos;apparaissent que pour les personnes qui ont accepté leur transmission au lieu.</p>
    </>
  );
}
