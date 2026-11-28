import { HttpsError } from "firebase-functions/v2/https";

/** Refus « métier » lisible par l'interface (details.reason). */
export const refuse = (reason: string, message: string): never => {
  throw new HttpsError("failed-precondition", message, { reason });
};
