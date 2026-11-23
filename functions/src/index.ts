/**
 * Cloud Functions de Wenzy (v2, région europe-west1).
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
export { adminSaveExperience, organizerSaveExperience } from "./experiences/save-experience";
export { applyAsOrganizer, adminDecideOrganizer, organizerUpdateProfile, adminReviewExperience } from "./organizers/organizers";
export { adminSaveCancellationPolicy, adminSaveOrganizerPaymentModels } from "./catalog/policies";
export { adminSaveHomeSettings } from "./catalog/home";
export { requestRefund, adminDecideRefund } from "./refunds/refunds";
export { refundRetries } from "./refunds/retry";
export { adminSaveCommissionRule, adminSetCommissionRuleActive, organizerSaveBankDetails, adminCreatePayout, adminMarkPayoutPaid } from "./commissions/commissions";
export { adminExperienceAction } from "./experiences/experience-actions";
export { createReservation } from "./reservations/create-reservation";
export { expireHolds } from "./reservations/expire-holds";
export { startCheckout } from "./payments/start-checkout";
export { sandboxCompletePayment } from "./payments/sandbox-complete";
export { cmiCallback } from "./payments/cmi-callback";
export { purgePreferences } from "./maintenance/purge-preferences";
export { transferReminders } from "./payments/transfer-reminders";
export { submitContactMessage, submitPartnerApplication } from "./public/forms";
export { dailyBackup } from "./maintenance/backup";
export { dailyHealthCheck } from "./maintenance/health";
export { adminCompleteManualRefund, adminConfirmTransfer, adminSavePaymentSettings } from "./payments/transfer-admin";
export { requestBooking, cancelBookingRequest, adminDecideRequest } from "./requests/booking-requests";
export { cancelReservation } from "./reservations/cancel-reservation";
export { selfCheckIn, signalLate } from "./reservations/self-check-in";
export { submitQuestionnaire } from "./reservations/questionnaire";
export { submitOutingProposal, adminDecideProposal, adminSetTrustedHost } from "./proposals/proposals";
export { joinWaitlist, leaveWaitlist } from "./waitlist/waitlist";
export { adminCancelReservation, adminCancelSession, adminMoveReservation, adminCheckIn, adminSetPartnerPayment, adminLogExport } from "./admin/reservations-admin";
export { submitReview, adminSetReviewStatus, reviewRequests } from "./reviews/reviews";
export { replyToReview, reportReview, adminResolveReviewReports, adminDecideReviewPhoto } from "./reviews/moderation";
export { setMeetAgain, setAvoid, inviteToSession } from "./meet/meet";
export { reportParticipant, reportFromReservation, adminResolveReport, adminSetBookingHold } from "./meet/reports";
export { setExperienceAlert } from "./experiences/alerts";
export { sendNewExperienceAlerts, subscribeNewExperienceAlerts, confirmNewExperienceAlerts, stopNewExperienceAlerts } from "./experiences/new-experience-alerts";
export { adminSaveMembershipPlan, startMembershipCheckout, adminGrantMembership, adminRevokeMembership, adminLiftSuspension } from "./membership/membership";
export { adminCancelAbsence } from "./membership/absences";
export { withdrawMembership } from "./membership/withdraw";
export { adminInvoiceAction, adminSaveCompanySettings } from "./invoices/admin";
export { adminSavePartner, adminPartnerAction, adminPartnerApplicationAction } from "./catalog/partners";
export { adminSaveCity, adminSaveCategory } from "./catalog/places";
export { previewPricing, updateReservationPreferences, adminSavePromo, adminSaveBookingSettings, adminSaveWenzyPrice, adminSaveTemplate, adminDeleteTemplate } from "./pricing/pricing";
export { adminProposeGroups, adminSaveGroups, adminRevealGroups } from "./groups/groups";
export { sendReminders } from "./notify/reminders";
export { adminSetSessionVenues, adminSessionVenueAction } from "./experiences/venues";
export { adminAddSessions } from "./experiences/add-sessions";
export { adminResetShowcase } from "./experiences/showcase";
export { moveMyReservation } from "./tables/move";
export { partnerRespondRequest, adminRequestAction, adminAllocate, adminSaveAllocationSettings, adminSaveWhatsAppSettings, adminRiskDecision, respondProposal, sendTableMessage } from "./tables/callables";
export { tablesAutomation } from "./tables/automation";
