/**
 * ⚠️ DONNÉES DE DÉMONSTRATION DU BACK-OFFICE — membres, réservations, paiements,
 * partenaires et codes promo fictifs, générés de façon déterministe.
 * Remplacées en phase 3 par Firestore (lecture réservée aux admins par les règles de sécurité).
 */
import {
  ageBand,
  ageOn,
  marginPerSeat,
  type Experience,
  type Gender,
  type Interest,
  type ReservationStatus,
  type Session,
  type SpokenLanguage,
} from "@thecommunity/shared";
import { buildDemoSessions, DEMO_EXPERIENCES } from "./demo";

/** Générateur pseudo-aléatoire reproductible (mêmes données à chaque affichage). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function shuffle<T>(items: T[], seed: number): T[] {
  const r = rng(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type AdminUser = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: Gender;
  languages: SpokenLanguage[];
  interests: Interest[];
  role: "user" | "organizer" | "admin" | "superadmin";
  status: "active" | "suspended";
  createdAt: string;
};

const FEMALE = ["Salma", "Lina", "Sofia", "Inès", "Nadia", "Yasmine", "Kenza", "Rim", "Ghita", "Hiba", "Meryem", "Sara", "Aya", "Imane", "Chaïmae", "Leila", "Zineb", "Nora", "Dounia", "Sanaa"];
const MALE = ["Karim", "Omar", "Yassine", "Mehdi", "Youssef", "Amine", "Hamza", "Reda", "Anas", "Othmane", "Ilyas", "Adam", "Nabil", "Soufiane", "Ayoub", "Badr", "Ismail", "Hicham", "Tarik", "Walid"];
const LAST = ["Alaoui", "Bennani", "Tazi", "Berrada", "El Idrissi", "Chraibi", "Fassi", "Benjelloun", "Lahlou", "Sqalli", "Kettani", "Amrani", "Ouazzani", "Zniber", "Belkadi", "Naciri"];
const INTERESTS: Interest[] = ["gastronomy", "sport", "travel", "culture", "art", "music", "wellness", "games", "nightlife", "discovery"];
const LANG_SETS: SpokenLanguage[][] = [["fr", "darija"], ["fr", "darija", "en"], ["fr", "ar", "darija"], ["fr", "en"], ["darija", "ar"], ["fr", "darija", "es"]];

export const DEMO_USERS: AdminUser[] = Array.from({ length: 64 }, (_, i) => {
  const r = rng(1000 + i);
  const female = i % 2 === 0;
  const firstName = (female ? FEMALE : MALE)[Math.floor(i / 2) % 20]!;
  const lastName = LAST[Math.floor(r() * LAST.length)]!;
  const year = 1984 + Math.floor(r() * 18);
  const month = 1 + Math.floor(r() * 12);
  const day = 1 + Math.floor(r() * 28);
  const interests = shuffle(INTERESTS, 50 + i).slice(0, 3 + Math.floor(r() * 3));
  return {
    uid: `u-${String(i + 1).padStart(3, "0")}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")}.${i + 1}@example.com`,
    phone: `+212 6 ${String(10 + Math.floor(r() * 89))} ${String(10 + Math.floor(r() * 89))} ${String(10 + Math.floor(r() * 89))} ${String(10 + Math.floor(r() * 89))}`,
    birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    gender: female ? "female" : "male",
    languages: LANG_SETS[Math.floor(r() * LANG_SETS.length)]!,
    interests,
    role: i === 0 ? "superadmin" : i === 1 ? "admin" : "user",
    status: i === 37 ? "suspended" : "active",
    createdAt: new Date(Date.UTC(2026, 8, 1) + Math.floor(r() * 60) * 86_400_000).toISOString(),
  };
});

export type Partner = {
  id: string;
  name: string;
  type: "restaurant" | "studio" | "venue" | "workshop" | "organizer" | "other";
  district: string;
  contactName: string;
  contactEmail: string;
  defaultCommissionPercent: number;
  status: "active" | "prospect" | "archived";
  /** Champs ajoutés en 5d (absents des anciens partenaires). */
  cityId?: string;
  address?: string;
  contactPhone?: string;
  link?: string;
  model?: "purchase" | "commission";
  notes?: string;
  applicationId?: string;
};

export const DEMO_PARTNERS: Partner[] = [
  { id: "p-resto-gauthier", name: "Restaurant partenaire Gauthier", type: "restaurant", district: "Gauthier", contactName: "M. Kabbaj", contactEmail: "resto@example.com", defaultCommissionPercent: 0, status: "active" },
  { id: "p-studio-anfa", name: "Studio partenaire Anfa", type: "studio", district: "Anfa", contactName: "Mme Alami", contactEmail: "studio@example.com", defaultCommissionPercent: 20, status: "active" },
  { id: "p-escape-maarif", name: "Escape room partenaire", type: "venue", district: "Maarif", contactName: "M. Senhaji", contactEmail: "escape@example.com", defaultCommissionPercent: 15, status: "active" },
  { id: "p-atelier-cil", name: "Atelier céramique partenaire", type: "workshop", district: "CIL", contactName: "Mme Tahiri", contactEmail: "atelier@example.com", defaultCommissionPercent: 18, status: "active" },
  { id: "p-rooftop", name: "Rooftop partenaire", type: "venue", district: "Centre-ville", contactName: "M. Lazrak", contactEmail: "rooftop@example.com", defaultCommissionPercent: 0, status: "active" },
  { id: "p-maison-habous", name: "Maison d'hôtes Habous", type: "workshop", district: "Habous", contactName: "Mme Berrada", contactEmail: "habous@example.com", defaultCommissionPercent: 20, status: "prospect" },
];

/** Modèle économique par expérience (admin uniquement : experiences/{id}/private/economics). */
export const DEMO_ECONOMICS: Record<string, { partnerId?: string; model: "own" | "commission"; costPerSeat?: number; commissionPercent?: number }> = {
  "exp-diner-inconnus": { partnerId: "p-resto-gauthier", model: "own", costPerSeat: 9500 },
  "exp-brunch-inconnus": { partnerId: "p-resto-gauthier", model: "own", costPerSeat: 1500 },
  "exp-pilates-brunch": { partnerId: "p-studio-anfa", model: "commission", commissionPercent: 20 },
  "exp-yoga-sunrise": { model: "own", costPerSeat: 4000 },
  "exp-escape-game": { partnerId: "p-escape-maarif", model: "commission", commissionPercent: 15 },
  "exp-quiz": { model: "own", costPerSeat: 3500 },
  "exp-ceramique": { partnerId: "p-atelier-cil", model: "commission", commissionPercent: 18 },
  "exp-rooftop": { partnerId: "p-rooftop", model: "own", costPerSeat: 6000 },
  "exp-cuisine": { partnerId: "p-maison-habous", model: "commission", commissionPercent: 20 },
};

export type AdminReservation = {
  id: string;
  userId: string;
  sessionId: string;
  experienceId: string;
  status: ReservationStatus;
  seats: number;
  total: number;
  promoCode?: string;
  createdAt: string;
  /** Date de la session (copie gardée dans la réservation : reste lisible une fois la session passée). */
  sessionStartAt: string;
  finance: { gross: number; cost: number; margin: number };
  /** Régime, allergies, langues de table (5g). */
  preferences?: { diet: string; allergies: string; languages: string[]; shareWithVenue: boolean };
};

export type AdminPayment = {
  id: string;
  reservationId: string;
  userId: string;
  type: "payment" | "refund";
  provider: "sandbox";
  amount: number;
  status: "succeeded" | "initiated" | "failed" | "refunded";
  createdAt: string;
  /** Document émis (5c) : facture, avoir ou reçu. */
  invoiceId?: string;
  invoiceNumber?: string;
};

export type AdminGroup = { id: string; sessionId: string; label: string; memberIds: string[]; status?: "proposed" | "validated" | "revealed" };

export type PromoCode = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  validTo: string;
  maxRedemptions: number;
  redemptionsCount: number;
  firstBookingOnly: boolean;
  isActive: boolean;
  validFrom?: string;
  description?: string;
};

export const DEMO_PROMOS: PromoCode[] = [
  { code: "BIENVENUE20", type: "percent", value: 20, validTo: "2026-12-31", maxRedemptions: 200, redemptionsCount: 37, firstBookingOnly: true, isActive: true },
  { code: "AMIS50", type: "fixed", value: 5000, validTo: "2026-11-30", maxRedemptions: 50, redemptionsCount: 12, firstBookingOnly: false, isActive: true },
  { code: "RAMADAN", type: "percent", value: 15, validTo: "2026-03-31", maxRedemptions: 100, redemptionsCount: 100, firstBookingOnly: false, isActive: false },
];

function financeFor(exp: Experience, total: number, seats: number) {
  const eco = DEMO_ECONOMICS[exp.id] ?? { model: "own" as const, costPerSeat: 0 };
  const unit = seats ? Math.round(total / seats) : 0;
  const marginUnit = marginPerSeat(unit, eco.model, eco.costPerSeat, eco.commissionPercent);
  return { gross: total, cost: total - marginUnit * seats, margin: marginUnit * seats };
}

export function buildAdminData(now: Date = new Date()) {
  const sessions = buildDemoSessions(now);
  const byExp = new Map(DEMO_EXPERIENCES.map((e) => [e.id, e]));
  const reservations: AdminReservation[] = [];
  const payments: AdminPayment[] = [];
  const waitlists: Record<string, string[]> = {};
  let n = 0;

  const add = (s: Session, exp: Experience, userId: string, status: ReservationStatus, seats = 1, promoCode?: string) => {
    n += 1;
    const unit = s.price.amount;
    const discount = promoCode === "BIENVENUE20" ? Math.round(unit * 0.2) : 0;
    const total = (unit - discount) * seats;
    const created = new Date(now.getTime() - ((n * 7) % 9 + 1) * 86_400_000 - (n % 24) * 3_600_000).toISOString();
    const id = `res-${String(n).padStart(4, "0")}`;
    reservations.push({ id, userId, sessionId: s.id, experienceId: exp.id, status, seats, total, promoCode, createdAt: created, sessionStartAt: s.startAt, finance: financeFor(exp, status === "confirmed" ? total : 0, seats) });
    if (status === "confirmed" || status === "refunded") {
      payments.push({ id: `pay-${id}`, reservationId: id, userId, type: "payment", provider: "sandbox", amount: total, status: status === "refunded" ? "refunded" : "succeeded", createdAt: created });
    }
    if (status === "refunded") {
      payments.push({ id: `ref-${id}`, reservationId: id, userId, type: "refund", provider: "sandbox", amount: total, status: "succeeded", createdAt: new Date(new Date(created).getTime() + 2 * 86_400_000).toISOString() });
    }
    if (status === "pending_payment") {
      payments.push({ id: `pay-${id}`, reservationId: id, userId, type: "payment", provider: "sandbox", amount: total, status: "initiated", createdAt: created });
    }
  };

  for (const s of sessions) {
    const exp = byExp.get(s.experienceId);
    if (!exp) continue;
    const pool = shuffle(DEMO_USERS.filter((u) => u.status === "active" && u.role === "user"), hash(s.id));
    let i = 0;
    let seatsLeft = s.seatsConfirmed;
    while (seatsLeft > 0 && i < pool.length) {
      const seats = exp.bookingMode === "open" && seatsLeft >= 2 && i % 3 === 0 ? 2 : 1;
      add(s, exp, pool[i]!.uid, "confirmed", seats, i % 7 === 0 ? "BIENVENUE20" : undefined);
      seatsLeft -= seats;
      i += 1;
    }
    if (hash(s.id) % 3 === 0 && i < pool.length) add(s, exp, pool[i++]!.uid, "refunded");
    if (hash(s.id) % 4 === 1 && i < pool.length) add(s, exp, pool[i++]!.uid, "pending_payment");
    if (s.waitlistCount > 0) waitlists[s.id] = pool.slice(i, i + s.waitlistCount).map((u) => u.uid);
  }

  // Répartition provisoire des groupes (l'algorithme de matching arrive en phase 6) :
  // tri par date de naissance puis distribution en serpentin pour mélanger les âges.
  const groups: AdminGroup[] = [];
  for (const s of sessions) {
    const exp = byExp.get(s.experienceId);
    if (!exp || (exp.bookingMode !== "social_dinner" && exp.bookingMode !== "group") || !exp.groupConfig) continue;
    const members = reservations
      .filter((r) => r.sessionId === s.id && r.status === "confirmed")
      .map((r) => DEMO_USERS.find((u) => u.uid === r.userId)!)
      .sort((a, b) => a.birthDate.localeCompare(b.birthDate));
    if (members.length < exp.groupConfig.minSize) continue;
    const k = Math.max(1, Math.round(members.length / exp.groupConfig.targetSize));
    const buckets: string[][] = Array.from({ length: k }, () => []);
    members.forEach((m, idx) => {
      const round = Math.floor(idx / k);
      const pos = idx % k;
      buckets[round % 2 === 0 ? pos : k - 1 - pos]!.push(m.uid);
    });
    const prefix = exp.bookingMode === "social_dinner" ? "Table" : "Équipe";
    buckets.forEach((memberIds, j) => groups.push({ id: `${s.id}-g${j + 1}`, sessionId: s.id, label: `${prefix} ${j + 1}`, memberIds }));
  }

  return { sessions, reservations, payments, waitlists, groups, users: DEMO_USERS, partners: DEMO_PARTNERS, promos: DEMO_PROMOS };
}

export function memberSummary(u: AdminUser) {
  return { uid: u.uid, firstName: `${u.firstName} ${u.lastName.charAt(0)}.`, ageBand: ageBand(ageOn(u.birthDate)), gender: u.gender, languages: u.languages, interests: u.interests };
}
