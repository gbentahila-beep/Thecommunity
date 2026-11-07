import "server-only";
import { ageOn, type BookingRequest, type Interest } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : undefined);

export type AdminRequestItem = {
  request: BookingRequest;
  person: {
    firstName: string;
    lastName: string;
    email: string;
    age: number | null;
    profession: string;
    bio: string;
    interests: Interest[];
    photoPath: string | null;
    memberSince?: string;
  };
  history: { confirmed: number; attended: number; noShows: number; cancelled: number };
  session: { seatsLeft: number; capacity: number; status: string } | null;
};

/**
 * Demandes de participation pour le back-office : en attente (les plus anciennes d'abord)
 * et les 50 dernières décisions. Avec, pour chaque personne, son profil et son historique.
 */
export async function getAdminRequests(): Promise<{ pending: AdminRequestItem[]; decided: AdminRequestItem[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { pending: [], decided: [], isDemo: true };
  await requireAdmin();
  const db = adminDb();
  const [pendingSnap, decidedSnap] = await Promise.all([
    db.collection("bookingRequests").where("status", "==", "pending").orderBy("createdAt", "asc").limit(200).get(),
    db.collection("bookingRequests").where("status", "in", ["accepted", "declined"]).orderBy("decidedAt", "desc").limit(50).get(),
  ]);
  const docs = [...pendingSnap.docs, ...decidedSnap.docs];
  const uids = [...new Set(docs.map((d) => d.data().userId as string))];
  const sids = [...new Set(docs.map((d) => d.data().sessionId as string))];
  const [users, sessions, histories] = await Promise.all([
    uids.length ? db.getAll(...uids.map((u) => db.doc(`users/${u}`))) : Promise.resolve([]),
    sids.length ? db.getAll(...sids.map((s) => db.doc(`sessions/${s}`))) : Promise.resolve([]),
    Promise.all(uids.map((u) => db.collection("reservations").where("userId", "==", u).limit(200).get())),
  ]);
  const userById = new Map(users.map((u) => [u.id, u.data() ?? {}]));
  const sessionById = new Map(sessions.map((s) => [s.id, s.data()]));
  const historyById = new Map(
    uids.map((u, i) => {
      const rs = histories[i]!.docs.map((d) => d.data().status as string);
      const count = (...st: string[]) => rs.filter((s) => st.includes(s)).length;
      return [u, { confirmed: count("confirmed"), attended: count("attended"), noShows: count("no_show"), cancelled: count("cancelled", "refunded") }];
    }),
  );
  const toItem = (d: FirebaseFirestore.QueryDocumentSnapshot): AdminRequestItem => {
    const r = d.data();
    const u = userById.get(r.userId) ?? {};
    const s = sessionById.get(r.sessionId);
    return {
      request: {
        id: d.id,
        userId: r.userId,
        sessionId: r.sessionId,
        experienceId: r.experienceId,
        seats: r.seats,
        message: r.message ?? "",
        instagram: r.instagram ?? undefined,
        status: r.status,
        reservationId: r.reservationId ?? undefined,
        sessionSnapshot: { ...r.sessionSnapshot, startAt: iso(r.sessionSnapshot?.startAt) ?? "", endAt: iso(r.sessionSnapshot?.endAt) ?? "" },
        createdAt: iso(r.createdAt) ?? "",
        decidedAt: iso(r.decidedAt),
      },
      person: {
        firstName: u.firstName ?? "",
        lastName: u.lastName ?? "",
        email: u.email ?? "",
        age: typeof u.birthDate === "string" && u.birthDate ? ageOn(u.birthDate) : null,
        profession: u.profession ?? "",
        bio: u.bio ?? "",
        interests: (u.interests ?? []) as Interest[],
        photoPath: u.photoPath ?? null,
        memberSince: iso(u.createdAt),
      },
      history: historyById.get(r.userId) ?? { confirmed: 0, attended: 0, noShows: 0, cancelled: 0 },
      session: s ? { seatsLeft: Math.max(0, s.capacity - s.seatsConfirmed - s.seatsHeld), capacity: s.capacity, status: s.status } : null,
    };
  };
  return { pending: pendingSnap.docs.map(toItem), decided: decidedSnap.docs.map(toItem), isDemo: false };
}

/** Nombre de demandes en attente (pastille du menu). */
export async function countPendingRequests(): Promise<number> {
  if (!FIREBASE_ENABLED) return 0;
  const snap = await adminDb().collection("bookingRequests").where("status", "==", "pending").count().get();
  return snap.data().count;
}
