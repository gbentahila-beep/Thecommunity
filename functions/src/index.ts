/**
 * Cloud Functions de The Community (v2, région europe-west1).
 * Phase 3a : comptes et rôles. Réservations (phase 4), paiements (phase 5),
 * groupes (phase 6) et notifications (phase 7) viendront s'ajouter ici.
 */
import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "./lib/admin";

setGlobalOptions({ region: REGION, maxInstances: 10 });

export { onUserCreated } from "./account/on-user-created";
export { completeProfile } from "./account/complete-profile";
export { setUserRole } from "./admin/set-user-role";
