import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig } from "./config";

/**
 * Admin SDK — serveur uniquement (jamais envoyé au navigateur).
 * En production (App Hosting), les identifiants sont fournis automatiquement par Google.
 * Avec les émulateurs, FIRESTORE_EMULATOR_HOST et FIREBASE_AUTH_EMULATOR_HOST suffisent.
 */
function app() {
  return getApps()[0] ?? initializeApp({ projectId: firebaseConfig.projectId, storageBucket: firebaseConfig.storageBucket });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
