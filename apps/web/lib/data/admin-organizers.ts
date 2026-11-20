import "server-only";
import type { Organizer } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { DEMO_ORGANIZER, DEMO_ORGANIZER_DETAILS, DEMO_PENDING_ORGANIZER, DEMO_PENDING_ORGANIZER_DETAILS } from "./demo-organizer";
import type { OrganizerDetails } from "./organizer";

function plain<T>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => plain(v)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)])) as T;
  }
  return value as T;
}

export type AdminOrganizer = Organizer & { details: OrganizerDetails | null; activityCounts: { total: number; pending: number; published: number } };

/** Étape 20 — organisateurs pour le back-office (après contrôle du rôle admin). */
export async function getAdminOrganizers(): Promise<{ organizers: AdminOrganizer[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) {
    return {
      isDemo: true,
      organizers: [
        { ...DEMO_PENDING_ORGANIZER, details: DEMO_PENDING_ORGANIZER_DETAILS, activityCounts: { total: 0, pending: 0, published: 0 } },
        { ...DEMO_ORGANIZER, details: DEMO_ORGANIZER_DETAILS, activityCounts: { total: 1, pending: 0, published: 1 } },
      ],
    };
  }
  await requireAdmin();
  const db = adminDb();
  const [orgs, exps] = await Promise.all([db.collection("organizers").get(), db.collection("experiences").where("organizerId", "!=", null).get()]);
  const details = orgs.empty ? [] : await db.getAll(...orgs.docs.map((d) => db.doc(`organizers/${d.id}/private/details`)));
  const detById = new Map(details.map((d) => [d.ref.parent.parent!.id, d.exists ? plain<OrganizerDetails>(d.data()) : null]));
  const organizers = orgs.docs.map((d) => {
    const mine = exps.docs.filter((e) => e.get("organizerId") === d.id);
    return {
      ...plain<Organizer>({ id: d.id, ...d.data() }),
      details: detById.get(d.id) ?? null,
      activityCounts: { total: mine.length, pending: mine.filter((e) => e.get("status") === "pending_review").length, published: mine.filter((e) => e.get("status") === "published").length },
    };
  });
  const order = { pending: 0, info_requested: 1, approved: 2, suspended: 3, rejected: 4 } as Record<string, number>;
  organizers.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(b.createdAt).localeCompare(String(a.createdAt)));
  return { organizers, isDemo: false };
}

/** Nombre de demandes d'organisateurs à traiter et d'activités à relire (menu et tableau de bord). */
export async function countOrganizerTodo(): Promise<{ organizers: number; activities: number }> {
  if (!FIREBASE_ENABLED) return { organizers: 1, activities: 0 };
  const db = adminDb();
  const [o, e, f] = await Promise.all([
    db.collection("organizers").where("status", "==", "pending").count().get(),
    db.collection("experiences").where("status", "==", "pending_review").count().get(),
    db.collection("experiences").where("reviewFlag", "==", true).count().get(),
  ]);
  return { organizers: o.data().count, activities: e.data().count + f.data().count };
}
