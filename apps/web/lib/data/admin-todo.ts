import "server-only";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * Back-office simplifié (24/11) : tout ce qui attend une action de l'équipe, en un seul endroit (page « À faire »).
 * Chaque ligne dit combien et mène à l'endroit où le traiter. Les comptes par date servent la page d'une date.
 */
export type TodoItem = { key: string; count: number; label: string; href: string; tone: "red" | "amber" };

export async function getAdminTodo(): Promise<{ items: TodoItem[]; requestsBySession: Map<string, number>; reportsBySession: Map<string, number> }> {
  await connection();
  const empty = { items: [] as TodoItem[], requestsBySession: new Map<string, number>(), reportsBySession: new Map<string, number>() };
  if (!FIREBASE_ENABLED) return empty;
  await requireAdmin();
  const db = adminDb();
  const count = async (q: FirebaseFirestore.Query) => (await q.count().get()).data().count;
  const [requests, reports, organizers, toReview, revisions, orgRequests, reviewsPending, photosPending, refundRequests, transfers, dataRequests, partnerApps] = await Promise.all([
    db.collection("bookingRequests").where("status", "==", "pending").get(),
    db.collection("reports").where("status", "==", "open").get(),
    count(db.collection("organizers").where("status", "==", "pending")),
    count(db.collection("experiences").where("status", "==", "pending_review")),
    count(db.collection("experiences").where("revisionPending", "==", true)),
    count(db.collection("organizerRequests").where("status", "==", "pending")),
    count(db.collection("reviews").where("status", "==", "pending")),
    count(db.collection("reviews").where("photo.status", "==", "pending")),
    count(db.collection("refundRequests").where("status", "==", "pending")),
    count(db.collection("payments").where("provider", "==", "bank_transfer").where("status", "==", "initiated")),
    count(db.collection("dataRequests").where("status", "==", "pending")),
    count(db.collection("partnerApplications").where("status", "==", "new")),
  ]);
  const by = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
    const m = new Map<string, number>();
    for (const d of docs) {
      const s = String(d.get("sessionId") ?? "");
      if (s) m.set(s, (m.get(s) ?? 0) + 1);
    }
    return m;
  };
  const items = ([
    { key: "reports", count: reports.size, label: "signalement(s) à traiter", href: "/admin/signalements", tone: "red" },
    { key: "requests", count: requests.size, label: "demande(s) de participation à accepter ou refuser", href: "/admin/participations", tone: "amber" },
    { key: "refundRequests", count: refundRequests, label: "demande(s) de remboursement", href: "/admin/remboursements", tone: "amber" },
    { key: "transfers", count: transfers, label: "virement(s) attendu(s) à valider à réception", href: "/admin/virements", tone: "amber" },
    { key: "orgRequests", count: orgRequests, label: "demande(s) d'organisateur (annulation, samedi)", href: "/admin/organisateurs", tone: "amber" },
    { key: "toReview", count: toReview + revisions, label: "activité(s) ou modification(s) d'organisateur à valider", href: "/admin/experiences?vue=review", tone: "amber" },
    { key: "organizers", count: organizers, label: "demande(s) de compte organisateur", href: "/admin/organisateurs", tone: "amber" },
    { key: "partnerApps", count: partnerApps, label: "candidature(s) de lieu partenaire", href: "/admin/partenaires", tone: "amber" },
    { key: "reviews", count: reviewsPending + photosPending, label: "avis ou photo(s) d'avis à valider", href: "/admin/avis", tone: "amber" },
    { key: "dataRequests", count: dataRequests, label: "demande(s) sur les données personnelles (loi 09-08)", href: "/admin/demandes", tone: "amber" },
  ] satisfies TodoItem[]).filter((x) => x.count > 0) as TodoItem[];
  return { items, requestsBySession: by(requests.docs), reportsBySession: by(reports.docs) };
}

/** Noms des rendez-vous de la semaine (« Dîner du mercredi »), pour nommer les dates dans le back-office. */
export async function getRendezvousTitles(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!FIREBASE_ENABLED) return out;
  (await adminDb().collection("rendezvous").get()).docs.forEach((x) => out.set(x.id, String(x.get("title.fr") ?? "")));
  return out;
}
