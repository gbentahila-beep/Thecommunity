import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

export type AdminRefundRequest = {
  id: string;
  reservationId: string;
  userName: string;
  email: string;
  title: string;
  organizerId: string | null;
  sessionStartAt: string;
  reason: string;
  message: string;
  paidAmount: number;
  refundedSoFar: number;
  status: string;
  amount?: number;
  decisionMessage?: string | null;
  createdAt: string;
};

/** Étape 22 — demandes de remboursement (équipe) : en attente d'abord, puis les 50 dernières décisions. */
export async function getAdminRefundRequests(): Promise<{ pending: AdminRefundRequest[]; decided: AdminRefundRequest[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) {
    return {
      isDemo: true,
      pending: [{ id: "demo-refund", reservationId: "demo-refund", userName: "Salma B.", email: "salma@example.com", title: "Balade street art au centre-ville", organizerId: null, sessionStartAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), reason: "not_delivered", message: "Le guide ne s'est jamais présenté au point de rendez-vous ; nous avons attendu 40 minutes.", paidAmount: 9000, refundedSoFar: 0, status: "pending", createdAt: new Date(Date.now() - 86_400_000).toISOString() }],
      decided: [],
    };
  }
  await requireAdmin();
  const db = adminDb();
  const snap = await db.collection("refundRequests").get();
  const uids = [...new Set(snap.docs.map((d) => String(d.get("userId"))))];
  const users = uids.length ? await db.getAll(...uids.map((u) => db.doc(`users/${u}`))) : [];
  const userById = new Map(users.map((u) => [u.id, u.data() ?? {}]));
  const resIds = snap.docs.map((d) => db.doc(`reservations/${d.get("reservationId")}`));
  const res = resIds.length ? await db.getAll(...resIds) : [];
  const resById = new Map(res.map((r) => [r.id, r.data() ?? {}]));
  const all: AdminRefundRequest[] = snap.docs.map((d) => {
    const x = d.data();
    const u = userById.get(x.userId) ?? {};
    const r = resById.get(x.reservationId) ?? {};
    return {
      id: d.id,
      reservationId: x.reservationId,
      userName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Compte supprimé",
      email: u.email ?? "",
      title: x.title?.fr ?? "",
      organizerId: x.organizerId ?? null,
      sessionStartAt: iso(x.sessionStartAt),
      reason: x.reason,
      message: x.message,
      paidAmount: x.paidAmount ?? 0,
      refundedSoFar: Number(r.refundedAmount ?? 0) + Number(r.cancellation?.refundAmount ?? 0),
      status: x.status,
      amount: x.amount,
      decisionMessage: x.message && x.status !== "pending" ? x.message : null,
      createdAt: iso(x.createdAt),
    };
  });
  const pending = all.filter((x) => x.status === "pending" || x.status === "processing").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const decided = all.filter((x) => !["pending", "processing"].includes(x.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  return { pending, decided, isDemo: false };
}
