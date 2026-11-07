/**
 * Espace membre.
 * - Mode démonstration : membre fictif « Salma ».
 * - Mode Firebase : utilisateur authentifié par le cookie de session (vérifié côté serveur) ;
 *   sinon redirection vers la connexion. Les données sont lues par le serveur pour CET utilisateur.
 */
import { canReview, type Reservation } from "@thecommunity/shared";
import { getLocale } from "next-intl/server";
import { connection } from "next/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { getAccountState, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { buildDemoMemberData } from "./demo-member";
import { fsMemberData } from "./firestore-source";

export type ReservationBucket = "upcoming" | "past" | "cancelled";

export function bucketOf(r: Reservation, now: Date = new Date()): ReservationBucket {
  if (r.status === "cancelled" || r.status === "refunded" || r.status === "expired") return "cancelled";
  return new Date(r.sessionSnapshot.endAt).getTime() < now.getTime() ? "past" : "upcoming";
}

/** Utilisateur connecté obligatoire (mode Firebase) ; redirige sinon. */
export async function requireMember(options: { allowIncompleteProfile?: boolean; next?: string } = {}): Promise<SessionUser> {
  const locale = await getLocale();
  const user = await getSessionUser();
  if (!user) {
    const suite = options.next ? `?suite=${encodeURIComponent(options.next)}` : "";
    return redirect({ href: `/connexion${suite}`, locale });
  }
  const state = await getAccountState(user.uid);
  if (state.suspended) return redirect({ href: "/connexion?compte=suspendu", locale });
  if (!options.allowIncompleteProfile && !state.onboardingCompleted) return redirect({ href: "/bienvenue", locale });
  return user;
}

/** Mis en cache le temps d'une requête (le layout et la page lisent les mêmes données). */
export const getMemberSpace = cache(async function getMemberSpace() {
  await connection(); // données propres à l'utilisateur : jamais mises en cache statique
  const now = new Date();
  let data: ReturnType<typeof buildDemoMemberData>;
  let session: (SessionUser & { emailVerified: boolean }) | null = null;
  if (FIREBASE_ENABLED) {
    const user = await requireMember({ next: "/espace" });
    // L'état « e-mail vérifié » est relu sur le compte (le cookie garde l'état du moment de la connexion).
    const record = await adminAuth().getUser(user.uid);
    session = { ...user, emailVerified: record.emailVerified };
    data = await fsMemberData(user.uid);
  } else {
    data = buildDemoMemberData(now);
  }
  const sorted = [...data.reservations].sort((a, b) => a.sessionSnapshot.startAt.localeCompare(b.sessionSnapshot.startAt));
  return {
    ...data,
    now,
    session,
    isDemo: !FIREBASE_ENABLED,
    upcoming: sorted.filter((r) => bucketOf(r, now) === "upcoming"),
    past: sorted.filter((r) => bucketOf(r, now) === "past").reverse(),
    cancelled: sorted.filter((r) => bucketOf(r, now) === "cancelled"),
    toReview: sorted.filter((r) => !r.reviewId && canReview(r, now)),
    // Listes d'attente en cours (une place proposée devient une réservation « à payer »).
    openWaitlists: data.waitlists.filter((w) => w.status === "waiting" && new Date(w.sessionSnapshot.startAt).getTime() > now.getTime()),
    // Demandes en attente, ou refusées pour une date à venir (les acceptées deviennent des réservations).
    openRequests: data.requests.filter(
      (q) => q.status === "pending" || (q.status === "declined" && new Date(q.sessionSnapshot.startAt).getTime() > now.getTime()),
    ),
    unreadCount: data.notifications.filter((n) => !n.readAt).length,
  };
});

export async function getMemberReservation(id: string) {
  const space = await getMemberSpace();
  const reservation = space.reservations.find((r) => r.id === id);
  if (!reservation) return null;
  const group = reservation.groupId ? space.groups.find((g) => g.id === reservation.groupId && g.status === "revealed") : undefined;
  const review = space.myReviews.find((x) => x.id === reservation.id);
  return { reservation, group, profile: space.profile, now: space.now, review };
}
