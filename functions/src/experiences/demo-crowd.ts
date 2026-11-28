import { ALL_INTERESTS, SECTORS, SOCIAL_GOALS, type QuestionDef } from "@thecommunity/shared";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";
import { applyPaymentEvent } from "../payments/apply-event";
import { reserveSeats } from "../reservations/create-reservation";

/**
 * SITE D'ESSAI UNIQUEMENT (contenu de départ avec --with-demo-experiences, jamais en production) : une « foule » de
 * comptes fictifs (profils complets, adresses en .test qui ne reçoivent jamais d'e-mail) qui réservent les dates des
 * prochains jours par le vrai circuit (réservation, paiement de test, facture), pour voir le site et le back-office
 * remplis : places, gammes, tables, listes d'inscrits, remplissage.
 */

const FEMALE = ["Salma", "Yasmine", "Imane", "Kenza", "Sara", "Ghita", "Nour", "Hiba", "Leïla", "Meriem", "Inès", "Zineb", "Aya", "Lina", "Rim", "Soukaina", "Camille", "Chloé", "Julie", "Léa", "Manon", "Sofia", "Amal", "Hajar", "Douae", "Nada", "Rania", "Asmae", "Wiam", "Fatima-Zahra"];
const MALE = ["Youssef", "Mehdi", "Omar", "Karim", "Amine", "Hamza", "Adam", "Ilyas", "Reda", "Anas", "Othmane", "Saad", "Yassine", "Nabil", "Zakaria", "Ayoub", "Ismail", "Hicham", "Thomas", "Lucas", "Hugo", "Antoine", "Julien", "Nicolas", "Rayan", "Badr", "Ali", "Driss", "Taha", "Marouane"];
const LAST = ["Alaoui", "Bennani", "Tazi", "El Idrissi", "Berrada", "Chraibi", "Fassi", "Benjelloun", "Lahlou", "Sefrioui", "Kettani", "Squalli", "Naciri", "Amrani", "Bouzid", "Ouazzani", "Haddad", "Sebti", "Martin", "Bernard", "Dubois", "Lefèvre", "Moreau", "Laurent"];
const DISTRICTS = ["Maarif", "Gauthier", "Racine", "Anfa", "Bourgogne", "CIL", "Palmier", "Oasis", "Ain Diab", "Centre-ville", "Californie", "Belvédère"];

/** Générateur pseudo-aléatoire reproductible (mêmes comptes d'un lancement à l'autre). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CrowdResult = { users: number; reservations: number; sessions: number; refused: Record<string, number> };

/** Crée (ou met à jour) `count` comptes fictifs complets. Identifiants stables : demo-crowd-001… */
export async function ensureDemoCrowd(count: number): Promise<{ uid: string; gender: "female" | "male" }[]> {
  // Déjà créés (réinitialisation de la démo) : on les reprend tels quels, sans réécrire 300 profils.
  const existing = (await db.collection("users").where("demoCrowd", "==", true).get()).docs;
  if (existing.length >= count) return existing.map((d) => ({ uid: d.id, gender: d.get("gender") === "female" ? ("female" as const) : ("male" as const) })).sort((a, b) => a.uid.localeCompare(b.uid)).slice(0, count);
  const r = rng(2026);
  const pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)]!;
  const some = <T>(a: readonly T[], min: number, max: number) => [...a].sort(() => r() - 0.5).slice(0, min + Math.floor(r() * (max - min + 1)));
  const auth = getAuth();
  const out: { uid: string; gender: "female" | "male" }[] = [];
  for (let i = 1; i <= count; i++) {
    const uid = `demo-crowd-${String(i).padStart(3, "0")}`;
    const gender = r() < 0.55 ? "female" : "male";
    const firstName = pick(gender === "female" ? FEMALE : MALE);
    const lastName = pick(LAST);
    const email = `participant${i}@demo.wenzy.test`;
    const year = 1982 + Math.floor(r() * 20);
    const birthDate = `${year}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-${String(1 + Math.floor(r() * 28)).padStart(2, "0")}`;
    const languages = ["fr", ...(r() < 0.8 ? ["darija"] : []), ...(r() < 0.5 ? ["en"] : []), ...(r() < 0.25 ? ["ar"] : []), ...(r() < 0.1 ? ["es"] : [])];
    try {
      await auth.getUser(uid);
    } catch {
      await auth.createUser({ uid, email, emailVerified: true, password: "Demo2026!", displayName: `${firstName} ${lastName}` }).catch((e) => logger.warn("Compte fictif", { uid, error: String(e) }));
    }
    await db.doc(`users/${uid}`).set({
      role: "user", status: "active", isDemo: true, demoCrowd: true, email,
      firstName, lastName, birthDate, gender, cityId: "casablanca", district: pick(DISTRICTS),
      languages, interests: some(ALL_INTERESTS, 3, 6), socialGoals: some(SOCIAL_GOALS, 1, 2), sector: pick(SECTORS.filter((x) => x !== "not_working")),
      groupVibe: pick(["calm", "curious", "playful", "any"]), conversationStyle: 1 + Math.floor(r() * 5), humor: pick(["dry", "playful", "offbeat", "everything"]),
      lifeValues: some(["family", "friends", "career", "health", "adventure", "learning", "creativity", "helping", "fun"], 1, 3),
      exerciseFrequency: pick(["most_days", "weekly", "sometimes", "rarely"]), venueBudget: pick(["cafe", "casual", "smart", "fine"]),
      diets: r() < 0.15 ? [pick(["vegetarian", "pescatarian", "no_alcohol", "gluten_free"])] : [], favoriteCategories: [], agePreference: "any",
      onboardingCompleted: true, whatsapp: false, createdAt: Timestamp.fromMillis(Date.now() - Math.floor(r() * 90) * 86_400_000), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    out.push({ uid, gender });
  }
  return out;
}

/**
 * Remplit les dates des `days` prochains jours : 60 à 100 % des places (un tiers complètes), chaque personne
 * pouvant aller à plusieurs rendez-vous. Passe par la vraie réservation et un paiement de test réussi.
 */
export async function fillWeekWithDemoCrowd(o: { people: number; days: number; now?: Date }): Promise<CrowdResult> {
  const now = o.now ?? new Date();
  const r = rng(Math.floor(now.getTime() / 86_400_000));
  const crowd = await ensureDemoCrowd(o.people);
  const result: CrowdResult = { users: crowd.length, reservations: 0, sessions: 0, refused: {} };
  const sessions = (await db.collection("sessions").where("startAt", ">", Timestamp.fromDate(now)).where("startAt", "<", Timestamp.fromMillis(now.getTime() + o.days * 86_400_000)).get()).docs
    .filter((d) => ["published", "full"].includes(String(d.get("status"))))
    .sort((a, b) => (a.get("startAt") as Timestamp).toMillis() - (b.get("startAt") as Timestamp).toMillis());
  const load = new Map(crowd.map((c) => [c.uid, 0]));
  const exps = new Map<string, FirebaseFirestore.DocumentData>();
  for (const s of sessions) {
    const e = exps.get(s.get("experienceId")) ?? (await db.doc(`experiences/${s.get("experienceId")}`).get()).data() ?? {};
    exps.set(s.get("experienceId"), e);
    if (e.status !== "published") continue;
    const capacity = Number(s.get("capacity") ?? 0);
    const target = Math.round(capacity * (r() < 0.33 ? 1 : 0.6 + r() * 0.35)) - Number(s.get("seatsConfirmed") ?? 0);
    if (target <= 0) continue;
    result.sessions++;
    const booked = new Set((await db.collection("reservations").where("sessionId", "==", s.id).get()).docs.map((d) => String(d.get("userId"))));
    // Les moins occupés d'abord (chacun va à plusieurs rendez-vous, sans tout réserver).
    const candidates = crowd.filter((c) => !booked.has(c.uid) && (e.audience !== "women" || c.gender === "female")).sort((a, b) => load.get(a.uid)! - load.get(b.uid)! || r() - 0.5);
    const questions = (Array.isArray(e.questionnaire) ? e.questionnaire : []) as QuestionDef[];
    let placed = 0;
    for (const c of candidates) {
      if (placed >= target) break;
      const answers = Object.fromEntries(questions.map((q) => [q.id, Math.floor(r() * q.options.length)]));
      try {
        const res = (await reserveSeats({ uid: c.uid, emailVerified: true }, {
          sessionId: s.id, seats: 1, physicalTermsAccepted: true, tierFallback: r() < 0.5,
          ...(questions.length ? { answers } : {}),
        })) as { reservationId: string; status: string };
        if (res.status === "pending_payment") await payForDemo(res.reservationId, c.uid);
        placed++;
        result.reservations++;
        load.set(c.uid, load.get(c.uid)! + 1);
      } catch (err) {
        const reason = String((err as { details?: { reason?: string } }).details?.reason ?? (err as Error).message ?? "error").slice(0, 40);
        result.refused[reason] = (result.refused[reason] ?? 0) + 1;
        if (["full", "closed", "not_yet_open", "not_open"].includes(reason)) break;
      }
    }
  }
  logger.info("Foule de démonstration (site d'essai)", result);
  return result;
}

/** Paiement de test réussi (même traitement qu'un vrai paiement : confirmation, facture, e-mail rangé). */
async function payForDemo(reservationId: string, uid: string) {
  const r = (await db.doc(`reservations/${reservationId}`).get()).data();
  if (!r || r.status !== "pending_payment") return;
  const payRef = db.collection("payments").doc();
  await payRef.set({
    reservationId, userId: uid, type: "payment", provider: "sandbox", mode: "test", providerRef: null,
    amount: r.pricing.total, currency: r.pricing.currency, status: "initiated", processedEventIds: [],
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`reservations/${reservationId}`).update({ paymentId: payRef.id });
  await applyPaymentEvent({ id: `${payRef.id}_succeeded`, provider: "sandbox", paymentId: payRef.id, status: "succeeded", amount: r.pricing.total, currency: r.pricing.currency });
}
