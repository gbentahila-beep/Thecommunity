import "server-only";
import { carnetCredits, countedAbsences, isMemberActive, isSuspended, MEMBERSHIP_PLAN_ID, type MembershipPlan, type MembershipOffer } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { DEMO_MEMBERSHIP_PLAN } from "./demo";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

export type AdminMember = { uid: string; name: string; email: string; status: string; active: boolean; startAt: string; endAt: string; source: string; suspendedUntil: string | null; absences: number };
export type AdminCarnet = { uid: string; name: string; email: string; credits: number; expiresAt: string; usable: number };
export type AdminAbsence = { reservationId: string; uid: string; name: string; title: string; startAt: string; pass: boolean };

/** Formule (même inactive), abonnés et revenus des abonnements, pour le back-office. */
export async function getAdminMembership() {
  await connection();
  if (!FIREBASE_ENABLED) return { plan: DEMO_MEMBERSHIP_PLAN as MembershipPlan | null, members: [] as AdminMember[], carnets: [] as AdminCarnet[], absences: [] as AdminAbsence[], revenue: 0, isDemo: true, users: [] as { uid: string; email: string; name: string }[] };
  await requireAdmin();
  const db = adminDb();
  const [planSnap, memSnap, paySnap, usersSnap, carSnap, absSnap] = await Promise.all([
    db.doc(`membershipPlans/${MEMBERSHIP_PLAN_ID}`).get(),
    db.collection("memberships").limit(2000).get(),
    db.collection("payments").where("purpose", "==", "membership").limit(5000).get(),
    db.collection("users").limit(5000).get(),
    db.collection("carnets").limit(2000).get(),
    db.collection("reservations").where("status", "==", "no_show").limit(300).get(),
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
        suspendedUntil: isSuspended({ suspendedUntil: iso(m.suspendedUntil) || null }, now) ? iso(m.suspendedUntil) : null,
        absences: countedAbsences(((m.absences ?? []) as { at: unknown }[]).map((a) => ({ at: iso(a.at) })), now, iso(m.lastSuspensionAt) || null),
      };
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || b.endAt.localeCompare(a.endAt));
  const carnets: AdminCarnet[] = carSnap.docs.map((d) => {
    const c = d.data();
    const expiresAt = iso(c.expiresAt);
    return { uid: d.id, name: byUid.get(d.id)?.name ?? "", email: byUid.get(d.id)?.email ?? "", credits: Number(c.credits ?? 0), expiresAt, usable: carnetCredits({ credits: c.credits, expiresAt }, now) };
  }).sort((a, b) => b.usable - a.usable || b.expiresAt.localeCompare(a.expiresAt));
  const absences: AdminAbsence[] = absSnap.docs.map((d) => {
    const r = d.data();
    return { reservationId: d.id, uid: r.userId, name: byUid.get(r.userId)?.name || byUid.get(r.userId)?.email || "", title: String(r.sessionSnapshot?.title?.fr ?? ""), startAt: iso(r.sessionSnapshot?.startAt), pass: Number(r.pricing?.coverage?.passSeats ?? 0) > 0 };
  }).sort((a, b) => b.startAt.localeCompare(a.startAt)).slice(0, 100);
  const revenue = paySnap.docs.filter((d) => ["succeeded", "partially_refunded"].includes(d.data().status)).reduce((a, d) => a + (d.data().amount as number), 0);
  // Uniquement des données simples (pas d'objets Firestore) : la formule est transmise au formulaire du navigateur.
  const p = planSnap.data();
  const plan: MembershipPlan | null = p
    ? {
        id: planSnap.id,
        name: p.name,
        offers: Array.isArray(p.offers) && p.offers.every((o: { kind?: string }) => o.kind) ? (p.offers as MembershipOffer[]).map((o) => ({ id: o.id, kind: o.kind, days: o.days, ...(o.credits ? { credits: o.credits } : {}), price: { amount: o.price?.amount ?? 0, currency: "MAD" as const }, isActive: o.isActive === true, highlight: o.highlight === true })) : undefined,
        benefits: [],
        isActive: p.isActive === true,
      }
    : null;
  return { plan, members, carnets, absences, revenue, isDemo: false, users };
}
