/**
 * Configuration Firebase « web » (publique : ce ne sont pas des secrets).
 * - Sans NEXT_PUBLIC_FIREBASE_PROJECT_ID : MODE DÉMONSTRATION (données fictives, comme en phase 2).
 * - Avec : MODE FIREBASE (comptes, Firestore, Storage, fonctions). NEXT_PUBLIC_USE_EMULATORS=true
 *   pour viser les émulateurs locaux.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const FIREBASE_ENABLED = Boolean(firebaseConfig.projectId);
export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
export const FUNCTIONS_REGION = "europe-west1";
export const SESSION_COOKIE = "__session"; // seul nom de cookie transmis par Firebase Hosting / App Hosting
export const SESSION_DAYS = 5;
