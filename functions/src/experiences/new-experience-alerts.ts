import { createHash, randomBytes } from "node:crypto";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument } from "../lib/guards";
import { SITE_URL } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { alertConfirmMail, newExperiencesMail } from "../mail/templates";
import { clientKey, consumeRateLimit } from "../public/forms";

/**
 * Alertes « nouvelles tables et activités » (accueil, sous « Voir toutes les expériences »).
 *
 * - Qui : les membres qui l'ont activé (users/{uid}.notificationPrefs.newExperiences) et les visiteurs sans compte
 *   inscrits avec leur e-mail, après double confirmation (alertSubscribers, lu par le serveur seulement).
 * - Quand : à la PREMIÈRE publication d'une expérience, elle est mise en file (newExperienceAlerts/{id}, une seule
 *   fois par expérience). Toutes les heures, un seul e-mail regroupe les expériences publiées depuis le dernier envoi.
 * - Arrêt : lien dans chaque e-mail (visiteur : jeton personnel ; membre : page Préférences).
 */

const OPTIONS = { region: REGION, enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" };
const DAY = 86_400_000;
type L = "fr" | "en" | "ar";
const lang = (l: unknown): L => (l === "en" || l === "ar" ? l : "fr");
const prefix = (l: L) => (l === "fr" ? "" : `/${l}`);
const titleIn = (t: DocumentData | undefined, l: L): string => String(t?.[l] || t?.fr || "");
export const subscriberId = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 40);

/** File d'attente : une expérience qui passe en « publiée » pour la première fois. */
export const queueNewExperienceAlert = onDocumentWritten({ document: "experiences/{experienceId}", region: REGION }, async (event) => {
  await queueIfFirstPublication(event.params.experienceId, event.data?.before.data(), event.data?.after.data());
});

/** Met en file une expérience qui vient de passer en « publiée », une seule fois dans sa vie. Renvoie true si ajoutée. */
export async function queueIfFirstPublication(experienceId: string, before: DocumentData | undefined, after: DocumentData | undefined): Promise<boolean> {
  if (!after || after.status !== "published" || before?.status === "published") return false;
  try {
    // create() échoue si l'expérience a déjà été annoncée (republication après un retrait : pas de nouvel e-mail).
    await db.doc(`newExperienceAlerts/${experienceId}`).create({ experienceId, queuedAt: FieldValue.serverTimestamp(), sentAt: null });
    return true;
  } catch {
    return false; // déjà annoncée
  }
}

type Recipient = { email: string; locale: L; stopHref: string | null };

async function recipients(): Promise<Recipient[]> {
  const out = new Map<string, Recipient>();
  const members = await db.collection("users").where("notificationPrefs.newExperiences", "==", true).get();
  for (const d of members.docs) {
    const u = d.data();
    if (u.status === "suspended" || typeof u.email !== "string" || !u.email) continue;
    out.set(u.email.toLowerCase(), { email: u.email, locale: lang(u.locale), stopHref: null });
  }
  const subs = await db.collection("alertSubscribers").where("status", "==", "confirmed").get();
  for (const d of subs.docs) {
    const s = d.data();
    const l = lang(s.locale);
    const key = String(s.email).toLowerCase();
    if (!out.has(key)) out.set(key, { email: s.email, locale: l, stopHref: `${SITE_URL}${prefix(l)}/alertes?arreter=${encodeURIComponent(s.token)}` });
  }
  return [...out.values()];
}

/** Envoie les alertes en attente (exportée pour les tests). Renvoie le nombre d'expériences et d'e-mails. */
export async function sendPendingNewExperienceAlerts(now = Date.now()): Promise<{ experiences: number; emails: number }> {
  // Ménage : une inscription jamais confirmée est effacée au bout de 7 jours.
  const stale = await db.collection("alertSubscribers").where("status", "==", "pending").where("createdAt", "<", Timestamp.fromMillis(now - 7 * DAY)).limit(200).get();
  if (!stale.empty) {
    const batch = db.batch();
    stale.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const queued = await db.collection("newExperienceAlerts").where("sentAt", "==", null).limit(30).get();
  if (queued.empty) return { experiences: 0, emails: 0 };
  const items: { title: DocumentData; slug: string }[] = [];
  for (const q of queued.docs) {
    const e = (await db.doc(`experiences/${q.id}`).get()).data();
    if (e && e.status === "published" && typeof e.slug === "string") items.push({ title: e.title, slug: e.slug });
  }
  // Marquées avant l'envoi : une relance de la tâche ne renvoie jamais deux fois le même e-mail.
  const mark = db.batch();
  queued.docs.forEach((q) => mark.update(q.ref, { sentAt: FieldValue.serverTimestamp(), announced: items.length > 0 }));
  await mark.commit();
  if (items.length === 0) return { experiences: 0, emails: 0 };

  let emails = 0;
  for (const r of await recipients()) {
    const mail = newExperiencesMail({ locale: r.locale, items: items.map((i) => ({ title: titleIn(i.title, r.locale), slug: i.slug })), stopHref: r.stopHref });
    await sendMail({ to: r.email, locale: r.locale, ...mail, kind: "new_experiences" });
    emails++;
  }
  logger.info("Alertes nouvelles expériences envoyées", { experiences: items.length, emails });
  return { experiences: items.length, emails };
}

export const sendNewExperienceAlerts = onSchedule({ schedule: "every 60 minutes", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  await sendPendingNewExperienceAlerts();
});

const email = z.string().trim().max(120).regex(/^[^@ ]+@[^@ ]+[.][^@ ]+$/);
const token = z.string().trim().regex(/^[a-f0-9]{48}$/);

/**
 * Visiteur sans compte : inscription avec son e-mail. La réponse est toujours la même (on ne révèle jamais si
 * une adresse est déjà inscrite) ; l'e-mail de confirmation n'est renvoyé qu'une fois toutes les 10 minutes.
 */
export const subscribeNewExperienceAlerts = onCall(OPTIONS, async (req) => {
  const parsed = z.object({ email, locale: z.enum(["fr", "en", "ar"]), website: z.string().max(200).optional() }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { website, locale } = parsed.data;
  if (website) return { ok: true };
  await consumeRateLimit(clientKey(req, "alerts"));
  await subscribeVisitor(parsed.data.email, locale);
  return { ok: true };
});

/** Inscription « en attente » + e-mail de confirmation (sauf adresse déjà confirmée ou envoi de moins de 10 min). */
export async function subscribeVisitor(rawEmail: string, locale: L): Promise<"sent" | "already" | "recent"> {
  const address = rawEmail.trim().toLowerCase();
  const ref = db.doc(`alertSubscribers/${subscriberId(address)}`);
  const current = (await ref.get()).data();
  if (current?.status === "confirmed") return "already";
  const recent = (current?.createdAt as Timestamp | undefined)?.toMillis() ?? 0;
  if (current && Date.now() - recent < 10 * 60_000) return "recent";
  const fresh = randomBytes(24).toString("hex");
  await ref.set({ email: address, locale, status: "pending", token: fresh, createdAt: FieldValue.serverTimestamp(), consentAt: FieldValue.serverTimestamp() });
  await sendMail({ to: address, locale, ...alertConfirmMail({ locale, token: fresh }), kind: "alerts_confirm" });
  return "sent";
}

function tokenOf(value: unknown): string {
  const parsed = z.object({ token }).safeParse(value);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  return parsed.data.token;
}
async function byToken(value: string) {
  const snap = await db.collection("alertSubscribers").where("token", "==", value).limit(1).get();
  return snap.docs[0] ?? null;
}

/** Confirme une inscription (lien de l'e-mail). false si le jeton est inconnu. */
export async function confirmVisitor(value: string): Promise<boolean> {
  const doc = await byToken(value);
  if (!doc) return false;
  if (doc.get("status") !== "confirmed") await doc.ref.update({ status: "confirmed", confirmedAt: FieldValue.serverTimestamp() });
  return true;
}

/** Arrête les alertes (lien de chaque e-mail) : l'adresse est effacée. */
export async function stopVisitor(value: string): Promise<void> {
  const doc = await byToken(value);
  if (doc) await doc.ref.delete();
}

export const confirmNewExperienceAlerts = onCall(OPTIONS, async (req) => {
  const ok = await confirmVisitor(tokenOf(req.data));
  return ok ? { ok: true } : { ok: false, reason: "unknown" };
});

export const stopNewExperienceAlerts = onCall(OPTIONS, async (req) => {
  await stopVisitor(tokenOf(req.data));
  return { ok: true };
});
