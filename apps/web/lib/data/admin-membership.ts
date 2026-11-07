import "server-only";
import { isMemberActive, MEMBERSHIP_PLAN_ID, type MembershipPlan } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { DEMO_MEMBERSHIP_PLAN } from "./demo";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

export type AdminMember = { uid: string; name: string; email: string; status: string; active: boolean; startAt: string; endAt: string; source: string };

/** Formule (même inactive), abonnés et revenus des abonnements, pour le back-office. */
export async function getAdminMembership() {
  await connection();
  if (!FIREBASE_ENABLED) return { plan: DEMO_MEMBERSHIP_PLAN as MembershipPlan | null, members: [] as AdminMember[], revenue: 0, isDemo: true, users: [] as { uid: string; email: string; name: string }[] };
  await requireAdmin();
  const db = adminDb();
  const [planSnap, memSnap, paySnap, usersSnap] = await Promise.all([
    db.doc(`membershipPlans/${MEMBERSHIP_PLAN_ID}`).get(),
    db.collection("memberships").limit(2000).get(),
    db.collection("payments").where("purpose", "==", "membership").limit(5000).get(),
    db.collection("users").limit(5000).get(),
  ]);
  const users = usersSnap.docs.map((d) => ({ uid: d.id, email: (d.data().email as string) ?? "", name: `${d.data().firstName ?? ""} ${d.data().lastName ?? ""}`.trim() }));
  const byUid = new Map(users.map((u) => [u.uid, u]));
  const now = new Date();
  const members: AdminMember[] = memSnap.docs
    .map((d) => {
      const m = d.data();
      const startAt = iso(m.startAt);
      const endAt = iso(m.endAt);
      return {
        uid: d.id,
        name: byUid.get(d.id)?.name ?? "",
        email: byUid.get(d.id)?.email ?? "",
        status: m.status,
        active: isMemberActive({ status: m.status, startAt, endAt }, now),
        startAt,
        endAt,
        source: m.source ?? "purchase",
      };
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || b.endAt.localeCompare(a.endAt));
  const revenue = paySnap.docs.filter((d) => ["succeeded", "partially_refunded"].includes(d.data().status)).reduce((a, d) => a + (d.data().amount as number), 0);
  // Uniquement des données simples (pas d'objets Firestore) : la formule est transmise au formulaire du navigateur.
  const p = planSnap.data();
  const plan: MembershipPlan | null = p
    ? {
        id: planSnap.id,
        name: p.name,
        price: { amount: p.price?.amount ?? 0, currency: "MAD" },
        discountPercent: p.discountPercent ?? 0,
        earlyAccessHours: p.earlyAccessHours ?? 0,
        benefits: (p.benefits ?? []).map((b: { fr: string; ar?: string }) => ({ fr: b.fr, ...(b.ar ? { ar: b.ar } : {}) })),
        isActive: p.isActive === true,
      }
    : null;
  return { plan, members, revenue, isDemo: false, users };
}
