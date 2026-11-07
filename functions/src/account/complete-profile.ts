import { profileSchema } from "@thecommunity/shared";
import { onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";

/**
 * Enregistre le questionnaire de profil. Revalide côté serveur avec le MÊME schéma Zod que le navigateur :
 * un client modifié ne peut ni contourner l'âge minimum, ni écrire un champ non prévu (rôle, statut…).
 */
export const completeProfile = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  const parsed = profileSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const p = parsed.data;
  const cities = await db.collection("cities").where("isActive", "==", true).get();
  if (!cities.docs.some((d) => d.id === p.cityId)) invalidArgument([{ path: ["cityId"], message: "required" }]);

  await db.doc(`users/${uid}`).set(
    {
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone || null,
      birthDate: p.birthDate,
      gender: p.gender ?? null,
      cityId: p.cityId,
      languages: p.languages,
      interests: p.interests,
      socialGoals: p.socialGoals,
      profession: p.profession || null,
      bio: p.bio || null,
      email: token.email ?? null,
      onboardingCompleted: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true };
});
