import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument } from "../lib/guards";

/**
 * Étape D (sécurité) — formulaires publics passés par le serveur au lieu d'écrire directement en base :
 * - même format qu'avant (validé ici, et les règles Firestore refusent désormais toute écriture directe) ;
 * - limite d'envois par appareil (adresse IP hachée, jamais conservée en clair) : 5 par heure, 20 par jour ;
 * - piège à robots : un champ invisible « website » rempli = envoi ignoré sans rien dire.
 */
const LIMITS = { perHour: 5, perDay: 20 };
/** App Check exigé sur ces formulaires dès que la clé reCAPTCHA du site est en place (ENFORCE_APP_CHECK=true au déploiement). */
const OPTIONS = { region: REGION, enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" };
const email = z.string().trim().max(120).regex(/^[^@ ]+@[^@ ]+[.][^@ ]+$/);
const honeypot = z.string().max(200).optional();

function clientKey(req: CallableRequest<unknown>, kind: string): string {
  const fwd = String(req.rawRequest?.headers?.["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  const ip = fwd || req.rawRequest?.ip || "unknown";
  return createHash("sha256").update(`${kind}:${ip}`).digest("hex").slice(0, 40);
}

/** Compte un envoi ; refuse au-delà de la limite (raison « rate_limited »). */
export async function consumeRateLimit(key: string, now = Date.now(), limits = LIMITS): Promise<void> {
  const ref = db.doc(`rateLimits/${key}`);
  const ok = await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() ?? {};
    const hourStart = (d.hourStart as Timestamp | undefined)?.toMillis() ?? 0;
    const dayStart = (d.dayStart as Timestamp | undefined)?.toMillis() ?? 0;
    const hour = now - hourStart < 3_600_000 ? (d.hourCount as number) ?? 0 : 0;
    const day = now - dayStart < 86_400_000 ? (d.dayCount as number) ?? 0 : 0;
    if (hour >= limits.perHour || day >= limits.perDay) return false;
    tx.set(ref, {
      hourStart: hour === 0 ? Timestamp.fromMillis(now) : d.hourStart,
      hourCount: hour + 1,
      dayStart: day === 0 ? Timestamp.fromMillis(now) : d.dayStart,
      dayCount: day + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
  if (!ok) throw new HttpsError("resource-exhausted", "Trop d'envois : réessayez plus tard.", { reason: "rate_limited" });
}

const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email,
  message: z.string().trim().min(10).max(3000),
  website: honeypot,
});

export const submitContactMessage = onCall(OPTIONS, async (req) => {
  const parsed = contactSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { website, ...v } = parsed.data;
  if (website) return { ok: true };
  await consumeRateLimit(clientKey(req, "contact"));
  await db.collection("contactMessages").add({ ...v, createdAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

const applicationSchema = z.object({
  contactName: z.string().trim().min(1).max(80),
  businessName: z.string().trim().min(1).max(120),
  type: z.enum(["restaurant", "studio", "workshop", "venue", "organizer", "other"]),
  city: z.string().trim().min(1).max(60),
  email,
  phone: z.string().trim().max(30),
  link: z.string().trim().max(200),
  message: z.string().trim().min(20).max(2000),
  locale: z.enum(["fr", "ar", "en"]),
  website: honeypot,
});

export const submitPartnerApplication = onCall(OPTIONS, async (req) => {
  const parsed = applicationSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { website, ...v } = parsed.data;
  if (website) return { ok: true };
  await consumeRateLimit(clientKey(req, "partner"));
  await db.collection("partnerApplications").add({ ...v, createdAt: FieldValue.serverTimestamp() });
  return { ok: true };
});
