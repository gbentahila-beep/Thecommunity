import "server-only";
import { ticketCode, type Experience, type Organizer, type OrganizerStatus, type Review } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { DEMO_EXPERIENCES, DEMO_REVIEWS } from "./demo";
import { buildAdminData } from "./demo-admin";
import { DEMO_ORGANIZER, DEMO_ORGANIZER_DETAILS } from "./demo-organizer";

/**
 * Étape 20 — données de l'espace organisateur (/pro), lues par le serveur (Admin SDK) APRÈS contrôle :
 * session valide, users/{uid}.organizerId, et appartenance à l'organisation (memberUids). Un organisateur ne voit
 * que ce qui porte SON identifiant. Démonstration : « Club Padel Anfa », données fictives.
 */

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : new Date(0).toISOString());
function plain<T>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => plain(v)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)])) as T;
  }
  return value as T;
}

export type OrganizerDetails = {
  ownerUid: string;
  memberUids: string[];
  contactName: string;
  email: string;
  phone: string;
  address: string;
  documents: { path: string; name: string }[];
  pendingLogoPath?: string | null;
  terms?: { version: string; acceptedAt: string };
  decisionMessage?: string | null;
  submittedAt?: string;
  history: { at: string; by: string; action: string; message?: string | null }[];
  /** Étape 21 : coordonnées de reversement (RIB professionnel de l'organisateur). */
  bank?: { holder: string; bankName: string; rib: string } | null;
};

export type OrganizerSpace = {
  isDemo: boolean;
  user: { uid: string; email: string | null; emailVerified: boolean } | null;
  status: OrganizerStatus | "none";
  organizer: Organizer | null;
  details: OrganizerDetails | null;
};

/** Contexte de l'espace organisateur. Sans session (mode Firebase) : vers la connexion. */
export const getOrganizerSpace = cache(async function getOrganizerSpace(): Promise<OrganizerSpace> {
  await connection();
  if (!FIREBASE_ENABLED) return { isDemo: true, user: null, status: "approved", organizer: DEMO_ORGANIZER, details: DEMO_ORGANIZER_DETAILS };
  const user = await getSessionUser();
  if (!user) redirect("/connexion?suite=/pro");
  const db = adminDb();
  const orgId = (await db.doc(`users/${user.uid}`).get()).get("organizerId") as string | undefined;
  const base = { isDemo: false, user: { uid: user.uid, email: user.email, emailVerified: user.emailVerified } };
  if (!orgId) return { ...base, status: "none", organizer: null, details: null };
  const [org, det] = await Promise.all([db.doc(`organizers/${orgId}`).get(), db.doc(`organizers/${orgId}/private/details`).get()]);
  const details = det.exists ? plain<OrganizerDetails>(det.data()) : null;
  if (!org.exists || !details?.memberUids?.includes(user.uid)) return { ...base, status: "none", organizer: null, details: null };
  const organizer = plain<Organizer>({ id: org.id, ...org.data() });
  return { ...base, status: organizer.status, organizer, details };
});

/** Pages réservées aux comptes validés : sinon retour à l'accueil de l'espace (qui explique le statut). */
export async function requireApprovedOrganizer() {
  const space = await getOrganizerSpace();
  if (space.status !== "approved" || !space.organizer) redirect("/pro");
  return space as OrganizerSpace & { organizer: Organizer };
}

export type ProSession = { id: string; experienceId: string; title: string; startAt: string; capacity: number; seatsConfirmed: number; seatsHeld: number; waitlistCount: number; status: string };
export type ProReservation = {
  id: string;
  code: string;
  status: string;
  seats: number;
  total: number;
  createdAt: string;
  sessionId: string;
  experienceId: string;
  title: string;
  sessionStartAt: string;
  participant: string;
  diet?: string;
  allergies?: string;
  checkedIn: boolean;
  /** Le participant a indiqué son arrivée lui-même (arrivée autonome, docs/16). */
  arrived?: boolean;
};
export type ProRequest = { id: string; sessionId: string; experienceId: string; title: string; startAt: string; seats: number; message: string; instagram?: string; participant: string; createdAt: string; status: string };

export type ProData = { experiences: Experience[]; sessions: ProSession[]; reservations: ProReservation[]; requests: ProRequest[]; now: Date };

const nameOf = (u: DocumentData | undefined) => (u?.firstName ? `${u.firstName} ${String(u.lastName ?? "").slice(0, 1)}${u.lastName ? "." : ""}` : "Compte supprimé");

/** Activités, dates, réservations et demandes de l'organisation (toutes, triées). */
export const getProData = cache(async function getProData(orgId: string): Promise<ProData> {
  await connection();
  const now = new Date();
  if (!FIREBASE_ENABLED) return demoProData(orgId, now);
  const db = adminDb();
  // Requêtes d'égalité seulement (pas d'index composite) ; tri et filtres en mémoire.
  const [expSnap, sesSnap, resSnap, reqSnap] = await Promise.all([
    db.collection("experiences").where("organizerId", "==", orgId).get(),
    db.collection("sessions").where("organizerId", "==", orgId).get(),
    db.collection("reservations").where("organizerId", "==", orgId).get(),
    db.collection("bookingRequests").where("organizerId", "==", orgId).get(),
  ]);
  const experiences = expSnap.docs.map((d) => plain<Experience>({ id: d.id, ...d.data() })).sort((a, b) => a.title.fr.localeCompare(b.title.fr));
  const titleOf = new Map(experiences.map((e) => [e.id, e.title.fr]));
  const sessions: ProSession[] = sesSnap.docs
    .map((d) => {
      const s = d.data();
      return { id: d.id, experienceId: s.experienceId, title: titleOf.get(s.experienceId) ?? s.experienceSnapshot?.title?.fr ?? "", startAt: iso(s.startAt), capacity: s.capacity ?? 0, seatsConfirmed: s.seatsConfirmed ?? 0, seatsHeld: s.seatsHeld ?? 0, waitlistCount: s.waitlistCount ?? 0, status: s.status };
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const uids = [...new Set([...resSnap.docs, ...reqSnap.docs].map((d) => d.data().userId as string))];
  const users = uids.length ? await db.getAll(...uids.map((u) => db.doc(`users/${u}`))) : [];
  const userById = new Map(users.map((u) => [u.id, u.data()]));
  const reservations: ProReservation[] = resSnap.docs
    .map((d) => {
      const r = d.data();
      const share = r.preferences?.shareWithVenue !== false;
      return {
        id: d.id,
        code: ticketCode(d.id),
        status: r.status,
        seats: r.seats ?? 1,
        total: r.pricing?.total ?? 0,
        createdAt: iso(r.createdAt),
        sessionId: r.sessionId,
        experienceId: r.experienceId,
        title: titleOf.get(r.experienceId) ?? r.sessionSnapshot?.title?.fr ?? "",
        sessionStartAt: iso(r.sessionSnapshot?.startAt),
        participant: nameOf(userById.get(r.userId)),
        // Régime et allergies : seulement si la personne accepte qu'ils soient transmis au lieu (5g).
        ...(share && r.preferences ? { diet: r.preferences.diet ?? "", allergies: r.preferences.allergies ?? "" } : {}),
        checkedIn: r.status === "attended",
        arrived: Boolean(r.arrivedAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const requests: ProRequest[] = reqSnap.docs
    .map((d) => {
      const r = d.data();
      return { id: d.id, sessionId: r.sessionId, experienceId: r.experienceId, title: titleOf.get(r.experienceId) ?? r.sessionSnapshot?.title?.fr ?? "", startAt: iso(r.sessionSnapshot?.startAt), seats: r.seats ?? 1, message: r.message ?? "", instagram: r.instagram ?? undefined, participant: nameOf(userById.get(r.userId)), createdAt: iso(r.createdAt), status: r.status };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { experiences, sessions, reservations, requests, now };
});

function demoProData(orgId: string, now: Date): ProData {
  const experiences = DEMO_EXPERIENCES.filter((e) => e.organizerId === orgId);
  const ids = new Set(experiences.map((e) => e.id));
  const titleOf = new Map(experiences.map((e) => [e.id, e.title.fr]));
  const d = buildAdminData(now);
  const users = new Map(d.users.map((u) => [u.uid, u]));
  const sessions: ProSession[] = d.sessions
    .filter((s) => ids.has(s.experienceId))
    .map((s) => ({ id: s.id, experienceId: s.experienceId, title: titleOf.get(s.experienceId) ?? "", startAt: s.startAt, capacity: s.capacity, seatsConfirmed: s.seatsConfirmed, seatsHeld: s.seatsHeld, waitlistCount: s.waitlistCount, status: s.status }))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const reservations: ProReservation[] = d.reservations
    .filter((r) => ids.has(r.experienceId))
    .map((r) => {
      const u = users.get(r.userId);
      return {
        id: r.id,
        code: ticketCode(r.id),
        status: r.status,
        seats: r.seats,
        total: r.total,
        createdAt: r.createdAt,
        sessionId: r.sessionId,
        experienceId: r.experienceId,
        title: titleOf.get(r.experienceId) ?? "",
        sessionStartAt: r.sessionStartAt,
        participant: u ? `${u.firstName} ${u.lastName.slice(0, 1)}.` : "Compte supprimé",
        ...(r.preferences?.shareWithVenue ? { diet: r.preferences.diet, allergies: r.preferences.allergies } : {}),
        checkedIn: r.status === "attended",
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { experiences, sessions, reservations, requests: [], now };
}

/** Chiffres du tableau de bord (réservations payées seulement). */
export function proStats(d: ProData) {
  const paid = d.reservations.filter((r) => ["confirmed", "attended", "no_show"].includes(r.status));
  const monthStart = new Date(d.now.getFullYear(), d.now.getMonth(), 1).toISOString();
  const upcoming = d.sessions.filter((s) => s.startAt >= d.now.toISOString() && s.status !== "cancelled");
  const capacity = upcoming.reduce((a, s) => a + s.capacity, 0);
  const taken = upcoming.reduce((a, s) => a + s.seatsConfirmed, 0);
  const cancelled = d.reservations.filter((r) => ["cancelled", "refunded"].includes(r.status)).length;
  return {
    upcomingSessions: upcoming.length,
    upcomingSeats: taken,
    fill: capacity ? taken / capacity : 0,
    grossMonth: paid.filter((r) => r.createdAt >= monthStart).reduce((a, r) => a + r.total, 0),
    grossTotal: paid.reduce((a, r) => a + r.total, 0),
    bookings: paid.length,
    cancellationRate: d.reservations.length ? cancelled / d.reservations.length : 0,
    pendingRequests: d.requests.filter((r) => r.status === "pending").length,
    published: d.experiences.filter((e) => e.status === "published").length,
    inReview: d.experiences.filter((e) => e.status === "pending_review").length,
  };
}

/** Étape 24 — avis publiés sur les activités de l'organisateur (les plus récents d'abord). */
export async function getProReviews(experiences: Pick<Experience, "id" | "title">[]): Promise<(Review & { title: string })[]> {
  await connection();
  const titles = new Map(experiences.map((e) => [e.id, e.title.fr]));
  const ids = [...titles.keys()];
  if (!FIREBASE_ENABLED) return DEMO_REVIEWS.filter((r) => titles.has(r.experienceId)).map((r) => ({ ...r, title: titles.get(r.experienceId)! }));
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
  const snaps = await Promise.all(chunks.map((c) => adminDb().collection("reviews").where("experienceId", "in", c).get()));
  return snaps
    .flatMap((s) => s.docs)
    .map((d) => plain<Review>({ id: d.id, ...d.data() }))
    .filter((r) => r.status === "published")
    .map((r) => ({ ...r, title: titles.get(r.experienceId) ?? "" }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
