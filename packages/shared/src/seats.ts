import type { Session } from "./types";

/** Places encore réservables : capacité − confirmées − bloquées pendant un paiement. */
export function seatsAvailable(session: Pick<Session, "capacity" | "seatsConfirmed" | "seatsHeld">): number {
  return Math.max(0, session.capacity - session.seatsConfirmed - session.seatsHeld);
}

export function isBookable(session: Session, now: Date = new Date()): boolean {
  return (
    session.status === "published" &&
    seatsAvailable(session) > 0 &&
    new Date(session.startAt).getTime() > now.getTime()
  );
}

/** Seuil à partir duquel on affiche « plus que N places ». */
export const LOW_SEATS_THRESHOLD = 4;
