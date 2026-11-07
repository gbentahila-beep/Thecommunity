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
  isDemo?: boolean;
};

export type Review = {
  id: string;
  experienceId: string;
  rating: number;
  comment: string;
  publicName: string;
  createdAt: string;
  isDemo?: boolean;
};
