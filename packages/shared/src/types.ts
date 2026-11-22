import type { ExperiencePricing, PartnerPaymentStatus, PartnerSnapshot, VenueTier } from "./two-part";
import type { ActivityLevel } from "./activity";
import type { QuestionDef, QuestionnaireAnswers } from "./questionnaire";
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

/**
 * Identifiant d'univers / de catégorie. Étape 19 : les catégories sont dynamiques (créées par le super-admin) ;
 * les cinq historiques (eat, move, play, create, discover) gardent leurs adresses.
 */
export type CategoryKey = string;

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
  | "discovery"
  // Inscription en questions (docs/16) : centres d'intérêt détaillés, rangés par thème.
  | "cooking" | "coffee" | "restaurants" | "pastry"
  | "live_music" | "festivals" | "museums" | "theatre" | "comedy" | "dancing" | "cinema"
  | "photography" | "design" | "writing" | "fashion" | "architecture" | "crafts"
  | "running" | "cycling" | "football" | "hiking" | "yoga" | "padel" | "swimming"
  | "books" | "languages" | "tech" | "history" | "business" | "science" | "volunteering";

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
  /** Étape 19 : région, pays et photo de la ville (facultatifs). */
  region?: string;
  country?: string;
  imagePath?: string;
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
  /** Étape 19 : pictogramme (liste fermée), couleur, image, catégorie parente (sous-catégorie). */
  icon?: string;
  color?: string;
  imagePath?: string;
  parentId?: string | null;
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
    /** Étape 23 : position du lieu (carte sur la fiche, seulement si le lieu est public). */
    geo?: { lat: number; lng: number } | null;
  };
  images: ImageRef[];
  durationMinutes: number;
  /** Part organisation, payée en ligne (étape 11 : seule part concernée par les réductions et les frais). */
  price: Money;
  /** Étape 11 : part partenaire réglée sur place (absent = « tout en ligne »). */
  pricing?: ExperiencePricing | null;
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
  /** Compte Instagram obligatoire dans la demande (11h). */
  requestInstagramRequired?: boolean;
  languages: string[];
  alcoholServed?: boolean;
  /** Une hôtesse accueille les participants sur place (option de l'organisateur) ; sinon, arrivée autonome. */
  onSiteHost?: boolean;
  /** Des plats ou boissons sont servis (atelier cuisine, dégustation…) : régime et allergies demandés. */
  foodServed?: boolean;
  /** Restaurant : gamme (Casual, Premium, Exclusive), budget estimé par personne (centimes) quand chacun paie sa
   *  consommation et ambiance — affichées même quand le lieu reste une surprise ; la cuisine, elle, n'apparaît qu'avec le lieu (docs/22). */
  venueTier?: VenueTier | null;
  budgetRange?: { min: number; max: number; currency: CurrencyCode } | null;
  cuisine?: string | null;
  ambiance?: string | null;
  included: LocalizedText[];
  /** Étape 23 : ce qui n'est pas compris dans le prix. */
  notIncluded?: LocalizedText[];
  /** Date de création (badge « Nouveau », tri « Nouveautés ») ; absente sur les anciennes données de démonstration. */
  createdAt?: string;
  practicalInfo: LocalizedText;
  cancellationPolicyId: string;
  /** Étape 20 : « pending_review » (envoyée par un organisateur, à valider) et « rejected » (refusée par l'équipe). */
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
  /** Étape 19 : organisateur (absent = Wenzy) et sous-catégorie. */
  organizerId?: string | null;
  organizerSnapshot?: { name: string; slug: string } | null;
  subcategoryId?: string | null;
  /** Étape 22 : mode de paiement (activités d'organisateurs) et prix total par place (la part en ligne est `price`). */
  paymentModel?: "full_online" | "deposit" | "booking_fee";
  depositPercent?: number | null;
  totalPrice?: Money | null;
  /** Étape 20 : activité publiée modifiée par l'organisateur (à relire) ; message de l'équipe en cas de refus. */
  reviewFlag?: boolean;
  rejectionMessage?: string | null;
  ratingAvg: number;
  ratingCount: number;
  /* 18b : précisions pour les activités (facultatives, en français ; affichées telles quelles). */
  level?: ActivityLevel | null;
  equipmentProvided?: string;
  whatToBring?: string;
  dressCode?: string;
  minAge?: number | null;
  /** Étape 29 : public (mixte ou réservé aux femmes) et tranche d'âge visée (indicative). */
  audience?: "all" | "women";
  targetAgeMin?: number | null;
  targetAgeMax?: number | null;
  outdoor?: boolean;
  /** 18c : activité physique, conditions de participation à accepter. */
  physicalActivity?: boolean;
  /** 18a : questionnaire rempli après la réservation. */
  questionnaire?: QuestionDef[];
  /** 18d : proposée par un membre de confiance (prénom affiché sur la fiche). */
  proposedBy?: { uid: string; firstName: string } | null;
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
  /** Étape 24 : réponse publique de l'organisateur ou de l'équipe. */
  reply?: { text: string; authorName: string; authorRole: "organizer" | "team"; at: string } | null;
  /** Étape 24 : photo facultative, publiée seulement une fois acceptée par l'équipe. */
  photo?: { path: string; status: "pending" | "approved" | "rejected" } | null;
  /** Notes détaillées facultatives (groupe, organisation, lieu) et « Reviendriez-vous ? ». */
  details?: { group?: number; organisation?: number; venue?: number } | null;
  comeAgain?: boolean | null;
  /** Étape 24 : signalements reçus / encore à traiter. */
  reportCount?: number;
  reportsOpen?: number;
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
  /** Étape 30 (facultatif). */
  district?: string | null;
  favoriteCategories?: string[];
  sportLevel?: "beginner" | "intermediate" | "advanced" | null;
  agePreference?: "any" | "similar";
  /** Inscription en questions (docs/16) : réponses facultatives (composition des groupes). */
  groupVibe?: "calm" | "curious" | "playful" | "any" | null;
  conversationStyle?: number | null;
  humor?: "dry" | "playful" | "offbeat" | "everything" | null;
  lifeValues?: string[];
  exerciseFrequency?: "most_days" | "weekly" | "sometimes" | "rarely" | null;
  venueBudget?: "cafe" | "casual" | "smart" | "fine" | null;
  diets?: string[];
  sector?: string | null;
  referral?: string | null;
  whatsapp?: boolean;
  instagram?: string | null;
  profession?: string;
  bio?: string;
  locale: Locale;
  onboardingCompleted: boolean;
  /** newExperiences : e-mail à chaque nouvelle expérience publiée (alerte de l'accueil). */
  notificationPrefs: { email: boolean; push: boolean; marketingEmail: boolean; newExperiences?: boolean };
  createdAt: string;
  /** 18d : membre de confiance (peut proposer des sorties, statut donné par l'équipe). */
  trustedHost?: boolean;
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
  /** Organisateur de l'activité (null = Wenzy). */
  organizerId?: string | null;
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
  venue?: { name: string; address: string; cuisine?: string };
  /** Régime, allergies, langues de table (5g) ; transmis au lieu seulement avec l'accord de la personne. */
  preferences?: { diet: string; allergies: string; languages: string[]; shareWithVenue: boolean };
  groupId?: string;
  /** Arrivée indiquée par le participant lui-même (docs/16) ; le pointage de l'organisateur reste à part. */
  arrivedAt?: string;
  paidAt?: string;
  /** Fin du blocage des places pendant le paiement (réservation « pending_payment »). */
  holdExpiresAt?: string;
  /** Étape 22 : montant déjà remboursé (remboursements partiels possibles) ; politique d'annulation copiée. */
  refundedAmount?: number;
  cancellationPolicy?: CancellationPolicy | null;
  paymentId?: string;
  /** Étape 5h : paiement par virement — référence à indiquer (la place reste bloquée jusqu'à holdExpiresAt). */
  paymentMethod?: "bank_transfer";
  transferReference?: string;
  /** Place proposée automatiquement depuis la liste d'attente. */
  fromWaitlist?: boolean;
  /** Paiement arrivé après l'expiration du blocage, place reprise. */
  latePayment?: boolean;
  cancellation?: { at: string; by: "user" | "admin" | "system"; refundAmount: number; reason?: string; refundStatus?: "succeeded" | "pending" | "none" };
  /** Étape 11 : copie figée de la part partenaire (null = tout en ligne), montant attendu sur place (null = consommation libre ou sans objet) et suivi. */
  partnerSnapshot?: PartnerSnapshot | null;
  onSiteAmount?: number | null;
  partnerPaymentStatus?: PartnerPaymentStatus;
  reviewId?: string;
  /** 18a : réponses au questionnaire de l'expérience (effacées 30 jours après l'expérience). */
  questionnaire?: { answers: QuestionnaireAnswers; answeredAt: string } | null;
  /** Invitation à remplir le questionnaire envoyée (une seule fois). */
  questionnaireNotifiedAt?: string;
  /** 18c : conditions de participation aux activités physiques acceptées (version et date). */
  physicalTerms?: { version: string; acceptedAt: string } | null;
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
  | "questionnaire"
  | "proposal_published"
  | "proposal_declined"
  | "meet_match"
  | "meet_invite"
  | "outing_for_group"
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

/** 18d : sortie proposée par un membre de confiance (lisible par son auteur et l'équipe). */
export type OutingProposal = {
  id: string;
  /** Étape 31 : sortie proposée à un ancien groupe (taille du groupe), sinon null. */
  forGroupSize?: number | null;
  userId: string;
  firstName: string;
  cityId: string;
  title: string;
  categoryId: CategoryKey;
  description: string;
  district: string;
  venueIdea: string;
  datesIdea: string;
  capacity: number;
  priceIdeaDh: number | null;
  level: ActivityLevel | null;
  willHost: boolean;
  notes: string;
  status: "pending" | "accepted" | "declined";
  experienceId?: string;
  decisionMessage?: string;
  createdAt: string;
  decidedAt?: string;
};
