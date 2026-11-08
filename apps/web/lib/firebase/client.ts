"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { firebaseConfig, FUNCTIONS_REGION, RECAPTCHA_SITE_KEY, USE_EMULATORS } from "./config";

/** Services Firebase du navigateur, initialisés une seule fois. */
export function firebase() {
  const fresh = getApps().length === 0;
  const app = fresh ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const storage = getStorage(app);
  // Étape D : App Check (preuve que les appels viennent du vrai site, pas d'un robot). Prêt, activé dès que la clé
  // reCAPTCHA Enterprise est fournie (NEXT_PUBLIC_RECAPTCHA_SITE_KEY) ; jamais en local ni sur les émulateurs.
  if (fresh && !USE_EMULATORS && RECAPTCHA_SITE_KEY && typeof window !== "undefined") {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
  if (fresh && USE_EMULATORS) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
  return { app, auth, db, functions, storage };
}
