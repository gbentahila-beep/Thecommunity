/**
 * Cloud Functions de The Host Club (v2, région europe-west1).
 * Comptes et rôles (phase 3), réservations et paiement de test (phase 4a).
 * Prestataire de paiement réel (phase 5), groupes (phase 6) et notifications (phase 7) viendront s'ajouter ici.
 */
import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "./lib/admin";

setGlobalOptions({ region: REGION, maxInstances: 10 });

export { onUserCreated } from "./account/on-user-created";
export { completeProfile } from "./account/complete-profile";
export { acceptTerms } from "./account/accept-terms";
export { setUserRole } from "./admin/set-user-role";
export { adminSetUserStatus } from "./admin/set-user-status";
export { adminSaveExperience } from "./experiences/save-experience";
export { createReservation } from "./reservations/create-reservation";
export { expireHolds } from "./reservations/expire-holds";
export { startCheckout } from "./payments/start-checkout";
export { sandboxCompletePayment } from "./payments/sandbox-complete";
