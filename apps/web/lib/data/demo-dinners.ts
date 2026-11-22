import { DEFAULT_CANCELLATION_POLICY, type Experience } from "@thecommunity/shared";

/**
 * Dîners de DÉMONSTRATION (21 novembre) : un exemple pour chaque façon de payer et chaque gamme, pour voir à quoi
 * ressemble la fiche et le catalogue. Avec « Dîner entre inconnus » (tout en ligne, lieu surprise) et « Brunch entre
 * inconnus » (menu réglé au restaurant, lieu surprise), toutes les combinaisons sont couvertes :
 *
 * | Paiement                              | Lieu visible          | Lieu surprise                         |
 * |---------------------------------------|-----------------------|---------------------------------------|
 * | Menu négocié, tout en ligne           | Dîner du chef         | Dîner entre inconnus                  |
 * | Menu à prix fixe réglé au restaurant  | Tajine & conversations | Brunch entre inconnus                |
 * | Chacun paie sa consommation (budget)  | Pizza entre inconnus  | Secret Dinner, Dîner gastronomique    |
 *
 * Gammes : Casual (Tajine, Pizza), Premium (Dîner du chef, Secret Dinner), Exclusive (Dîner gastronomique).
 * Lieux décrits sans nom réel. Toujours marqués isDemo.
 */
const mad = (dh: number) => ({ amount: dh * 100, currency: "MAD" as const });
const base = {
  cityId: "casablanca",
  tags: ["diners-entre-inconnus"] as string[],
  cancellationPolicyId: DEFAULT_CANCELLATION_POLICY.id,
  status: "published" as const,
  isDemo: true,
  createdAt: "2026-11-21T08:00:00.000Z",
  categoryId: "eat",
  bookingMode: "social_dinner" as const,
  groupConfig: { minSize: 5, targetSize: 6, maxSize: 7 },
  maxSeatsPerBooking: 1,
  durationMinutes: 150,
  alcoholServed: false,
};
const partner = (name: string, pricingType: "fixed" | "consumption", price: number | null) => ({
  name,
  paymentMode: "on_site" as const,
  pricingType,
  price: price === null ? null : mad(price),
  description: "",
});

export const DEMO_DINNER_EXPERIENCES: Experience[] = [
  // Chacun paie sa consommation + lieu surprise, Premium.
  {
    ...base,
    id: "exp-secret-dinner",
    slug: "secret-dinner-gauthier",
    title: { fr: "Secret Dinner", ar: "عشاء سري", en: "Secret Dinner" },
    summary: { fr: "Un restaurant surprise, six inconnus, et l'adresse dévoilée la veille.", ar: "مطعم مفاجئ، ستة غرباء، والعنوان يُكشف في اليوم السابق.", en: "A surprise restaurant, six strangers, and the address revealed the day before." },
    description: {
      fr: "Vous réservez votre place, nous composons une table de six et choisissons un restaurant que vous ne connaissez peut-être pas encore. Le nom vous est dévoilé la veille avec votre groupe. Sur place, chacun commande à la carte et règle sa consommation directement au restaurant : comptez 200 à 300 DH par personne.",
      en: "You book your place, we put together a table of six and pick a restaurant you may not know yet. Its name is revealed the day before with your group. On site, everyone orders à la carte and pays the restaurant directly: allow 200 to 300 DH per person.",
    },
    district: "Gauthier",
    venue: { name: "Restaurant surprise (révélé la veille)", address: "Quartier Gauthier, Casablanca", revealPolicy: "on_group_reveal" },
    images: [{ path: "/demo/restaurant-lanternes.webp", alt: { fr: "Salle de restaurant chaleureuse aux lanternes" } }],
    price: mad(49),
    pricing: { model: "variable_consumption", currency: "MAD", partner: partner("Restaurant partenaire Gauthier", "consumption", null) },
    venueTier: "premium",
    budgetRange: { min: 20000, max: 30000, currency: "MAD" },
    cuisine: "Internationale",
    ambiance: "Chic et décontractée",
    languages: ["fr", "en"],
    included: [{ fr: "Place à une table de six composée par notre équipe" }, { fr: "Réservation au restaurant" }],
    notIncluded: [{ fr: "Repas et boissons, réglés sur place au restaurant" }],
    practicalInfo: { fr: "Nom et adresse du restaurant dévoilés la veille. Tenue soignée bienvenue." },
    ratingAvg: 4.8,
    ratingCount: 31,
  },
  // Menu négocié, tout payé en ligne + lieu visible, Premium.
  {
    ...base,
    id: "exp-diner-du-chef",
    slug: "diner-du-chef-maarif",
    title: { fr: "Dîner du chef : menu à 299 DH", ar: "عشاء الشيف: قائمة بـ 299 درهم", en: "Chef's dinner: 299 DH menu" },
    summary: { fr: "Entrée, plat, dessert et boisson : tout est compris, rien à payer sur place.", ar: "مقبلات، طبق رئيسي، تحلية ومشروب: كل شيء مشمول، لا شيء يُدفع في المكان.", en: "Starter, main, dessert and drink: everything included, nothing to pay on site." },
    description: {
      fr: "Un menu négocié avec un restaurant méditerranéen du Maârif, servi à une table de six. Vous payez tout en ligne à la réservation : entrée, plat, dessert et une boisson. Sur place, vous n'avez plus qu'à profiter de la soirée.",
      en: "A menu agreed with a Mediterranean restaurant in Maârif, served at a table of six. You pay everything online when booking: starter, main, dessert and a drink. On site, all that's left is to enjoy the evening.",
    },
    district: "Maârif",
    venue: { name: "Restaurant méditerranéen partenaire", address: "Boulevard d'Anfa, Maârif, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/hero-diner-rooftop.webp", alt: { fr: "Table dressée pour un dîner au coucher du soleil" } }],
    price: mad(299),
    venueTier: "premium",
    cuisine: "Méditerranéenne",
    ambiance: "Élégante et chaleureuse",
    languages: ["fr", "darija", "en"],
    included: [{ fr: "Menu entrée, plat, dessert" }, { fr: "Une boisson sans alcool" }, { fr: "Place à une table de six" }],
    notIncluded: [{ fr: "Boissons supplémentaires" }],
    practicalInfo: { fr: "Menu végétarien sur demande à la réservation." },
    ratingAvg: 4.9,
    ratingCount: 18,
  },
  // Menu à prix fixe réglé au restaurant + lieu visible, Casual.
  {
    ...base,
    id: "exp-tajine-conversations",
    slug: "tajine-et-conversations-habous",
    title: { fr: "Tajine & conversations", ar: "طاجين وحديث", en: "Tagine & conversation" },
    summary: { fr: "49 DH en ligne pour votre place, puis un menu tajine à 150 DH réglé au restaurant.", ar: "49 درهماً عبر الإنترنت لمقعدك، ثم قائمة طاجين بـ 150 درهماً تُدفع للمطعم.", en: "49 DH online for your place, then a 150 DH tagine menu paid at the restaurant." },
    description: {
      fr: "Une table de six dans un restaurant familial des Habous. Vous réservez votre place en ligne (49 DH), puis vous réglez le menu au restaurant : salades marocaines, tajine au choix, thé et pâtisseries pour 150 DH par personne, prix fixe annoncé à l'avance.",
      en: "A table of six in a family restaurant in the Habous. You book your place online (49 DH), then pay the menu at the restaurant: Moroccan salads, a tagine of your choice, tea and pastries for 150 DH per person, a fixed price announced in advance.",
    },
    district: "Habous",
    venue: { name: "Restaurant familial partenaire", address: "Quartier Habous, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/images/illustrations/couscous.webp", alt: { fr: "Plat marocain vu de dessus" } }],
    price: mad(49),
    pricing: { model: "fixed_partner", currency: "MAD", partner: partner("Restaurant familial Habous", "fixed", 150) },
    venueTier: "casual",
    cuisine: "Marocaine",
    ambiance: "Familiale et conviviale",
    languages: ["fr", "darija"],
    included: [{ fr: "Place à une table de six" }, { fr: "Menu salades, tajine, thé et pâtisseries (réglé au restaurant)" }],
    practicalInfo: { fr: "Le menu (150 DH) se règle sur place, en espèces ou par carte." },
    ratingAvg: 4.7,
    ratingCount: 22,
  },
  // Chacun paie sa consommation + lieu visible, Casual.
  {
    ...base,
    id: "exp-pizza-inconnus",
    slug: "pizza-entre-inconnus-racine",
    title: { fr: "Pizza entre inconnus", ar: "بيتزا مع غرباء", en: "Pizza with strangers" },
    summary: { fr: "Une pizzeria de Racine, six inconnus, chacun commande ce qu'il veut.", ar: "مطعم بيتزا في راسين، ستة غرباء، وكل واحد يطلب ما يريد.", en: "A pizzeria in Racine, six strangers, everyone orders what they like." },
    description: {
      fr: "La formule la plus simple pour commencer : votre place à une table de six dans une pizzeria de Racine (39 DH en ligne), puis chacun commande et règle sa consommation au restaurant. Comptez 100 à 150 DH par personne.",
      en: "The simplest way to start: your place at a table of six in a Racine pizzeria (39 DH online), then everyone orders and pays the restaurant. Allow 100 to 150 DH per person.",
    },
    district: "Racine",
    venue: { name: "Pizzeria partenaire", address: "Racine, Casablanca", revealPolicy: "immediate" },
    images: [{ path: "/demo/diner-inconnus.webp", alt: { fr: "Tablée conviviale au restaurant" } }],
    price: mad(39),
    pricing: { model: "variable_consumption", currency: "MAD", partner: partner("Pizzeria partenaire Racine", "consumption", null) },
    venueTier: "casual",
    budgetRange: { min: 10000, max: 15000, currency: "MAD" },
    cuisine: "Italienne",
    ambiance: "Décontractée",
    languages: ["fr", "darija", "en"],
    included: [{ fr: "Place à une table de six" }, { fr: "Réservation au restaurant" }],
    notIncluded: [{ fr: "Repas et boissons, réglés sur place" }],
    practicalInfo: { fr: "Tenue décontractée." },
    ratingAvg: 4.6,
    ratingCount: 27,
  },
  // Chacun paie sa consommation + lieu surprise, Exclusive.
  {
    ...base,
    id: "exp-diner-gastronomique",
    slug: "diner-gastronomique-secret-anfa",
    title: { fr: "Dîner gastronomique secret", ar: "عشاء فاخر سري", en: "Secret fine-dining dinner" },
    summary: { fr: "Une grande table, dévoilée la veille, pour six convives curieux.", ar: "مطعم فاخر يُكشف عنه في اليوم السابق، لستة ضيوف فضوليين.", en: "A fine-dining restaurant, revealed the day before, for six curious guests." },
    description: {
      fr: "Pour les grandes occasions : un restaurant haut de gamme, dévoilé la veille avec votre groupe. Vous réservez votre place en ligne (79 DH) ; sur place, menu dégustation ou carte, réglé directement au restaurant. Comptez 450 à 600 DH par personne.",
      en: "For special occasions: a high-end restaurant, revealed the day before with your group. You book your place online (79 DH); on site, tasting menu or à la carte, paid directly to the restaurant. Allow 450 to 600 DH per person.",
    },
    district: "Anfa",
    venue: { name: "Restaurant gastronomique (révélé la veille)", address: "Anfa, Casablanca", revealPolicy: "on_group_reveal" },
    images: [{ path: "/demo/rooftop-medina.webp", alt: { fr: "Table élégante avec vue sur la ville" } }],
    price: mad(79),
    pricing: { model: "variable_consumption", currency: "MAD", partner: partner("Restaurant gastronomique Anfa", "consumption", null) },
    venueTier: "exclusive",
    budgetRange: { min: 45000, max: 60000, currency: "MAD" },
    cuisine: "Française contemporaine",
    ambiance: "Élégante, tenue soignée",
    languages: ["fr", "en"],
    targetAgeMin: 28,
    targetAgeMax: 50,
    included: [{ fr: "Place à une table de six composée par notre équipe" }, { fr: "Réservation au restaurant" }],
    notIncluded: [{ fr: "Repas et boissons, réglés sur place au restaurant" }],
    practicalInfo: { fr: "Tenue soignée demandée. Nom et adresse dévoilés la veille." },
    ratingAvg: 4.9,
    ratingCount: 9,
  },
];

/** Jour de la semaine (0 = dimanche), heure, capacité et places prises pour les trois prochaines semaines. */
export const DEMO_DINNER_SCHEDULE: Record<string, { weekday: number; hour: number; minute: number; capacity: number; taken: number[] }> = {
  "exp-secret-dinner": { weekday: 4, hour: 20, minute: 0, capacity: 24, taken: [14, 5, 0] },
  "exp-diner-du-chef": { weekday: 5, hour: 20, minute: 0, capacity: 18, taken: [9, 2, 0] },
  "exp-tajine-conversations": { weekday: 3, hour: 19, minute: 30, capacity: 18, taken: [7, 1, 0] },
  "exp-pizza-inconnus": { weekday: 2, hour: 20, minute: 0, capacity: 24, taken: [10, 4, 0] },
  "exp-diner-gastronomique": { weekday: 6, hour: 20, minute: 30, capacity: 12, taken: [6, 0, 0] },
};
