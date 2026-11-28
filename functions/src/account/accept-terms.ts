import { onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";

/** Version des textes acceptés (à incrémenter quand les CGU / la politique changent). */
export const TERMS_VERSION = "2026-11";

const input = z.object({ terms: z.literal(true), privacy: z.literal(true), codeOfConduct: z.literal(true), marketing: z.boolean() });

/**
 * Preuve de consentement (loi 09-08) : horodatage serveur et version des textes acceptés.
 * La prospection commerciale est un choix distinct, décoché par défaut.
 */
export const acceptTerms = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = input.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const now = FieldValue.serverTimestamp();
  await db.doc(`users/${uid}`).set(
    {
      consents: { terms: now, privacy: now, codeOfConduct: now, version: TERMS_VERSION, marketing: parsed.data.marketing, marketingAt: now },
      notificationPrefs: { email: true, push: false, marketingEmail: parsed.data.marketing },
      updatedAt: now,
    },
    { merge: true },
  );
  return { ok: true, version: TERMS_VERSION };
});
