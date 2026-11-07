import "server-only";
import type {
  AppNotification,
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
import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
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

export async function fsCities(): Promise<City[]> {
  const snap = await adminDb().collection("cities").orderBy("order").get();
  return snap.docs.map((d) => withId<City>(d));
}

export async function fsCategories(): Promise<Category[]> {
  // Tri en mémoire (5 documents) : évite un index composite inutile.
  const snap = await adminDb().collection("categories").orderBy("order").get();
  return snap.docs.map((d) => withId<Category>(d)).filter((c) => c.isActive);
}

export async function fsPublishedExperiences(): Promise<Experience[]> {
  const snap = await adminDb().collection("experiences").where("status", "==", "published").get();
  return snap.docs.map((d) => withId<Experience>(d));
}

export async function fsExperienceBySlug(slug: string): Promise<Experience | null> {
  const snap = await adminDb().collection("experiences").where("slug", "==", slug).where("status", "==", "published").limit(1).get();
  return snap.docs[0] ? withId<Experience>(snap.docs[0]) : null;
}

export async function fsExperiencesByIds(ids: string[]): Promise<Map<string, Experience>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const db = adminDb();
  const snaps = await db.getAll(...unique.map((id) => db.doc(`experiences/${id}`)));
  return new Map(snaps.filter((s) => s.exists && s.data()?.status === "published").map((s) => [s.id, withId<Experience>(s)]));
}

export async function fsUpcomingSessions(f: { cityId?: string; categoryId?: CategoryKey; experienceId?: string; from: number; to: number }): Promise<Session[]> {
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

export async function fsSession(id: string): Promise<Session | null> {
  const snap = await adminDb().doc(`sessions/${id}`).get();
  if (!snap.exists || !["published", "full"].includes(snap.data()?.status)) return null;
  return withId<Session>(snap);
}

export async function fsReviews(experienceId?: string): Promise<Review[]> {
  let q = adminDb().collection("reviews").where("status", "==", "published") as FirebaseFirestore.Query;
  if (experienceId) q = q.where("experienceId", "==", experienceId);
  const snap = await q.orderBy("createdAt", "desc").limit(20).get();
  return snap.docs.map((d) => withId<Review>(d));
}

/** Données de l'espace membre — lues par le serveur pour l'utilisateur authentifié uniquement. */
export async function fsMemberData(uid: string) {
  const db = adminDb();
  const [profileSnap, resSnap, notifSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.collection("reservations").where("userId", "==", uid).orderBy("createdAt", "desc").limit(100).get(),
    db.collection(`users/${uid}/notifications`).orderBy("createdAt", "desc").limit(50).get(),
  ]);
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
  return { profile, reservations, groups, notifications };
}
