/**
 * Espace membre — en phase 2, il affiche le membre de démonstration.
 * En phase 3 : lecture des données du compte connecté (cookie de session vérifié côté serveur).
 */
import { connection } from "next/server";
import type { Reservation } from "@thecommunity/shared";
import { buildDemoMemberData } from "./demo-member";

export type ReservationBucket = "upcoming" | "past" | "cancelled";

export function bucketOf(r: Reservation, now: Date = new Date()): ReservationBucket {
  if (r.status === "cancelled" || r.status === "refunded" || r.status === "expired") return "cancelled";
  return new Date(r.sessionSnapshot.endAt).getTime() < now.getTime() ? "past" : "upcoming";
}

export async function getMemberSpace() {
  await connection(); // données propres à l'utilisateur : jamais mises en cache statique
  const now = new Date();
  const data = buildDemoMemberData(now);
  const sorted = [...data.reservations].sort((a, b) => a.sessionSnapshot.startAt.localeCompare(b.sessionSnapshot.startAt));
  return {
    ...data,
    now,
    upcoming: sorted.filter((r) => bucketOf(r, now) === "upcoming"),
    past: sorted.filter((r) => bucketOf(r, now) === "past").reverse(),
    cancelled: sorted.filter((r) => bucketOf(r, now) === "cancelled"),
    toReview: sorted.filter((r) => r.status === "attended" && !r.reviewId),
    unreadCount: data.notifications.filter((n) => !n.readAt).length,
  };
}

export async function getMemberReservation(id: string) {
  const space = await getMemberSpace();
  const reservation = space.reservations.find((r) => r.id === id);
  if (!reservation) return null;
  const group = reservation.groupId ? space.groups.find((g) => g.id === reservation.groupId && g.status === "revealed") : undefined;
  return { reservation, group, profile: space.profile, now: space.now };
}
