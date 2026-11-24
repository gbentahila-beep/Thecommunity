import { ORGANIZER_STATUS_LABELS } from "@thecommunity/shared";
import Link from "next/link";
import { ORGANIZER_STATUS_TONE as STATUS_TONE } from "@/components/admin/labels";
import { adminDate, Badge, Card, DemoNote, PageHeader, Table } from "@/components/admin/ui";
import { OrganizerRequestActions } from "@/components/admin/organizer-actions";
import { getAdminOrganizers } from "@/lib/data/admin-organizers";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Organisateurs" };


/** Étape 20 — organisateurs : demandes à valider, comptes validés, suspendus. */
export default async function OrganizersAdminPage() {
  const { organizers, isDemo } = await getAdminOrganizers();
  const todo = organizers.filter((o) => o.status === "pending").length;
  // Lot O (docs/26) : demandes des organisateurs (annulation d'une date, proposition pour un samedi).
  const requests = !isDemo && FIREBASE_ENABLED
    ? (await adminDb().collection("organizerRequests").where("status", "==", "pending").get()).docs
        .map((x) => ({ id: x.id, ...(x.data() as { type: "cancel_session" | "saturday"; organizerName?: string; title?: string; reason?: string; note?: string; dates?: string[]; participants?: number; startAt?: { toDate(): Date }; sessionId?: string; experienceId: string }) }))
        .sort((a, b) => (a.startAt?.toDate().getTime() ?? 0) - (b.startAt?.toDate().getTime() ?? 0))
    : [];
  return (
    <>
      <PageHeader title="Organisateurs" subtitle={`${organizers.length} compte${organizers.length > 1 ? "s" : ""} · ${todo} demande${todo > 1 ? "s" : ""} à traiter. Les organisateurs s'inscrivent depuis /pro.`} />
      {isDemo && <div className="mb-4"><DemoNote>Démonstration : deux organisateurs d&apos;exemple. Sur le site en ligne, les demandes envoyées depuis /pro arrivent ici.</DemoNote></div>}
      {requests.length > 0 && (
        <Card title={`Demandes des organisateurs (${requests.length})`} className="mb-5">
          <ul className="divide-y divide-line" data-testid="organizer-requests">
            {requests.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <p className="font-semibold text-ink">
                  {r.type === "cancel_session" ? "Annuler une date" : "Proposition pour un samedi"} · {r.title} <span className="font-normal text-muted">({r.organizerName})</span>
                </p>
                {r.type === "cancel_session" ? (
                  <>
                    <p className="text-muted">{r.startAt ? adminDate(r.startAt.toDate().toISOString()) : ""} · {r.participants ?? 0} inscrit(s) · Motif : {r.reason}</p>
                    <OrganizerRequestActions requestId={r.id} type="cancel_session" live />
                  </>
                ) : (
                  <p className="text-muted">{r.note || "Sans message."} <Link href="/admin/rendez-vous" className="font-semibold text-brand-900 underline">Traiter dans Rendez-vous</Link></p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        {organizers.length === 0 ? (
          <p className="text-sm text-muted">Aucun organisateur pour l&apos;instant.</p>
        ) : (
          <Table head={["Organisateur", "Contact", "Statut", "Activités", "Demande", ""]}>
            {organizers.map((o) => (
              <tr key={o.id} data-testid="admin-organizer">
                <td className="font-medium text-ink">{o.name}</td>
                <td className="text-sm text-muted">{o.details?.contactName}<br />{o.details?.email}</td>
                <td><Badge tone={STATUS_TONE[o.status] ?? "gray"}>{ORGANIZER_STATUS_LABELS[o.status]}</Badge></td>
                <td>{o.activityCounts.published} en ligne{o.activityCounts.pending ? ` · ${o.activityCounts.pending} à relire` : ""}</td>
                <td className="whitespace-nowrap text-muted">{o.details?.submittedAt ? adminDate(o.details.submittedAt, false) : "—"}</td>
                <td className="text-end"><Link href={`/admin/organisateurs/${o.id}`} className="font-semibold text-brand-900">Ouvrir</Link></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
