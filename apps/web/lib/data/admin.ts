/**
 * Accès aux données du back-office. Phase 3 : lecture Firestore via l'Admin SDK,
 * après vérification du rôle admin (custom claim) dans le cookie de session.
 */
import { seatsAvailable, type CategoryKey } from "@thecommunity/shared";
import { connection } from "next/server";
import { DEMO_CATEGORIES, DEMO_EXPERIENCES } from "./demo";
import { buildAdminData, DEMO_ECONOMICS } from "./demo-admin";

export async function getAdminData() {
  await connection();
  const now = new Date();
  const data = buildAdminData(now);
  const experiences = new Map(DEMO_EXPERIENCES.map((e) => [e.id, e]));
  const users = new Map(data.users.map((u) => [u.uid, u]));
  return { ...data, now, experiences, usersById: users };
}

export type AdminData = Awaited<ReturnType<typeof getAdminData>>;

export function computeStats(d: AdminData) {
  const confirmed = d.reservations.filter((r) => r.status === "confirmed");
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const gross = sum(confirmed.map((r) => r.finance.gross));
  const margin = sum(confirmed.map((r) => r.finance.margin));
  const cost = sum(confirmed.map((r) => r.finance.cost));
  const commission = sum(
    confirmed.filter((r) => DEMO_ECONOMICS[r.experienceId]?.model === "commission").map((r) => r.finance.margin),
  );
  const refunds = sum(d.payments.filter((p) => p.type === "refund").map((p) => p.amount));
  const capacity = sum(d.sessions.map((s) => s.capacity));
  const taken = sum(d.sessions.map((s) => s.seatsConfirmed));
  const byCategory = DEMO_CATEGORIES.map((c) => {
    const rs = confirmed.filter((r) => d.experiences.get(r.experienceId)?.categoryId === c.id);
    const ss = d.sessions.filter((s) => s.categoryId === c.id);
    return {
      id: c.id as CategoryKey,
      name: c.name.fr,
      gross: sum(rs.map((r) => r.finance.gross)),
      margin: sum(rs.map((r) => r.finance.margin)),
      bookings: rs.length,
      fill: sum(ss.map((s) => s.capacity)) ? sum(ss.map((s) => s.seatsConfirmed)) / sum(ss.map((s) => s.capacity)) : 0,
    };
  });
  const alerts = [
    ...d.sessions
      .filter((s) => {
        const e = d.experiences.get(s.experienceId);
        const min = e?.groupConfig?.minSize ?? 0;
        const days = (new Date(s.startAt).getTime() - d.now.getTime()) / 86_400_000;
        return days < 7 && s.seatsConfirmed < Math.max(min, Math.ceil(s.capacity * 0.25));
      })
      .map((s) => ({ kind: "low_fill" as const, sessionId: s.id })),
    ...d.payments.filter((p) => p.status === "initiated").map((p) => ({ kind: "pending_payment" as const, reservationId: p.reservationId })),
  ];
  return {
    gross,
    margin,
    cost,
    commission,
    refunds,
    bookings: confirmed.length,
    seatsSold: sum(confirmed.map((r) => r.seats)),
    fill: capacity ? taken / capacity : 0,
    byCategory,
    alerts,
    soldOut: d.sessions.filter((s) => seatsAvailable(s) === 0).length,
  };
}
