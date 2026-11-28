import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { connection } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { requireMember } from "./member";

export type MemberInvoice = {
  id: string;
  number: string;
  kind: "invoice" | "credit_note";
  purpose: "reservation" | "membership";
  label: string;
  total: number;
  currency: string;
  issuedAt: string;
  reservationId: string | null;
  test: boolean;
  legal: boolean;
  pdfReady: boolean;
};

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

export function toMemberInvoice(id: string, d: DocumentData): MemberInvoice {
  return {
    id,
    number: String(d.number ?? ""),
    kind: d.kind === "credit_note" ? "credit_note" : "invoice",
    purpose: d.purpose === "membership" ? "membership" : "reservation",
    label: String(d.lines?.[0]?.label ?? ""),
    total: Number(d.totals?.ttc ?? 0),
    currency: String(d.currency ?? "MAD"),
    issuedAt: iso(d.issuedAt),
    reservationId: d.reservationId ?? null,
    test: Boolean(d.test),
    legal: Boolean(d.legal),
    pdfReady: Boolean(d.pdfReady),
  };
}

/** Factures, avoirs et reçus du membre connecté (les plus récents d'abord). Démo : aucune. */
export async function getMyInvoices(): Promise<{ invoices: MemberInvoice[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { invoices: [], isDemo: true };
  const user = await requireMember({ next: "/espace/factures" });
  const snap = await adminDb().collection("invoices").where("userId", "==", user.uid).orderBy("issuedAt", "desc").limit(200).get();
  return { invoices: snap.docs.map((d) => toMemberInvoice(d.id, d.data())), isDemo: false };
}

/** Documents liés à une réservation du membre (facture, puis avoir éventuel). */
export async function getReservationInvoices(uid: string, reservationId: string): Promise<MemberInvoice[]> {
  if (!FIREBASE_ENABLED) return [];
  const snap = await adminDb().collection("invoices").where("reservationId", "==", reservationId).where("userId", "==", uid).get();
  return snap.docs.map((d) => toMemberInvoice(d.id, d.data())).sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
}
