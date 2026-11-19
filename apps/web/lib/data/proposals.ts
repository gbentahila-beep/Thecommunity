import "server-only";
import type { OutingProposal } from "@thecommunity/shared";
import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * 18d — Sorties proposées par les membres de confiance : liste de l'équipe, proposition à transformer en
 * expérience (formulaire pré-rempli) et propositions du membre connecté.
 */
const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "");

function toProposal(d: DocumentSnapshot): OutingProposal {
  const p = d.data() ?? {};
  return {
    id: d.id,
    userId: String(p.userId ?? ""),
    firstName: String(p.firstName ?? ""),
    cityId: String(p.cityId ?? "casablanca"),
    title: String(p.title ?? ""),
    categoryId: p.categoryId ?? "discover",
    description: String(p.description ?? ""),
    district: String(p.district ?? ""),
    venueIdea: String(p.venueIdea ?? ""),
    datesIdea: String(p.datesIdea ?? ""),
    capacity: Number(p.capacity ?? 0),
    priceIdeaDh: typeof p.priceIdeaDh === "number" ? p.priceIdeaDh : null,
    level: p.level ?? null,
    willHost: p.willHost !== false,
    notes: String(p.notes ?? ""),
    status: p.status ?? "pending",
    ...(p.experienceId ? { experienceId: String(p.experienceId) } : {}),
    ...(p.decisionMessage ? { decisionMessage: String(p.decisionMessage) } : {}),
    createdAt: iso(p.createdAt),
    ...(p.decidedAt ? { decidedAt: iso(p.decidedAt) } : {}),
  };
}

/** Propositions d'exemple (démonstration). */
export const DEMO_PROPOSALS: OutingProposal[] = [
  {
    id: "demo-prop-padel", userId: "demo-salma", firstName: "Salma", cityId: "casablanca", title: "Padel du samedi matin", categoryId: "move",
    description: "Deux terrains réservés dans un club d'Anfa, tous niveaux : on forme les équipes par niveau, puis un café ensemble au club.",
    district: "Anfa", venueIdea: "Club de padel d'Anfa", datesIdea: "Samedis matin de décembre, 10 h", capacity: 8, priceIdeaDh: 150, level: "all", willHost: true,
    notes: "Je joue depuis deux ans, je peux accueillir le groupe.", status: "pending", createdAt: "2026-11-18T10:00:00.000Z",
  },
  {
    id: "demo-prop-rando", userId: "demo-karim", firstName: "Karim", cityId: "casablanca", title: "Randonnée à Bouskoura", categoryId: "discover",
    description: "Une boucle de 8 km en forêt, rythme tranquille, pique-nique partagé à l'arrivée.", district: "Bouskoura", venueIdea: "Forêt de Bouskoura",
    datesIdea: "Un dimanche matin", capacity: 12, priceIdeaDh: null, level: "beginner", willHost: true, notes: "", status: "pending", createdAt: "2026-11-17T08:30:00.000Z",
  },
];

export async function getAdminProposals(): Promise<{ pending: OutingProposal[]; decided: OutingProposal[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { pending: DEMO_PROPOSALS, decided: [], isDemo: true };
  await requireAdmin();
  const db = adminDb();
  const [pending, decided] = await Promise.all([
    db.collection("outingProposals").where("status", "==", "pending").orderBy("createdAt", "desc").limit(100).get(),
    db.collection("outingProposals").where("status", "in", ["accepted", "declined"]).orderBy("createdAt", "desc").limit(50).get(),
  ]);
  return { pending: pending.docs.map(toProposal), decided: decided.docs.map(toProposal), isDemo: false };
}

/** Une proposition encore en attente (pré-remplissage de « Nouvelle expérience »), sinon null. */
export async function getPendingProposal(id: string): Promise<OutingProposal | null> {
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) return null;
  if (!FIREBASE_ENABLED) return DEMO_PROPOSALS.find((p) => p.id === id) ?? null;
  await requireAdmin();
  const snap = await adminDb().doc(`outingProposals/${id}`).get();
  return snap.exists && snap.data()?.status === "pending" ? toProposal(snap) : null;
}

/** Propositions du membre connecté (les plus récentes d'abord). */
export async function getMyProposals(uid: string): Promise<OutingProposal[]> {
  if (!FIREBASE_ENABLED) return DEMO_PROPOSALS.filter((p) => p.userId === uid);
  const snap = await adminDb().collection("outingProposals").where("userId", "==", uid).orderBy("createdAt", "desc").limit(30).get();
  return snap.docs.map(toProposal);
}
