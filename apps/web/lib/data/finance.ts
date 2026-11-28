import "server-only";
import { commissionAmount, resolveCommission, type CommissionRule, type LedgerEntry } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { DEMO_EXPERIENCES } from "./demo";
import { buildAdminData } from "./demo-admin";
import { DEMO_ORGANIZER } from "./demo-organizer";

/**
 * Étape 21 — commissions, registre et reversements, lus par le serveur.
 * Équipe : tout (après contrôle du rôle). Organisateur : ses écritures et ses reversements seulement
 * (l'appelant a vérifié l'appartenance, voir lib/data/organizer.ts).
 */

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

export type Payout = {
  id: string;
  organizerId: string;
  amount: number;
  gross: number;
  commission: number;
  entries: number;
  status: "pending" | "paid";
  reference?: string;
  bank?: { holder: string; bankName: string; ribLast4: string };
  createdAt: string;
  paidAt?: string;
};

/** Démonstration : règle globale 15 %, règle « Sport » 12 % ; ventes du padel au registre ; un reversement payé. */
const DEMO_RULES: CommissionRule[] = [
  { id: "rule-global", scope: "global", ratePercent: 15, effectiveFrom: "2026-10-01", active: true, note: "Taux de lancement" },
  { id: "rule-move", scope: "category", targetId: "move", ratePercent: 12, effectiveFrom: "2026-11-01", active: true, note: "Sport : taux réduit" },
];
function demoLedger(now: Date): { ledger: LedgerEntry[]; payouts: Payout[] } {
  const d = buildAdminData(now);
  const orgExps = new Map(DEMO_EXPERIENCES.filter((e) => e.organizerId).map((e) => [e.id, e]));
  const ledger: LedgerEntry[] = [];
  for (const r of d.reservations) {
    const e = orgExps.get(r.experienceId);
    if (!e || !["confirmed", "attended", "no_show", "cancelled", "refunded"].includes(r.status) || r.total <= 0) continue;
    const c = resolveCommission(DEMO_RULES, { experienceId: e.id, organizerId: e.organizerId!, categoryId: e.categoryId, at: r.createdAt.slice(0, 10) });
    const commission = commissionAmount(r.total, r.seats, c);
    const past = r.sessionStartAt < new Date(now.getTime() - 86_400_000).toISOString();
    ledger.push({ id: `sale_${r.id}`, kind: "sale", organizerId: e.organizerId!, reservationId: r.id, experienceId: e.id, sessionStartAt: r.sessionStartAt, gross: r.total, commission, payable: r.total - commission, ratePercent: c.ratePercent, status: past ? "paid" : "due", payoutId: past ? "payout-demo-1" : null, createdAt: r.createdAt });
    if (r.status === "cancelled" || r.status === "refunded") {
      ledger.push({ id: `refund_${r.id}_1`, kind: "refund", organizerId: e.organizerId!, reservationId: r.id, experienceId: e.id, sessionStartAt: r.sessionStartAt, gross: -r.total, commission: -commission, payable: -(r.total - commission), ratePercent: c.ratePercent, status: past ? "paid" : "due", payoutId: past ? "payout-demo-1" : null, createdAt: r.createdAt });
    }
  }
  // Une date passée du padel (il y a 10 jours), déjà reversée : 3 ventes fictives.
  const padel = DEMO_EXPERIENCES.find((e) => e.organizerId === DEMO_ORGANIZER.id);
  if (padel && !ledger.some((l) => l.payoutId)) {
    const past = new Date(now.getTime() - 10 * 86_400_000).toISOString();
    const c = resolveCommission(DEMO_RULES, { experienceId: padel.id, organizerId: DEMO_ORGANIZER.id, categoryId: padel.categoryId, at: past.slice(0, 10) });
    for (let i = 1; i <= 3; i++) {
      const gross = padel.price.amount;
      const commission = commissionAmount(gross, 1, c);
      ledger.push({ id: `sale_demo-past-${i}`, kind: "sale", organizerId: DEMO_ORGANIZER.id, reservationId: `demo-past-${i}`, experienceId: padel.id, sessionStartAt: past, gross, commission, payable: gross - commission, ratePercent: c.ratePercent, status: "paid", payoutId: "payout-demo-1", createdAt: new Date(now.getTime() - (14 + i) * 86_400_000).toISOString() });
    }
  }
  const paid = ledger.filter((l) => l.payoutId);
  const payouts: Payout[] = paid.length
    ? [{ id: "payout-demo-1", organizerId: DEMO_ORGANIZER.id, amount: paid.reduce((a, l) => a + l.payable, 0), gross: paid.reduce((a, l) => a + l.gross, 0), commission: paid.reduce((a, l) => a + l.commission, 0), entries: paid.length, status: "paid", reference: "VIR-DEMO-0001", bank: { holder: "Club Padel Anfa SARL", bankName: "Banque démo", ribLast4: "0042" }, createdAt: new Date(now.getTime() - 5 * 86_400_000).toISOString(), paidAt: new Date(now.getTime() - 4 * 86_400_000).toISOString() }]
    : [];
  return { ledger: ledger.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), payouts };
}

const toEntry = (d: FirebaseFirestore.QueryDocumentSnapshot): LedgerEntry => {
  const x = d.data();
  return { id: d.id, kind: x.kind, organizerId: x.organizerId, reservationId: x.reservationId, experienceId: x.experienceId, sessionStartAt: iso(x.sessionStartAt), gross: x.gross, commission: x.commission, payable: x.payable, ratePercent: x.ratePercent, status: x.status, payoutId: x.payoutId ?? null, createdAt: iso(x.createdAt) };
};
const toPayout = (d: FirebaseFirestore.QueryDocumentSnapshot): Payout => {
  const x = d.data();
  return { id: d.id, organizerId: x.organizerId, amount: x.amount, gross: x.gross, commission: x.commission, entries: x.entries, status: x.status, reference: x.reference, bank: x.bank, createdAt: iso(x.createdAt), paidAt: x.paidAt ? iso(x.paidAt) : undefined };
};

/** Règles de commission (équipe). */
export async function getCommissionRules(): Promise<{ rules: (CommissionRule & { createdAt?: string })[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { rules: DEMO_RULES, isDemo: true };
  await requireAdmin();
  const snap = await adminDb().collection("commissionRules").get();
  const rules = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommissionRule, "id">), createdAt: iso(d.get("createdAt")) }));
  return { rules: rules.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)), isDemo: false };
}

/** Registre et reversements de toute la plateforme (équipe). */
export async function getAdminFinance(): Promise<{ ledger: LedgerEntry[]; payouts: Payout[]; isDemo: boolean; now: Date }> {
  await connection();
  const now = new Date();
  if (!FIREBASE_ENABLED) return { ...demoLedger(now), isDemo: true, now };
  await requireAdmin();
  const db = adminDb();
  const [l, p] = await Promise.all([db.collection("commissionLedger").get(), db.collection("payouts").get()]);
  return { ledger: l.docs.map(toEntry).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), payouts: p.docs.map(toPayout).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), isDemo: false, now };
}

/** Registre, reversements et règles applicables d'UN organisateur (appelant déjà vérifié). */
export async function getOrganizerFinance(orgId: string): Promise<{ ledger: LedgerEntry[]; payouts: Payout[]; rules: CommissionRule[]; now: Date }> {
  await connection();
  const now = new Date();
  if (!FIREBASE_ENABLED) {
    const d = demoLedger(now);
    return { ledger: d.ledger.filter((x) => x.organizerId === orgId), payouts: d.payouts.filter((x) => x.organizerId === orgId), rules: DEMO_RULES, now };
  }
  const db = adminDb();
  const [l, p, r] = await Promise.all([
    db.collection("commissionLedger").where("organizerId", "==", orgId).get(),
    db.collection("payouts").where("organizerId", "==", orgId).get(),
    db.collection("commissionRules").get(),
  ]);
  return {
    ledger: l.docs.map(toEntry).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payouts: p.docs.map(toPayout).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    rules: r.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommissionRule, "id">) })),
    now,
  };
}

/** Totaux d'un ensemble d'écritures. « Disponible » = dû et activité passée depuis au moins un jour. */
export function ledgerTotals(entries: LedgerEntry[], now: Date) {
  const sum = (xs: LedgerEntry[], k: "gross" | "commission" | "payable") => xs.reduce((a, x) => a + x[k], 0);
  const cutoff = new Date(now.getTime() - 86_400_000).toISOString();
  const due = entries.filter((x) => x.status === "due");
  return {
    gross: sum(entries.filter((x) => x.kind === "sale"), "gross"),
    refunds: -sum(entries.filter((x) => x.kind === "refund"), "gross"),
    commission: sum(entries, "commission"),
    payable: sum(entries, "payable"),
    due: sum(due, "payable"),
    available: sum(due.filter((x) => x.sessionStartAt && x.sessionStartAt <= cutoff), "payable"),
    inPayout: sum(entries.filter((x) => x.status === "in_payout"), "payable"),
    paid: sum(entries.filter((x) => x.status === "paid"), "payable"),
  };
}
