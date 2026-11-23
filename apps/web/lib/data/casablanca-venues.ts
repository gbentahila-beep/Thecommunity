import type { Partner } from "./demo-admin";

/**
 * Lieux à démarcher à Casablanca (fiches préparées par l'équipe, adresses publiques vérifiées le 23 novembre 2026).
 * Statut « prospect » : AUCUN de ces lieux n'a encore accepté de travailler avec Wenzy. Tant qu'une fiche n'est pas
 * passée en « actif », le lieu n'est jamais proposé par l'attribution, ni affiché sur le site, ni contacté
 * automatiquement (pas d'e-mail ni de WhatsApp enregistrés : seul le téléphone public sert à le démarcher).
 * Les créneaux et capacités sont des estimations de départ, à confirmer avec le lieu avant de l'activer.
 */
const evenings = (units: number, days = [1, 2, 3, 4, 5, 6], from = "19:30", to = "21:00") => days.map((weekday) => ({ weekday, from, to, units }));
const NOTE = "À démarcher : pas encore contacté. Créneaux et capacités estimés, à confirmer avant de passer la fiche en « actif ».";
const base = { cityId: "casablanca", contactName: "", contactEmail: "", defaultCommissionPercent: 0, status: "prospect" as const, model: "purchase" as const, whatsapp: "", memberPerk: "", unit: "table" as const, level: "occasional" as const };

export const CASABLANCA_VENUES: Partner[] = [
  { ...base, id: "v-ricks-cafe", name: "Rick's Café", type: "restaurant", district: "Ancienne médina", address: "248 boulevard Sour Jdid, Place du jardin public, Casablanca", contactPhone: "+212 522 27 42 07", link: "",
    tiers: ["exclusive"], formats: ["diner", "afterwork"], unitMin: 4, unitMax: 6, cuisine: "Internationale, piano-bar", avgBudget: 450, slots: evenings(2), notes: `${NOTE} Maison mythique (décor du film), soirées piano.` },
  { ...base, id: "v-cabestan", name: "Le Cabestan", type: "restaurant", district: "Aïn Diab", address: "90 boulevard de la Corniche, Phare d'El Hank, Casablanca", contactPhone: "+212 522 39 11 90", link: "",
    tiers: ["exclusive"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Méditerranéenne, vue sur l'océan", avgBudget: 500, slots: evenings(2), notes: `${NOTE} Adresse historique au-dessus de l'océan.` },
  { ...base, id: "v-iloli", name: "Iloli", type: "restaurant", district: "Gauthier", address: "33 rue Najib Mahfoud, Gauthier, Casablanca", contactPhone: "+212 608 86 66 33", link: "iloli-restaurant.com",
    tiers: ["exclusive"], formats: ["diner"], unitMin: 4, unitMax: 6, cuisine: "Japonaise", avgBudget: 550, slots: evenings(2, [2, 3, 4, 5, 6]), notes: `${NOTE} Classé parmi les 50 meilleurs restaurants de la région MENA. Jour de fermeture à vérifier (lundi ou dimanche selon les sources).` },
  { ...base, id: "v-rouget-de-lisle", name: "Le Rouget de l'Isle", type: "restaurant", district: "Quartier des Hôpitaux", address: "16 rue Rouget de l'Isle, Villa Élise, Casablanca", contactPhone: "+212 522 29 47 40", link: "",
    tiers: ["premium", "exclusive"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Française", avgBudget: 400, slots: [...evenings(3, [1, 2, 3, 4, 5, 6]), ...evenings(2, [1, 2, 3, 4, 5], "12:30", "13:30")], notes: `${NOTE} Villa Art déco avec jardin. Fermé samedi midi et dimanche (à confirmer).` },
  { ...base, id: "v-al-mounia", name: "Al Mounia", type: "restaurant", district: "Centre-ville", address: "95 rue du Prince Moulay Abdallah, Casablanca", contactPhone: "+212 522 22 26 69", link: "",
    tiers: ["premium"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Marocaine traditionnelle", avgBudget: 300, slots: [...evenings(3), ...evenings(2, [1, 2, 3, 4, 5, 6], "12:30", "13:30")], notes: `${NOTE} Cuisine marocaine dans un riad avec jardin.` },
  { ...base, id: "v-la-sqala", name: "La Sqala", type: "restaurant", district: "Ancienne médina", address: "Boulevard des Almohades, Casablanca", contactPhone: "+212 522 26 09 60", link: "",
    tiers: ["premium"], formats: ["brunch", "dejeuner", "cafe"], unitMin: 4, unitMax: 6, cuisine: "Marocaine, brunch beldi", avgBudget: 180, slots: [...evenings(3, [0, 6], "10:30", "12:00"), ...evenings(3, [1, 2, 3, 4, 5], "12:30", "13:30"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30")], notes: `${NOTE} Jardin andalou adossé aux remparts ; brunch beldi très demandé le week-end.` },
  { ...base, id: "v-bondi", name: "Bondi Coffee Kitchen", type: "restaurant", district: "Gauthier", address: "31 rue Sebou, Gauthier, Casablanca", contactPhone: "", link: "",
    tiers: ["casual", "premium"], formats: ["cafe", "brunch"], unitMin: 4, unitMax: 5, cuisine: "Café de spécialité, brunch", avgBudget: 120, slots: [...evenings(3, [0, 6], "10:30", "12:00"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30")], notes: `${NOTE} Téléphone à vérifier (deux numéros différents selon les sources).` },
  { ...base, id: "v-paul-zevaco", name: "Paul, villa Zevaco", type: "restaurant", district: "Anfa", address: "Angle boulevard John F. Kennedy et rue Abdelkrim Khattabi, Anfa, Casablanca", contactPhone: "", link: "",
    tiers: ["casual"], formats: ["cafe", "brunch", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Boulangerie, brasserie", avgBudget: 120, slots: [...evenings(4, [0, 6], "10:30", "12:00"), ...evenings(3, [1, 2, 3, 4, 5], "12:30", "13:30"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30")], notes: `${NOTE} Grande terrasse dans une villa moderniste.` },
  { ...base, id: "v-la-bodega", name: "La Bodega de Casablanca", type: "restaurant", district: "Centre-ville", address: "129 rue Allal Ben Abdellah, Casablanca", contactPhone: "+212 522 54 18 42", link: "",
    tiers: ["casual"], formats: ["diner", "afterwork", "quiz", "echange-langues"], unitMin: 4, unitMax: 6, cuisine: "Tapas espagnoles", avgBudget: 220, slots: evenings(3, [1, 2, 3, 4], "19:00", "21:00"), notes: `${NOTE} Bar à tapas avec concerts presque tous les soirs : afterwork, quiz ou échange de langues en début de soirée.` },
  { ...base, id: "v-petit-rocher", name: "Le Petit Rocher", type: "restaurant", district: "Aïn Diab", address: "Boulevard de la Corniche, Phare d'El Hank, Casablanca", contactPhone: "+212 522 36 26 26", link: "",
    tiers: ["premium"], formats: ["diner", "afterwork"], unitMin: 4, unitMax: 6, cuisine: "Méditerranéenne, bar à vin", avgBudget: 350, slots: evenings(3), notes: `${NOTE} Complexe face à la mer (restaurant, bar à vin, bar à cocktails). Numéro de rue à préciser.` },
  { ...base, id: "v-sky-28", name: "Sky 28 (Kenzi Tower)", type: "venue", district: "Maârif", address: "Kenzi Tower Hotel, Twin Center, boulevard Zerktouni, Casablanca", contactPhone: "+212 522 97 80 00", link: "",
    tiers: ["exclusive"], formats: ["afterwork"], unitMin: 4, unitMax: 8, cuisine: "Bar panoramique", avgBudget: 300, slots: evenings(2, [1, 2, 3, 4], "19:00", "21:00"), notes: `${NOTE} Bar au 28e étage, vue sur toute la ville.` },
];
