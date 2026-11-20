/**
 * Espace membre.
 * - Mode démonstration : membre fictif « Salma ».
 * - Mode Firebase : utilisateur authentifié par le cookie de session (vérifié côté serveur) ;
 *   sinon redirection vers la connexion. Les données sont lues par le serveur pour CET utilisateur.
 */
import { canReview, meetWindowOpen, otherOf, type Connection, type Reservation } from "@thecommunity/shared";
import { getLocale } from "next-intl/server";
import { connection } from "next/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { getAccountState, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
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
    // Annulées : la plus récente d'abord (5j).
    cancelled: sorted.filter((r) => bucketOf(r, now) === "cancelled").reverse(),
    toReview: sorted.filter((r) => !r.reviewId && canReview(r, now)),
    // Listes d'attente en cours (une place proposée devient une réservation « à payer »).
    // Triées par date de l'expérience, la plus proche d'abord (5j).
    openWaitlists: data.waitlists
      .filter((w) => w.status === "waiting" && new Date(w.sessionSnapshot.startAt).getTime() > now.getTime())
      .sort((a, b) => a.sessionSnapshot.startAt.localeCompare(b.sessionSnapshot.startAt)),
    // Demandes en attente, ou refusées pour une date à venir (les acceptées deviennent des réservations).
    openRequests: data.requests
      .filter((q) => q.status === "pending" || (q.status === "declined" && new Date(q.sessionSnapshot.startAt).getTime() > now.getTime()))
      .sort((a, b) => a.sessionSnapshot.startAt.localeCompare(b.sessionSnapshot.startAt)),
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

/** Étape 22 — demande de remboursement d'une réservation du membre connecté (lecture serveur). */
export async function getRefundRequest(uid: string | undefined, reservationId: string): Promise<{ status: string; amount?: number; message?: string | null } | null> {
  if (!FIREBASE_ENABLED || !uid) return null;
  const d = (await adminDb().doc(`refundRequests/${reservationId}`).get()).data();
  if (!d || d.userId !== uid) return null;
  return { status: String(d.status), amount: typeof d.amount === "number" ? d.amount : undefined, message: d.message ?? null };
}

/* ——— Étape 31 : « Mes rencontres » ——— */

export type MeetGroup = {
  id: string;
  label: string;
  title: string;
  startAt: string;
  endAt: string;
  windowOpen: boolean;
  members: { uid: string; firstName: string; interests: string[]; wished: boolean; avoided: boolean; matched: boolean }[];
};
export type MeetData = { groups: MeetGroup[]; connections: Connection[]; trustedHost: boolean; isDemo: boolean };

/** Mes groupes passés (révélés), mes souhaits « revoir » (privés), mes connexions réciproques, mes « ne plus être réuni ». */
export async function getMeetData(): Promise<MeetData> {
  const space = await getMemberSpace();
  const me = space.profile.uid;
  let wishes = new Set<string>();
  let avoids = new Set<string>();
  let connections: Connection[] = [];
  if (FIREBASE_ENABLED) {
    const db = adminDb();
    const [w, a, c] = await Promise.all([
      db.collection("meetWishes").where("from", "==", me).get(),
      db.doc(`avoids/${me}`).get(),
      db.collection("connections").where("uids", "array-contains", me).get(),
    ]);
    wishes = new Set(w.docs.map((d) => String(d.get("to"))));
    avoids = new Set(((a.get("uids") as string[] | undefined) ?? []));
    connections = c.docs.map((d) => {
      const x = d.data();
      const iso = (v: unknown) => (v && typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate().toISOString() : String(v ?? ""));
      return { id: d.id, uids: x.uids, names: x.names ?? {}, groupId: x.groupId, sessionId: x.sessionId, experienceTitle: x.experienceTitle ?? "", metAt: iso(x.metAt), matchedAt: iso(x.matchedAt) };
    });
  } else {
    // Démonstration : Lina et Salma se sont choisies, Salma aimerait aussi revoir Omar (il ne le sait pas).
    wishes = new Set(["u-lina", "u-omar"]);
    const g = space.groups[0];
    const r = g ? space.reservations.find((x) => x.groupId === g.id) : undefined;
    connections = g && r ? [{ id: "demo-conn", uids: [me, "u-lina"].sort(), names: { [me]: space.profile.firstName, "u-lina": "Lina" }, groupId: g.id, sessionId: g.sessionId, experienceTitle: r.sessionSnapshot.title.fr, metAt: r.sessionSnapshot.startAt, matchedAt: r.sessionSnapshot.endAt }] : [];
  }
  const matchedWith = new Set(connections.map((c) => otherOf(c, me).uid));
  const groups: MeetGroup[] = space.groups.flatMap((g) => {
    const r = space.reservations.find((x) => x.groupId === g.id);
    if (!r || new Date(r.sessionSnapshot.endAt).getTime() > space.now.getTime()) return [];
    return [{
      id: g.id,
      label: g.label,
      title: r.sessionSnapshot.title.fr,
      startAt: r.sessionSnapshot.startAt,
      endAt: r.sessionSnapshot.endAt,
      windowOpen: meetWindowOpen(r.sessionSnapshot.endAt, space.now),
      members: g.members.filter((m) => m.uid !== me).map((m) => ({ uid: m.uid, firstName: m.firstName, interests: m.interests, wished: wishes.has(m.uid), avoided: avoids.has(m.uid), matched: matchedWith.has(m.uid) })),
    }];
  }).sort((a, b) => b.startAt.localeCompare(a.startAt));
  return { groups, connections, trustedHost: space.profile.trustedHost === true, isDemo: !FIREBASE_ENABLED };
}
