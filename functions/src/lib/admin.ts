import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const auth = getAuth();
export { FieldValue };

/** Région unique (décision D3) : Firestore, Storage et Functions en Belgique. */
export const REGION = "europe-west1";
