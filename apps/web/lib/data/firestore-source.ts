import "server-only";
import type {
  AppNotification,
  BookingRequest,
  WaitlistEntry,
  Category,
  CategoryKey,
  City,
  Experience,
  Group,
  Reservation,
  Review,
  Session,
  UserProfile,
} from "@thecommunity/shared";
import { MEMBERSHIP_PLAN_ID, type Membership, type MembershipPlan } from "@thecommunity/shared";
import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";

/** Convertit les Timestamp Firestore en chaînes ISO (format utilisé par toute l'interface). */
function plain<T>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => plain(v)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)])) as T;
  }
  return value as T;
}
const withId = <T>(snap: DocumentSnapshot) => plain<T>({ id: snap.id, ...snap.data() });

/**
 * Données publiques du catalogue mises en cache 5 minutes (étiquette « catalog ») pour limiter
 * les lectures Firestore ; le back-office vide ce cache à chaque modification (/api/admin/revalidate).
 * Les données personnelles (espace membre) et le back-office ne sont JAMAIS mis en cache.
 */
export const CATALOG_TAG = "catalog";
const cached = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) =>
  unstable_cache(fn, [key], { tags: [CATALOG_TAG], revalidate: 300 });

async function fsCitiesRaw(): Promise<City[]> {
  const snap = await adminDb().collection("cities").orderBy("order").get();
  return snap.docs.map((d) => withId<City>(d));
}

async function fsCategoriesRaw(): Promise<Category[]> {
  // Tri en mémoire (5 documents) : évite un index composite inutile.
  const snap = await adminDb().collection("categories").orderBy("order").get();
  return snap.docs.map((d) => withId<Category>(d)).filter((c) => c.isActive);
}

async function fsPublishedExperiencesRaw(): Promise<Experience[]> {
  const snap = await adminDb().collection("experiences").where("status", "==", "published").get();
  return snap.docs.map((d) => withId<Experience>(d));
}

async function fsExperienceBySlugRaw(slug: string): Promise<Experience | null> {
  const snap = await adminDb().collection("experiences").where("slug", "==", slug).where("status", "==", "published").limit(1).get();
  return snap.docs[0] ? withId<Experience>(snap.docs[0]) : null;
}

async function fsExperiencesListRaw(sortedIds: string[]): Promise<Experience[]> {
  if (sortedIds.length === 0) return [];
  const db = adminDb();
  const snaps = await db.getAll(...sortedIds.map((id) => db.doc(`experiences/${id}`)));
  return snaps.filter((s) => s.exists && s.data()?.status === "published").map((s) => withId<Experience>(s));
}
const fsExperiencesList = cached(fsExperiencesListRaw, "fsExperiencesList");

export async function fsExperiencesByIds(ids: string[]): Promise<Map<string, Experience>> {
  const list = await fsExperiencesList([...new Set(ids)].sort());
  return new Map(list.map((e) => [e.id, e]));
}

async function fsUpcomingSessionsRaw(f: { cityId?: string; categoryId?: CategoryKey; experienceId?: string; from: number; to: number }): Promise<Session[]> {
  let q = adminDb().collection("sessions").where("status", "in", ["published", "full"]) as FirebaseFirestore.Query;
  if (f.experienceId) q = q.where("experienceId", "==", f.experienceId);
  else {
    if (f.cityId) q = q.where("cityId", "==", f.cityId);
    if (f.categoryId) q = q.where("categoryId", "==", f.categoryId);
  }
  q = q.where("startAt", ">=", Timestamp.fromMillis(f.from));
  if (Number.isFinite(f.to)) q = q.where("startAt", "<", Timestamp.fromMillis(f.to));
  const snap = await q.orderBy("startAt").limit(200).get();
  return snap.docs.map((d) => withId<Session>(d));
}

async function fsSessionRaw(id: string): Promise<Session | null> {
  const snap = await adminDb().doc(`sessions/${id}`).get();
  if (!snap.exists || !["published", "full"].includes(snap.data()?.status)) return null;
  return withId<Session>(snap);
}

/**
 * Dernières dates passées d'une expérience (« éditions passées »), hors dates annulées.
 * Section secondaire : en cas d'erreur (ex. index en cours de construction), la fiche s'affiche sans elle.
 */
async function fsPastSessionsRaw(experienceId: string, now: number): Promise<Session[]> {
  try {
    const snap = await adminDb()
      .collection("sessions")
      .where("experienceId", "==", experienceId)
      .where("startAt", "<", Timestamp.fromMillis(now))
      .orderBy("startAt", "desc")
      .limit(24)
      .get();
    return snap.docs.map((d) => withId<Session>(d)).filter((x) => ["published", "full", "completed"].includes(x.status));
  } catch (e) {
    console.error("Éditions passées indisponibles", experienceId, e);
    return [];
  }
}

async function fsMembershipPlanRaw(): Promise<MembershipPlan | null> {
  const snap = await adminDb().doc(`membershipPlans/${MEMBERSHIP_PLAN_ID}`).get();
  const p = snap.data();
  if (p?.isActive !== true) return null;
  return { id: snap.id, name: p.name, price: { amount: p.price?.amount ?? 0, currency: "MAD" }, discountPercent: p.discountPercent ?? 0, earlyAccessHours: p.earlyAccessHours ?? 0, benefits: p.benefits ?? [], isActive: true };
}

async function fsReviewsRaw(experienceId?: string): Promise<Review[]> {
  let q = adminDb().collection("reviews").where("status", "==", "published") as FirebaseFirestore.Query;
  if (experienceId) q = q.where("experienceId", "==", experienceId);
  const snap = await q.orderBy("createdAt", "desc").limit(20).get();
  return snap.docs.map((d) => withId<Review>(d));
}

/** Données de l'espace membre — lues par le serveur pour l'utilisateur authentifié uniquement. */
export async function fsMemberData(uid: string) {
  const db = adminDb();
  const [profileSnap, resSnap, notifSnap, reqSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.collection("reservations").where("userId", "==", uid).orderBy("createdAt", "desc").limit(100).get(),
    db.collection(`users/${uid}/notifications`).orderBy("createdAt", "desc").limit(50).get(),
    db.collection("bookingRequests").where("userId", "==", uid).orderBy("createdAt", "desc").limit(50).get(),
  ]);
  const [waitSnap, myReviewsSnap, memSnap] = await Promise.all([
    db.collectionGroup("waitlist").where("userId", "==", uid).limit(50).get(),
    db.collection("reviews").where("userId", "==", uid).limit(100).get(),
    db.doc(`memberships/${uid}`).get(),
  ]);
  const membership = memSnap.exists ? withId<Membership>(memSnap) : null;
  const myReviews = myReviewsSnap.docs.map((d) => withId<Review>(d));
  const waitlists = waitSnap.docs.map((d) => withId<WaitlistEntry>(d));
  const requests = reqSnap.docs.map((d) => withId<BookingRequest>(d));
  const reservations = resSnap.docs.map((d) => withId<Reservation>(d));
  const groupIds = [...new Set(reservations.map((r) => r.groupId).filter((g): g is string => Boolean(g)))];
  const groupSnaps = groupIds.length ? await db.getAll(...groupIds.map((g) => db.doc(`groups/${g}`))) : [];
  const groups = groupSnaps
    .filter((s) => s.exists && s.data()?.status === "revealed" && (s.data()?.memberIds as string[]).includes(uid))
    .map((s) => withId<Group>(s));
  const p = plain<Record<string, unknown>>(profileSnap.data() ?? {});
  const profile = {
    uid,
    firstName: "",
    lastName: "",
    email: "",
    birthDate: "",
    cityId: "casablanca",
    languages: [],
    interests: [],
    socialGoals: [],
    locale: "fr",
    onboardingCompleted: false,
    notificationPrefs: { email: true, push: false, marketingEmail: false },
    createdAt: new Date().toISOString(),
    ...p,
  } as UserProfile;
  const notifications = notifSnap.docs.map((d) => withId<AppNotification>(d));
  return { profile, reservations, groups, notifications, requests, waitlists, myReviews, membership };
}

export const fsCities = cached(fsCitiesRaw, "fsCities");
export const fsCategories = cached(fsCategoriesRaw, "fsCategories");
export const fsPublishedExperiences = cached(fsPublishedExperiencesRaw, "fsPublishedExperiences");
export const fsExperienceBySlug = cached(fsExperienceBySlugRaw, "fsExperienceBySlug");
export const fsUpcomingSessions = cached(fsUpcomingSessionsRaw, "fsUpcomingSessions");
export const fsSession = cached(fsSessionRaw, "fsSession");
/** Lecture SANS cache : places restantes exactes pour le tunnel de réservation. */
export const fsSessionFresh = fsSessionRaw;
export const fsReviews = cached(fsReviewsRaw, "fsReviews");
export const fsPastSessions = cached(fsPastSessionsRaw, "fsPastSessions");
export const fsMembershipPlan = cached(fsMembershipPlanRaw, "fsMembershipPlan");
