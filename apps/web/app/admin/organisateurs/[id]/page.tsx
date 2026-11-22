import { ORGANIZER_STATUS_LABELS } from "@thecommunity/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORGANIZER_STATUS_TONE as STATUS_TONE } from "@/components/admin/labels";
import { OrganizerDecision, OrganizerDocument } from "@/components/admin/organizer-actions";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getAdminOrganizers } from "@/lib/data/admin-organizers";

export const metadata = { title: "Organisateur" };

const ACTIONS: Record<string, string> = {
  submitted: "Demande envoyée",
  resubmitted: "Demande complétée et renvoyée",
  approve: "Compte validé",
  reject: "Demande refusée",
  request_info: "Complément demandé",
  suspend: "Compte suspendu",
  reactivate: "Compte réactivé",
};

/** Étape 20 — fiche d'un organisateur : présentation, coordonnées, pièces, historique, décisions, activités. */
export default async function OrganizerAdminPage({ params }: PageProps<"/admin/organisateurs/[id]">) {
  const { id } = await params;
  const [{ organizers, isDemo }, d] = await Promise.all([getAdminOrganizers(), getAdminData()]);
  const o = organizers.find((x) => x.id === id);
  if (!o) notFound();
  const det = o.details;
  const activities = [...d.experiences.values()].filter((e) => e.organizerId === o.id);
  const cats = new Map(d.categories.map((c) => [c.id, c.name.fr]));
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title={o.name} subtitle={<span className="inline-flex items-center gap-2"><Badge tone={STATUS_TONE[o.status] ?? "gray"}>{ORGANIZER_STATUS_LABELS[o.status]}</Badge><span className="font-mono text-xs">/{o.slug}</span></span>} />
      <Card title="Décision">
        <OrganizerDecision organizerId={o.id} status={o.status} live={!isDemo} />
        {det?.decisionMessage && <p className="mt-3 text-sm text-muted">Dernier message envoyé : « {det.decisionMessage} »</p>}
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Présentation">
          <p className="whitespace-pre-line text-sm text-ink">{o.description.fr}</p>
          <p className="mt-3 text-sm text-muted">Catégories : {o.categoryIds.map((c) => cats.get(c) ?? c).join(", ")} · Ville : {o.cityId}</p>
          {(o.website || o.instagram) && <p className="mt-1 text-sm text-muted">{o.website}{o.website && o.instagram ? " · " : ""}{o.instagram ? `@${o.instagram}` : ""}</p>}
        </Card>
        <Card title="Contact (privé)">
          <dl className="grid gap-2 text-sm">
            <div><dt className="inline text-muted">Personne : </dt><dd className="inline">{det?.contactName}</dd></div>
            <div><dt className="inline text-muted">E-mail : </dt><dd className="inline">{det?.email}</dd></div>
            <div><dt className="inline text-muted">Téléphone : </dt><dd className="inline">{det?.phone}</dd></div>
            <div><dt className="inline text-muted">Adresse : </dt><dd className="inline">{det?.address}</dd></div>
            <div><dt className="inline text-muted">Contrat accepté : </dt><dd className="inline">{det?.terms ? `version ${det.terms.version}, le ${adminDate(det.terms.acceptedAt, false)}` : "—"}</dd></div>
          </dl>
        </Card>
      </div>
      <Card title={`Pièces justificatives (${det?.documents.length ?? 0})`}>
        {det?.documents.length ? (
          <ul className="space-y-2" data-testid="organizer-documents">
            {det.documents.map((doc) => <li key={doc.path}><OrganizerDocument path={doc.path} name={doc.name} live={!isDemo} /></li>)}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucune pièce jointe : demandez un complément avant de valider.</p>
        )}
      </Card>
      <Card title="Activités">
        {activities.length === 0 ? (
          <p className="text-sm text-muted">Aucune activité.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {activities.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link href={`/admin/experiences/${e.id}`} className="font-medium text-brand-900 underline">{e.title.fr}</Link>
                <Badge tone={e.status === "published" ? "green" : e.status === "pending_review" ? "amber" : e.status === "rejected" ? "red" : "gray"}>{{ published: "En ligne", pending_review: "À relire", rejected: "Refusée", draft: "Brouillon", archived: "Archivée" }[e.status]}</Badge>
                {e.reviewFlag && <Badge tone="amber">Modifiée</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Historique">
        <ol className="space-y-1 text-sm">
          {(det?.history ?? []).slice().reverse().map((h, i) => (
            <li key={i}><span className="text-muted">{adminDate(h.at)}</span> · {ACTIONS[h.action] ?? h.action}{h.message ? ` — « ${h.message} »` : ""}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
