/**
 * Cloud Functions de The Host Club (v2, région europe-west1).
 * Comptes et rôles (phase 3), réservations, paiement de test, demandes, annulation et liste d'attente (phase 4).
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
export { adminExperienceAction } from "./experiences/experience-actions";
export { createReservation } from "./reservations/create-reservation";
export { expireHolds } from "./reservations/expire-holds";
export { startCheckout } from "./payments/start-checkout";
export { sandboxCompletePayment } from "./payments/sandbox-complete";
export { requestBooking, cancelBookingRequest, adminDecideRequest } from "./requests/booking-requests";
export { cancelReservation } from "./reservations/cancel-reservation";
export { joinWaitlist, leaveWaitlist } from "./waitlist/waitlist";
export { adminCancelReservation, adminCancelSession, adminMoveReservation, adminCheckIn, adminLogExport } from "./admin/reservations-admin";
export { submitReview, adminSetReviewStatus, reviewRequests } from "./reviews/reviews";
export { setExperienceAlert } from "./experiences/alerts";
export { adminSaveMembershipPlan, startMembershipCheckout, adminGrantMembership, adminRevokeMembership } from "./membership/membership";
export { adminInvoiceAction, adminSaveCompanySettings } from "./invoices/admin";
export { adminSavePartner, adminPartnerAction, adminPartnerApplicationAction } from "./catalog/partners";
export { adminSaveCity, adminSaveCategory } from "./catalog/places";
export { previewPricing, updateReservationPreferences, adminSavePromo, adminSaveBookingSettings } from "./pricing/pricing";
export { adminProposeGroups, adminSaveGroups, adminRevealGroups, adminSaveHosting } from "./groups/groups";
export { sendReminders } from "./notify/reminders";
