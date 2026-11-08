/**
 * Types métier partagés entre le frontend et (plus tard) les Cloud Functions.
 * Ils suivent le modèle décrit dans docs/03-modele-de-donnees.md.
 * Les dates sont des chaînes ISO 8601 (UTC) côté application ; elles seront
 * converties depuis/vers des Timestamp Firestore dans la couche d'accès aux données.
 */

export type Locale = "fr" | "ar" | "en";
export type LocalizedText = { fr: string; ar?: string; en?: string };

export type CurrencyCode = "MAD";
export type Money = {
  /** Montant en centimes (16900 = 169,00 DH). */
  amount: number;
  currency: CurrencyCode;
};

export type CategoryKey = "eat" | "move" | "play" | "create" | "discover";

export type BookingMode = "individual" | "group" | "social_dinner" | "open" | "private";

export type Interest =
  | "gastronomy"
  | "sport"
  | "travel"
  | "culture"
  | "art"
  | "music"
  | "wellness"
  | "games"
  | "nightlife"
  | "discovery";

export type SocialGoal =
  | "meet_new_people"
  | "expand_circle"
  | "discover_activities"
  | "go_out_more"
  | "share_passions";

export type City = {
  id: string;
  name: LocalizedText;
  countryCode: "MA";
  timezone: string;
  currency: CurrencyCode;
  isActive: boolean;
  isComingSoon: boolean;
  order: number;
  districts: string[];
  isDemo?: boolean;
};

export type Category = {
  id: CategoryKey;
  name: LocalizedText;
  shortName: LocalizedText;
  description: LocalizedText;
  order: number;
  isActive: boolean;
  defaultBookingMode: BookingMode;
};

export type ImageRef = { path: string; alt: LocalizedText };

export type CancellationRule = { hoursBefore: number; refundPercent: number };
export type CancellationPolicy = { id: string; label: LocalizedText; rules: CancellationRule[] };

export type GroupConfig = { minSize: number; targetSize: number; maxSize: number };

export type Experience = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  categoryId: CategoryKey;
  cityId: string;
  district: string;
  tags: string[];
  partnerSnapshot?: { name: string };
  venue: {
    name: string;
    address: string;
    revealPolicy: "immediate" | "on_group_reveal";
  };
  images: ImageRef[];
  durationMinutes: number;
  price: Money;
  bookingMode: BookingMode;
  groupConfig?: GroupConfig;
  maxSeatsPerBooking: number;
  /** Prix membre précis (centimes) ; à défaut, réduction de la formule d'abonnement. */
  memberPrice?: Money | null;
  /** Réservable uniquement par les membres abonnés. */
  membersOnly?: boolean;
  /** « on_request » : la personne envoie une demande, l'équipe accepte ou refuse avant le paiement. */
  admission?: Admission;
  /** Message de motivation obligatoire avec la demande (sinon facultatif). */
  requestMessageRequired?: boolean;
  languages: string[];
  alcoholServed?: boolean;
  included: LocalizedText[];
  practicalInfo: LocalizedText;
  cancellationPolicyId: string;
  status: "draft" | "published" | "archived";
  ratingAvg: number;
  ratingCount: number;
  isDemo?: boolean;
};

export type Admission = "direct" | "on_request";

export type BookingRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

/** Demande de participation à une date « sur demande ». Lisible par son auteur et l'équipe. */
export type BookingRequest = {
  id: string;
  userId: string;
  sessionId: string;
  experienceId: string;
  seats: number;
  message: string;
  instagram?: string;
  status: BookingRequestStatus;
  reservationId?: string;
  sessionSnapshot: Reservation["sessionSnapshot"];
  createdAt: string;
  decidedAt?: string;
};

export type WaitlistStatus = "waiting" | "offered" | "expired" | "converted" | "left";

/** Inscription sur la liste d'attente d'une date complète (sessions/{id}/waitlist/{uid}). */
export type WaitlistEntry = {
  id: string; // uid
  userId: string;
  sessionId: string;
  seats: number;
  status: WaitlistStatus;
  reservationId?: string;
  sessionSnapshot: Reservation["sessionSnapshot"];
  createdAt: string;
};

export type SessionStatus = "draft" | "published" | "full" | "cancelled" | "completed";

export type Session = {
  id: string;
  experienceId: string;
  cityId: string;
  categoryId: CategoryKey;
  startAt: string;
  endAt: string;
  price: Money;
  capacity: number;
  seatsConfirmed: number;
  seatsHeld: number;
  waitlistCount: number;
  status: SessionStatus;
  isFeatured: boolean;
  /** Date de création (accès anticipé des membres aux nouvelles dates). */
  createdAt?: string;
  /** Composition des tables (6) : état, à revoir après une annulation, fiche hôte. */
  groupsStatus?: "none" | "proposed" | "validated" | "revealed";
  groupsNeedReview?: boolean;
  hosting?: { hostName: string; notes: string };
  isDemo?: boolean;
};

export type Review = {
  id: string; // = identifiant de la réservation (un avis par réservation)
  experienceId: string;
  sessionId?: string;
  userId?: string;
  rating: number;
  comment: string;
  publicName: string;
  status?: "published" | "hidden";
  createdAt: string;
  isDemo?: boolean;
};

export type Gender = "female" | "male" | "undisclosed";
export type SpokenLanguage = "fr" | "ar" | "darija" | "en" | "es";

/** Profil privé (users/{uid}) — lisible uniquement par son propriétaire et les admins. */
export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate: string; // AAAA-MM-JJ
  gender?: Gender;
  cityId: string;
  photoPath?: string;
  languages: SpokenLanguage[];
  interests: Interest[];
  socialGoals: SocialGoal[];
  profession?: string;
  bio?: string;
  locale: Locale;
  onboardingCompleted: boolean;
  notificationPrefs: { email: boolean; push: boolean; marketingEmail: boolean };
  createdAt: string;
  isDemo?: boolean;
};

export type ReservationStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "refunded"
  | "attended"
  | "no_show";

export type Pricing = {
  unitAmount: number;
  seats: number;
  subtotal: number;
  /** Réduction accordée aux membres abonnés (centimes). */
  memberDiscount?: number;
  /** Remise du code promo (centimes) et code appliqué. */
  discount: number;
  promoCode?: string;
  /** Frais de service (centimes). */
  fees: number;
  total: number;
  currency: CurrencyCode;
};

export type Reservation = {
  id: string;
  userId: string;
  sessionId: string;
  experienceId: string;
  status: ReservationStatus;
  seats: number;
  pricing: Pricing;
  promoCode?: string;
  sessionSnapshot: {
    title: LocalizedText;
    slug: string;
    startAt: string;
    endAt: string;
    district: string;
    coverImagePath: string;
    categoryId: CategoryKey;
    bookingMode: BookingMode;
  };
  /** Lieu exact : renseigné dès la réservation, ou à la révélation du groupe pour les dîners. */
  venue?: { name: string; address: string };
  /** Régime, allergies, langues de table (5g) ; transmis au lieu seulement avec l'accord de la personne. */
  preferences?: { diet: string; allergies: string; languages: string[]; shareWithVenue: boolean };
  groupId?: string;
  paidAt?: string;
  /** Fin du blocage des places pendant le paiement (réservation « pending_payment »). */
  holdExpiresAt?: string;
  paymentId?: string;
  /** Place proposée automatiquement depuis la liste d'attente. */
  fromWaitlist?: boolean;
  /** Paiement arrivé après l'expiration du blocage, place reprise. */
  latePayment?: boolean;
  cancellation?: { at: string; by: "user" | "admin" | "system"; refundAmount: number; reason?: string };
  reviewId?: string;
  createdAt: string;
  isDemo?: boolean;
};

/** Groupe tel que vu par un participant : uniquement les informations utiles à l'expérience. */
export type Group = {
  id: string;
  sessionId: string;
  label: string;
  status: "proposed" | "validated" | "revealed";
  memberIds: string[];
  members: { uid: string; firstName: string; photoPath?: string; interests: Interest[] }[];
  isDemo?: boolean;
};

export type NotificationType =
  | "booking_confirmed"
  | "payment_confirmed"
  | "reminder"
  | "group_revealed"
  | "event_updated"
  | "event_cancelled"
  | "waitlist_offer"
  | "review_request"
  | "new_dates"
  | "request_accepted"
  | "request_declined"
  | "welcome";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText;
  link?: string;
  createdAt: string;
  readAt?: string;
  isDemo?: boolean;
};
