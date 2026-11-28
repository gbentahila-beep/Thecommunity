import "server-only";
import type { CancellationPolicy, Category, City, Experience, Session, SessionVenue } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AdminGroup, AdminPayment, AdminReservation, AdminUser, AdminVenueRequest, Partner, PromoCode } from "./demo-admin";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : new Date(0).toISOString());
function plain<T>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => plain(v)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)])) as T;
  }
  return value as T;
}

export type Economics = { partnerId?: string; model: "own" | "commission"; costPerSeat?: number; commissionPercent?: number; onSiteCommissionPercent?: number };

/**
 * Chiffres d'une réservation payée, à partir du modèle économique de l'expérience
 * (en attendant le figeage comptable au paiement, phase 7) : brut, coût partenaire, marge.
 */
function estimateFinance(r: DocumentData, eco: Economics | undefined) {
  const paid = ["confirmed", "attended", "no_show"].includes(r.status);
  const gross = paid ? (r.pricing?.total ?? 0) : 0;
  const seats = r.seats ?? 1;
  if (!gross) return { gross: 0, cost: 0, margin: 0 };
  // Étape 21 : activité d'un organisateur — notre marge est la commission figée (+ frais de service).
  if (r.commission) {
    const margin = Math.min(gross, Number(r.commission.amount ?? 0) + Number(r.pricing?.fees ?? 0));
    return { gross, cost: gross - margin, margin };
  }
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
  const [sessionsSnap, expSnap, privSnap, resSnap, paySnap, usersSnap, partnersSnap, promosSnap, groupsSnap, waitSnap, citiesSnap, catSnap, requestsSnap] = await Promise.all([
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
    // docs/22 § 17.H : demandes aux lieux des dates récentes et à venir.
    db.collection("venueRequests").where("startAt", ">=", Timestamp.fromMillis(now.getTime() - 3 * 86_400_000)).get(),
  ]);

  const economics: Record<string, Economics> = {};
  const sessionVenues: Record<string, SessionVenue[]> = {};
  /** Lieu réel des expériences à lieu secret (docs/22) : rangé à part, remis dans la fiche pour l'équipe. */
  const hiddenVenues: Record<string, { name?: string; address?: string; geo?: { lat: number; lng: number } | null; district?: string; partnerName?: string; cuisine?: string }> = {};
  const finance: Record<string, { gross: number; cost: number; margin: number }> = {};
  for (const d of privSnap.docs) {
    const parent = d.ref.parent.parent;
    if (!parent) continue;
    if (parent.parent.id === "experiences" && d.id === "economics") {
      const e = d.data();
      economics[parent.id] = { partnerId: e.partnerId ?? undefined, model: e.model, costPerSeat: e.costPerSeat ?? undefined, commissionPercent: e.commissionPercent ?? undefined, onSiteCommissionPercent: e.onSiteCommissionPercent ?? undefined };
    }
    if (parent.parent.id === "experiences" && d.id === "venue") hiddenVenues[parent.id] = d.data();
    // docs/22, décision 15 : lieux renseignés pour une date (un ou plusieurs).
    if (parent.parent.id === "sessions" && d.id === "venues") sessionVenues[parent.id] = (d.data().venues ?? []) as SessionVenue[];
    if (parent.parent.id === "reservations" && d.id === "finance") {
      const f = d.data();
      finance[parent.id] = { gross: f.gross ?? 0, cost: f.cost ?? 0, margin: f.margin ?? 0 };
    }
  }

  const allSessions = sessionsSnap.docs.map((d) => plain<Session>({ id: d.id, ...d.data() }));
  const sessions = allSessions.filter((x) => new Date(x.startAt).getTime() >= now.getTime());
  const recentSessions = allSessions.filter((x) => new Date(x.startAt).getTime() < now.getTime()).reverse();
  const experiences = new Map(
    expSnap.docs.map((d) => {
      const e = plain<Experience>({ id: d.id, ...d.data() });
      const h = hiddenVenues[d.id];
      if (!h || e.venue?.revealPolicy !== "on_group_reveal") return [d.id, e];
      return [d.id, { ...e, district: h.district || e.district, cuisine: h.cuisine || e.cuisine || null, venue: { ...e.venue, name: h.name ?? "", address: h.address ?? "", geo: h.geo ?? null }, partnerSnapshot: h.partnerName ? { name: h.partnerName } : (e.partnerSnapshot ?? null) } as Experience];
    }),
  );
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
      onSite:
        r.partnerSnapshot && (r.partnerPaymentStatus === "due_on_site" || r.partnerPaymentStatus === "paid_on_site")
          ? { partnerName: String(r.partnerSnapshot.name ?? ""), amount: typeof r.onSiteAmount === "number" ? r.onSiteAmount : null, status: r.partnerPaymentStatus }
          : null,
      ...(r.preferences
        ? { preferences: { diet: String(r.preferences.diet ?? "none"), allergies: String(r.preferences.allergies ?? ""), languages: r.preferences.languages ?? [], shareWithVenue: r.preferences.shareWithVenue === true } }
        : {}),
      ...(r.questionnaire?.answers ? { answers: r.questionnaire.answers as Record<string, number> } : {}),
      ...(r.physicalTerms?.version ? { physicalTermsVersion: String(r.physicalTerms.version) } : {}),
      ...(r.cancellationPolicy?.rules?.length ? { cancellationPolicy: plain<CancellationPolicy>(r.cancellationPolicy) } : {}),
      ...(r.refundedAmount ? { refundedAmount: Number(r.refundedAmount) } : {}),
      ...(r.arrivedAt ? { arrivedAt: iso(r.arrivedAt) } : {}),
    };
  });
  const payments: AdminPayment[] = paySnap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id, reservationId: p.reservationId, userId: p.userId, type: p.type, provider: p.provider, amount: p.amount,
      purpose: p.purpose === "membership" ? "membership" : "reservation",
      ...(p.reference ? { reference: String(p.reference) } : {}),
      ...(p.transferDeadline ? { deadline: iso(p.transferDeadline) } : {}),
      ...(p.parentPaymentId ? { parentPaymentId: String(p.parentPaymentId), reason: String(p.reason ?? "") } : {}),
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
      ...(u.trustedHost === true ? { trustedHost: true } : {}),
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
  const venueRequests: AdminVenueRequest[] = requestsSnap.docs.map((d) => {
    const r = d.data();
    return {
      id: d.id, sessionId: r.sessionId, partnerId: r.partnerId, partnerName: r.partnerName ?? "", partnerWhatsapp: r.partnerWhatsapp ?? "", partnerEmail: r.partnerEmail ?? "",
      title: r.title ?? "", format: r.format ?? "", tier: r.tier ?? null, unit: r.unit ?? "table", startAt: iso(r.startAt), tables: Number(r.tables ?? 0), people: Number(r.people ?? 0),
      status: r.status, round: Number(r.round ?? 1), reference: r.reference ?? "", token: r.token ?? "", ...(r.fixed ? { fixed: true } : {}),
      ...(r.sentAt ? { sentAt: iso(r.sentAt) } : {}), ...(r.remindedAt ? { remindedAt: iso(r.remindedAt) } : {}), ...(r.respondedAt ? { respondedAt: iso(r.respondedAt) } : {}),
      ...(r.response?.by ? { responseBy: r.response.by } : {}), ...(r.manualWhatsappAt ? { manualWhatsappAt: iso(r.manualWhatsappAt) } : {}),
      ...(r.recap?.text ? { recapText: String(r.recap.text) } : {}), ...(r.recapSentAt ? { recapSentAt: iso(r.recapSentAt) } : {}),
    };
  });
  return { sessions, recentSessions, experiences, economics, sessionVenues, reservations, payments, users, partners, promos, groups, waitlists, cities, categories, venueRequests };
}

/** Demandes d'export / suppression (loi 09-08), les plus récentes d'abord. */
export async function fsDataRequests() {
  const snap = await adminDb().collection("dataRequests").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, userId: d.data().userId as string, type: d.data().type as string, createdAt: iso(d.data().createdAt), status: (d.data().status as string | undefined) ?? "pending" }));
}
