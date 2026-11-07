import * as functionsV1 from "firebase-functions/v1";
import { db, FieldValue, REGION } from "../lib/admin";

/**
 * À l'inscription : crée le profil privé users/{uid} avec les champs gérés par le serveur.
 * Le rôle par défaut est « user » (absence de custom claim) ; seul un super-admin peut le changer.
 * Trigger Auth « v1 » : ne nécessite pas Identity Platform (contrairement aux fonctions bloquantes).
 */
export const onUserCreated = functionsV1
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const ref = db.doc(`users/${user.uid}`);
    const defaults: Record<string, unknown> = {
      email: user.email ?? null,
      role: "user",
      status: "active",
      onboardingCompleted: false,
      locale: "fr",
      notificationPrefs: { email: true, push: false, marketingEmail: false },
      stats: { bookings: 0, attended: 0, noShows: 0, cancellations: 0 },
      createdAt: FieldValue.serverTimestamp(),
    };
    // Le navigateur a pu enregistrer les consentements avant l'exécution de ce trigger :
    // on n'ajoute que les champs absents, sans écraser ce qui existe déjà.
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const missing = Object.fromEntries(Object.entries(defaults).filter(([k]) => snap.get(k) === undefined));
      tx.set(ref, { ...missing, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
  });
