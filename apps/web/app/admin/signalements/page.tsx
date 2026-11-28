import Link from "next/link";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { BookingHoldActions, ReportActions } from "@/components/admin/report-actions";
import { adminDate, Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Signalements" };

const REASONS: Record<string, string> = { behaviour: "Comportement inapproprié", harassment: "Harcèlement", safety: "Sécurité", other: "Autre" };
const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : "");

/** Signalements de participants et suivi des incidents (docs/22, décision 48). Équipe seulement. */
export default async function ReportsPage() {
  await connection();
  type Row = { id: string; reporter: string; reported: string; reportedUid: string; reason: string; details: string; status: string; note: string; createdAt: string; count: number; during: boolean; hold: boolean };
  let rows: Row[] = [];
  if (FIREBASE_ENABLED) {
    await requireAdmin();
    const db = adminDb();
    const snap = await db.collection("reports").orderBy("createdAt", "desc").limit(200).get();
    const uids = [...new Set(snap.docs.flatMap((d) => [d.get("reporterUid"), d.get("reportedUid")]))] as string[];
    const users = uids.length ? await db.getAll(...uids.map((u) => db.doc(`users/${u}`))) : [];
    const name = new Map(users.map((u) => [u.id, `${u.get("firstName") ?? ""} ${u.get("lastName") ?? ""}`.trim() || String(u.get("email") ?? "Compte")]));
    // Audit 23/11 : comptes gelés (2 signalants différents en 90 jours, ou décision de l'équipe).
    const held = new Set(users.filter((u) => u.get("bookingHold.active") === true).map((u) => u.id));
    const counts = new Map<string, number>();
    snap.docs.forEach((d) => counts.set(d.get("reportedUid"), (counts.get(d.get("reportedUid")) ?? 0) + 1));
    rows = snap.docs.map((d) => ({ id: d.id, reporter: name.get(d.get("reporterUid")) ?? "", reported: name.get(d.get("reportedUid")) ?? "", reportedUid: d.get("reportedUid"), reason: REASONS[d.get("reason")] ?? d.get("reason"), details: String(d.get("details") ?? ""), status: String(d.get("status")), note: String(d.get("note") ?? ""), createdAt: iso(d.get("createdAt")), count: counts.get(d.get("reportedUid")) ?? 1, during: d.get("duringEvent") === true, hold: held.has(d.get("reportedUid")) }));
  }
  const open = rows.filter((r) => r.status === "open").length;
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/utilisateurs" className="text-brand-900">← Membres</Link></p>
      <PageHeader title="Signalements" subtitle={FIREBASE_ENABLED ? `${open} à traiter · confidentiels, jamais montrés à la personne signalée` : "Démonstration : les signalements des participants arrivent ici sur le site en ligne."} />
      <Card>
        {rows.length === 0 ? <p className="text-sm text-muted" data-testid="reports-empty">Aucun signalement.</p> : (
          <Table head={["Date", "Signalé·e", "Par", "Motif", "Ce qui s'est passé", "Statut", ""]} caption="Signalements">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-muted">{adminDate(r.createdAt)}</td>
                <td className="font-medium text-ink">{r.reportedUid ? r.reported : <span className="text-muted">Non identifié·e (voir la description)</span>}{r.count > 1 && r.reportedUid && <span className="ms-1 text-xs text-red-800">({r.count} signalements)</span>}{r.hold && <span className="mt-1 block"><Badge tone="red">Réservations gelées</Badge></span>}{r.during && <span className="mt-1 block"><Badge tone="amber">Pendant l&apos;expérience</Badge></span>}</td>
                <td>{r.reporter}</td>
                <td>{r.reason}</td>
                <td className="max-w-80 text-sm">{r.details}{r.note && <span className="mt-1 block text-xs text-muted">Note : {r.note}</span>}</td>
                <td><Badge tone={r.status === "open" ? "amber" : r.status === "resolved" ? "green" : "gray"}>{r.status === "open" ? "À traiter" : r.status === "resolved" ? "Traité" : "Sans suite"}</Badge></td>
                <td className="space-y-2">{r.status === "open" && <ReportActions reportId={r.id} />}{r.reportedUid && <BookingHoldActions uid={r.reportedUid} active={r.hold} />}</td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">Au 2e signalement par une autre personne en 90 jours, le compte est gelé automatiquement (plus de nouvelle réservation ; celles déjà prises restent à votre décision). Pour écarter quelqu&apos;un : « Suspendre » dans Utilisateurs (ses réservations à venir sont annulées). Chaque action est journalisée.</p>
      </Card>
    </>
  );
}
