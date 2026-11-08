import "server-only";
import type { Category, City, Experience, Session } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AdminGroup, AdminPayment, AdminReservation, AdminUser, Partner, PromoCode } from "./demo-admin";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : new Date(0).toISOString());
function plain<T>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => plain(v)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)])) as T;
  }
  return value as T;
}

export type Economics = { partnerId?: string; model: "own" | "commission"; costPerSeat?: number; commissionPercent?: number };

/**
 * Chiffres d'une réservation payée, à partir du modèle économique de l'expérience
 * (en attendant le figeage comptable au paiement, phase 7) : brut, coût partenaire, marge.
 */
function estimateFinance(r: DocumentData, eco: Economics | undefined) {
  const paid = ["confirmed", "attended", "no_show"].includes(r.status);
  const gross = paid ? (r.pricing?.total ?? 0) : 0;
  const seats = r.seats ?? 1;
  if (!gross) return { gross: 0, cost: 0, margin: 0 };
  if (eco?.model === "commission") {
    const margin = Math.round((gross * (eco.commissionPercent ?? 0)) / 100);
    return { gross, cost: gross - margin, margin };
  }
  const cost = Math.min(gross, (eco?.costPerSeat ?? 0) * seats);
  return { gross, cost, margin: gross - cost };
}

/** Toutes les données du back-office, lues par le serveur (après vérification du rôle admin). */
export async function fsAdminData(now: Date) {
  const db = adminDb();
  const [sessionsSnap, expSnap, privSnap, resSnap, paySnap, usersSnap, partnersSnap, promosSnap, groupsSnap, waitSnap, citiesSnap, catSnap] = await Promise.all([
    // Dates à venir + celles des 3 derniers jours (pointage le jour J, annulations de dernière minute).
    db.collection("sessions").where("startAt", ">=", Timestamp.fromMillis(now.getTime() - 3 * 86_400_000)).orderBy("startAt").limit(500).get(),
    db.collection("experiences").get(),
    db.collectionGroup("private").get(),
    db.collection("reservations").orderBy("createdAt", "desc").limit(2000).get(),
    db.collection("payments").orderBy("createdAt", "desc").limit(2000).get(),
    db.collection("users").limit(5000).get(),
    db.collection("partners").get(),
    db.collection("promoCodes").get(),
    db.collection("groups").get(),
    db.collectionGroup("waitlist").get(),
    db.collection("cities").orderBy("order").get(),
    db.collection("categories").orderBy("order").get(),
  ]);

  const economics: Record<string, Economics> = {};
  const finance: Record<string, { gross: number; cost: number; margin: number }> = {};
  for (const d of privSnap.docs) {
    const parent = d.ref.parent.parent;
    if (!parent) continue;
    if (parent.parent.id === "experiences" && d.id === "economics") {
      const e = d.data();
      economics[parent.id] = { partnerId: e.partnerId ?? undefined, model: e.model, costPerSeat: e.costPerSeat ?? undefined, commissionPercent: e.commissionPercent ?? undefined };
    }
    if (parent.parent.id === "reservations" && d.id === "finance") {
      const f = d.data();
      finance[parent.id] = { gross: f.gross ?? 0, cost: f.cost ?? 0, margin: f.margin ?? 0 };
    }
  }

  const allSessions = sessionsSnap.docs.map((d) => plain<Session>({ id: d.id, ...d.data() }));
  const sessions = allSessions.filter((x) => new Date(x.startAt).getTime() >= now.getTime());
  const recentSessions = allSessions.filter((x) => new Date(x.startAt).getTime() < now.getTime()).reverse();
  const experiences = new Map(expSnap.docs.map((d) => [d.id, plain<Experience>({ id: d.id, ...d.data() })]));
  const reservations: AdminReservation[] = resSnap.docs.map((d) => {
    const r = d.data();
    return {
      id: d.id,
      userId: r.userId,
      sessionId: r.sessionId,
      experienceId: r.experienceId,
      status: r.status,
      seats: r.seats ?? 1,
      total: r.pricing?.total ?? 0,
      promoCode: r.pricing?.promoCode ?? r.promoCode ?? undefined,
      createdAt: iso(r.createdAt),
      sessionStartAt: iso(r.sessionSnapshot?.startAt),
      finance: finance[d.id] ?? estimateFinance(r, economics[r.experienceId]),
      ...(r.preferences
        ? { preferences: { diet: String(r.preferences.diet ?? "none"), allergies: String(r.preferences.allergies ?? ""), languages: r.preferences.languages ?? [], shareWithVenue: r.preferences.shareWithVenue === true } }
        : {}),
    };
  });
  const payments: AdminPayment[] = paySnap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id, reservationId: p.reservationId, userId: p.userId, type: p.type, provider: p.provider, amount: p.amount,
      status: p.status === "partially_refunded" ? "refunded" : p.status, createdAt: iso(p.createdAt),
      ...(p.invoiceId ? { invoiceId: p.invoiceId, invoiceNumber: p.invoiceNumber ?? "" } : {}),
    };
  });
  const users: AdminUser[] = usersSnap.docs.map((d) => {
    const u: DocumentData = d.data();
    return {
      uid: d.id,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      birthDate: u.birthDate ?? "2000-01-01",
      gender: u.gender ?? "undisclosed",
      languages: u.languages ?? [],
      interests: u.interests ?? [],
      role: u.role ?? "user",
      status: u.status === "suspended" ? "suspended" : "active",
      createdAt: iso(u.createdAt),
    };
  });
  const partners = partnersSnap.docs.map((d) => plain<Partner>({ id: d.id, ...d.data() }));
  const promos: PromoCode[] = promosSnap.docs.map((d) => {
    const p = d.data();
    return { code: d.id, type: p.type, value: p.value, validTo: iso(p.validTo).slice(0, 10), maxRedemptions: p.maxRedemptions ?? 0, redemptionsCount: p.redemptionsCount ?? 0, firstBookingOnly: Boolean(p.firstBookingOnly), isActive: Boolean(p.isActive),
      ...(p.validFrom ? { validFrom: iso(p.validFrom).slice(0, 10) } : {}), description: p.description ?? "" };
  });
  const groups: AdminGroup[] = groupsSnap.docs
    .map((d) => ({ id: d.id, sessionId: d.data().sessionId, label: d.data().label, memberIds: d.data().memberIds ?? [], status: d.data().status }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  const waitlists: Record<string, string[]> = {};
  for (const w of [...waitSnap.docs].sort((a, b) => iso(a.data().createdAt).localeCompare(iso(b.data().createdAt)))) {
    const sessionId = w.ref.parent.parent?.id;
    if (sessionId && w.data().status === "waiting") (waitlists[sessionId] ??= []).push(w.id);
  }
  const cities = citiesSnap.docs.map((d) => plain<City>({ id: d.id, ...d.data() }));
  const categories = catSnap.docs.map((d) => plain<Category>({ id: d.id, ...d.data() }));
  return { sessions, recentSessions, experiences, economics, reservations, payments, users, partners, promos, groups, waitlists, cities, categories };
}

/** Demandes d'export / suppression (loi 09-08), les plus récentes d'abord. */
export async function fsDataRequests() {
  const snap = await adminDb().collection("dataRequests").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, userId: d.data().userId as string, type: d.data().type as string, createdAt: iso(d.data().createdAt), status: (d.data().status as string | undefined) ?? "pending" }));
}
