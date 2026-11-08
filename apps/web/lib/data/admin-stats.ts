import "server-only";
import type { Session } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import type { AdminData } from "./admin";
import { getAdminReviews } from "./admin-reviews";

export type StatsPeriod = "upcoming" | "30d" | "90d" | "all";
export const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: "upcoming", label: "À venir" },
  { key: "30d", label: "30 derniers jours" },
  { key: "90d", label: "90 derniers jours" },
  { key: "all", label: "Depuis le début" },
];

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const ACTIVE = ["confirmed", "attended"];

/** Sessions de la période (les dates passées sont relues : le tableau de bord ne garde que les prochaines). */
async function sessionsIn(d: AdminData, from: number, to: number): Promise<Session[]> {
  const local = [...d.sessions, ...d.recentSessions].filter((s) => {
    const t = new Date(s.startAt).getTime();
    return t >= from && t < to;
  });
  if (!FIREBASE_ENABLED || from >= d.now.getTime() - 3 * 86_400_000) return local;
  const snap = await adminDb()
    .collection("sessions")
    .where("startAt", ">=", Timestamp.fromMillis(Math.max(from, 0)))
    .where("startAt", "<", Timestamp.fromMillis(to))
    .limit(2000)
    .get();
  return snap.docs.map((doc) => {
    const x = doc.data();
    return { id: doc.id, ...x, startAt: (x.startAt as Timestamp).toDate().toISOString(), endAt: (x.endAt as Timestamp).toDate().toISOString() } as Session;
  });
}

/**
 * Statistiques d'une période, à partir des réservations (date de l'expérience), des dates et des avis :
 * chiffre d'affaires, remboursements, remplissage, présence, fidélité, annulations, codes promo, note moyenne.
 */
export async function getPeriodStats(d: AdminData, period: StatsPeriod) {
  const now = d.now.getTime();
  const DAY = 86_400_000;
  const [from, to] =
    period === "upcoming" ? [now, now + 365 * DAY] : period === "30d" ? [now - 30 * DAY, now] : period === "90d" ? [now - 90 * DAY, now] : [0, now + 365 * DAY];
  const inPeriod = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= from && t < to;
  };
  const res = d.reservations.filter((r) => inPeriod(r.sessionStartAt));
  const active = res.filter((r) => ACTIVE.includes(r.status));
  const cancelled = res.filter((r) => r.status === "cancelled" || r.status === "refunded");
  const sessions = (await sessionsIn(d, from, to)).filter((s) => s.status !== "draft" && s.status !== "cancelled");
  const capacity = sum(sessions.map((s) => s.capacity));
  const taken = sum(sessions.map((s) => s.seatsConfirmed));
  // Présence : seulement pour les dates passées où le pointage a été fait.
  const pastChecked = new Set(res.filter((r) => r.status === "attended").map((r) => r.sessionId));
  const checkable = res.filter((r) => pastChecked.has(r.sessionId) && new Date(r.sessionStartAt).getTime() < now);
  const noShows = checkable.filter((r) => r.status === "confirmed" || r.status === "no_show").length;
  const attended = checkable.filter((r) => r.status === "attended").length;
  // Fidélité : membres ayant au moins 2 réservations actives (toutes périodes).
  const perUser = new Map<string, number>();
  for (const r of d.reservations.filter((x) => ACTIVE.includes(x.status))) perUser.set(r.userId, (perUser.get(r.userId) ?? 0) + 1);
  const people = new Set(active.map((r) => r.userId));
  const returning = [...people].filter((u) => (perUser.get(u) ?? 0) >= 2).length;
  const refunds = sum(d.payments.filter((p) => p.type === "refund" && inPeriod(p.createdAt)).map((p) => p.amount));
  const { reviews } = await getAdminReviews();
  const rated = reviews.filter((r) => r.status !== "hidden" && (r.sessionStartAt ? inPeriod(r.sessionStartAt) : inPeriod(r.createdAt)));
  const byMonth = new Map<string, { bookings: number; gross: number }>();
  for (const r of active) {
    const k = r.sessionStartAt.slice(0, 7);
    const m = byMonth.get(k) ?? { bookings: 0, gross: 0 };
    m.bookings += 1;
    m.gross += r.finance.gross;
    byMonth.set(k, m);
  }
  const byCategory = d.categories.map((c) => {
    const rs = active.filter((r) => d.experiences.get(r.experienceId)?.categoryId === c.id);
    const ss = sessions.filter((s) => s.categoryId === c.id);
    const cap = sum(ss.map((s) => s.capacity));
    return {
      id: c.id,
      name: c.name.fr,
      gross: sum(rs.map((r) => r.finance.gross)),
      margin: sum(rs.map((r) => r.finance.margin)),
      bookings: rs.length,
      fill: cap ? sum(ss.map((s) => s.seatsConfirmed)) / cap : 0,
    };
  });
  return {
    gross: sum(active.map((r) => r.finance.gross)),
    margin: sum(active.map((r) => r.finance.margin)),
    cost: sum(active.map((r) => r.finance.cost)),
    refunds,
    bookings: active.length,
    seatsSold: sum(active.map((r) => r.seats)),
    people: people.size,
    returningRate: people.size ? returning / people.size : 0,
    cancelRate: res.length ? cancelled.length / res.length : 0,
    fill: capacity ? taken / capacity : 0,
    sessions: sessions.length,
    noShowRate: attended + noShows ? noShows / (attended + noShows) : null,
    promoBookings: active.filter((r) => r.promoCode).length,
    rating: rated.length ? sum(rated.map((r) => r.rating)) / rated.length : null,
    ratingCount: rated.length,
    byCategory,
    byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
  };
}
