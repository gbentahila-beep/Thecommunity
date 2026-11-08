export const MODE_LABELS = { individual: "Individuel", group: "Groupe", social_dinner: "Dîner social", open: "Libre", private: "Privatisé" } as const;

export const RESERVATION_STATUS = {
  pending_payment: ["Paiement en attente", "amber"],
  confirmed: ["Confirmée", "green"],
  cancelled: ["Annulée", "gray"],
  expired: ["Expirée", "gray"],
  refunded: ["Remboursée", "gray"],
  attended: ["Vécue", "plum"],
  no_show: ["Absent", "red"],
} as const;

export const CATEGORY_LABELS = { eat: "Dîners", move: "Sport & bien-être", play: "Jeux", create: "Ateliers", discover: "Sorties" } as const;

export const INTEREST_LABELS: Record<string, string> = {
  gastronomy: "Gastronomie", sport: "Sport", travel: "Voyage", culture: "Culture", art: "Art",
  music: "Musique", wellness: "Bien-être", games: "Jeux", nightlife: "Sorties", discovery: "Découverte",
};

export const LANGUAGE_LABELS: Record<string, string> = { fr: "FR", ar: "AR", darija: "Darija", en: "EN", es: "ES" };

export const DIET_LABELS: Record<string, string> = {
  none: "—", vegetarian: "Végétarien", vegan: "Végan", pescatarian: "Pescétarien", gluten_free: "Sans gluten", lactose_free: "Sans lactose", other: "Autre",
};
