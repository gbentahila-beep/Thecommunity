import type { Partner } from "./demo-admin";

/**
 * Lieux du SITE D'ESSAI : restaurants connus de Casablanca (adresses publiques vérifiées le 23 novembre 2026),
 * actifs pour tester tout le parcours (attribution, demande au lieu, confirmation, révélation, check-in).
 * Téléphone, WhatsApp et e-mail sont FICTIFS (e-mails en example.com, jamais délivrés) : aucun de ces lieux n'a encore
 * accepté de travailler avec Wenzy, et aucun message ne doit leur parvenir. Créneaux et capacités estimés.
 * Seulement sur le site d'essai (contenu de démonstration), jamais en production.
 */
const evenings = (units: number, days = [1, 2, 3, 4, 5, 6], from = "19:30", to = "21:00") => days.map((weekday) => ({ weekday, from, to, units }));
const NOTE = "Fiche du site d'essai : téléphone, WhatsApp et e-mail fictifs ; créneaux et capacités estimés. Lieu pas encore contacté : avant de travailler pour de vrai, mettre son vrai contact et confirmer ses créneaux.";
const base = { cityId: "casablanca", contactName: "Contact (essai)", defaultCommissionPercent: 0, status: "active" as const, model: "purchase" as const, memberPerk: "", unit: "table" as const, level: "occasional" as const };
/** Coordonnées fictives : numéros de la série +212 600 000 1xx (comme les autres lieux de démonstration), e-mail en example.com. */
const fake = (n: number, id: string) => {
  const phone = `+212 600 000 ${100 + n}`;
  return { contactPhone: phone, whatsapp: phone, contactEmail: `${id}@example.com` };
};

export const CASABLANCA_VENUES: Partner[] = [
  { ...base, ...fake(1, "ricks-cafe"), id: "v-ricks-cafe", name: "Rick's Café", type: "restaurant", district: "Ancienne médina", address: "248 boulevard Sour Jdid, Place du jardin public, Casablanca", link: "",
    tiers: ["exclusive"], formats: ["diner", "afterwork"], unitMin: 4, unitMax: 6, cuisine: "Internationale, piano-bar", cuisineI18n: { ar: "عالمية، بيانو بار", en: "International, piano bar" }, avgBudget: 450, slots: evenings(2), notes: `${NOTE} Maison mythique (décor du film), soirées piano.` },
  { ...base, ...fake(2, "cabestan"), id: "v-cabestan", name: "Le Cabestan", type: "restaurant", district: "Aïn Diab", address: "90 boulevard de la Corniche, Phare d'El Hank, Casablanca", link: "",
    tiers: ["exclusive"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Méditerranéenne, vue sur l'océan", cuisineI18n: { ar: "متوسطية، إطلالة على المحيط", en: "Mediterranean, ocean view" }, avgBudget: 500, slots: evenings(2), notes: `${NOTE} Adresse historique au-dessus de l'océan.` },
  { ...base, ...fake(3, "iloli"), id: "v-iloli", name: "Iloli", type: "restaurant", district: "Gauthier", address: "33 rue Najib Mahfoud, Gauthier, Casablanca", link: "iloli-restaurant.com",
    tiers: ["exclusive"], formats: ["diner"], unitMin: 4, unitMax: 6, cuisine: "Japonaise", cuisineI18n: { ar: "يابانية", en: "Japanese" }, avgBudget: 550, slots: evenings(2, [2, 3, 4, 5, 6]), notes: `${NOTE} Classé parmi les 50 meilleurs restaurants de la région MENA. Jour de fermeture à vérifier (lundi ou dimanche selon les sources).` },
  { ...base, ...fake(4, "rouget-de-lisle"), id: "v-rouget-de-lisle", name: "Le Rouget de l'Isle", type: "restaurant", district: "Quartier des Hôpitaux", address: "16 rue Rouget de l'Isle, Villa Élise, Casablanca", link: "",
    tiers: ["premium", "exclusive"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Française", cuisineI18n: { ar: "فرنسية", en: "French" }, avgBudget: 400, slots: [...evenings(3, [1, 2, 3, 4, 5, 6]), ...evenings(2, [1, 2, 3, 4, 5], "12:30", "13:30")], notes: `${NOTE} Villa Art déco avec jardin. Fermé samedi midi et dimanche (à confirmer).` },
  { ...base, ...fake(5, "al-mounia"), id: "v-al-mounia", name: "Al Mounia", type: "restaurant", district: "Centre-ville", address: "95 rue du Prince Moulay Abdallah, Casablanca", link: "",
    tiers: ["premium"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Marocaine traditionnelle", cuisineI18n: { ar: "مغربية تقليدية", en: "Traditional Moroccan" }, avgBudget: 300, slots: [...evenings(3), ...evenings(2, [1, 2, 3, 4, 5, 6], "12:30", "13:30")], notes: `${NOTE} Cuisine marocaine dans un riad avec jardin.` },
  { ...base, ...fake(6, "la-sqala"), id: "v-la-sqala", name: "La Sqala", type: "restaurant", district: "Ancienne médina", address: "Boulevard des Almohades, Casablanca", link: "",
    tiers: ["premium"], formats: ["brunch", "dejeuner", "cafe"], unitMin: 4, unitMax: 6, cuisine: "Marocaine, brunch beldi", cuisineI18n: { ar: "مغربية، فطور بلدي", en: "Moroccan, beldi brunch" }, avgBudget: 180, slots: [...evenings(3, [0, 6], "11:30", "13:00"), ...evenings(3, [1, 2, 3, 4, 5], "12:30", "13:30"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30")], notes: `${NOTE} Jardin andalou adossé aux remparts ; brunch beldi très demandé le week-end.` },
  { ...base, ...fake(7, "bondi"), id: "v-bondi", name: "Bondi Coffee Kitchen", type: "restaurant", district: "Gauthier", address: "31 rue Sebou, Gauthier, Casablanca", link: "",
    tiers: ["casual", "premium"], formats: ["cafe", "brunch", "soiree-jeux"], unitMin: 4, unitMax: 5, cuisine: "Café de spécialité, brunch", cuisineI18n: { ar: "قهوة مختصة، برانش", en: "Specialty coffee, brunch" }, avgBudget: 120, slots: [...evenings(3, [0, 6], "11:30", "13:00"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30"), ...evenings(2, [2], "19:00", "20:30")], notes: `${NOTE} Ouvert jusqu'à 21 h : soirée jeux possible en début de soirée.` },
  { ...base, ...fake(8, "paul-zevaco"), id: "v-paul-zevaco", name: "Paul, villa Zevaco", type: "restaurant", district: "Anfa", address: "Angle boulevard John F. Kennedy et rue Abdelkrim Khattabi, Anfa, Casablanca", link: "",
    tiers: ["casual"], formats: ["cafe", "brunch", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Boulangerie, brasserie", cuisineI18n: { ar: "مخبزة، براسري", en: "Bakery, brasserie" }, avgBudget: 120, slots: [...evenings(4, [0, 6], "11:30", "13:00"), ...evenings(3, [1, 2, 3, 4, 5], "12:30", "13:30"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30")], notes: `${NOTE} Grande terrasse dans une villa moderniste.` },
  { ...base, ...fake(9, "la-bodega"), id: "v-la-bodega", name: "La Bodega de Casablanca", type: "restaurant", district: "Centre-ville", address: "129 rue Allal Ben Abdellah, Casablanca", link: "",
    tiers: ["casual"], formats: ["diner", "afterwork", "quiz", "echange-langues"], unitMin: 4, unitMax: 6, cuisine: "Tapas espagnoles", cuisineI18n: { ar: "تاباس إسبانية", en: "Spanish tapas" }, avgBudget: 220, slots: evenings(3, [1, 2, 3, 4], "19:00", "21:00"), notes: `${NOTE} Bar à tapas avec concerts presque tous les soirs : afterwork, quiz ou échange de langues en début de soirée.` },
  { ...base, ...fake(10, "petit-rocher"), id: "v-petit-rocher", name: "Le Petit Rocher", type: "restaurant", district: "Aïn Diab", address: "Boulevard de la Corniche, Phare d'El Hank, Casablanca", link: "",
    tiers: ["premium"], formats: ["diner", "afterwork"], unitMin: 4, unitMax: 6, cuisine: "Méditerranéenne, bar à vin", cuisineI18n: { ar: "متوسطية، بار نبيذ", en: "Mediterranean, wine bar" }, avgBudget: 350, slots: evenings(3), notes: `${NOTE} Complexe face à la mer (restaurant, bar à vin, bar à cocktails). Numéro de rue à préciser.` },
  { ...base, ...fake(11, "sky-28"), id: "v-sky-28", name: "Sky 28 (Kenzi Tower)", type: "venue", district: "Maârif", address: "Kenzi Tower Hotel, Twin Center, boulevard Zerktouni, Casablanca", link: "",
    tiers: ["exclusive"], formats: ["afterwork"], unitMin: 4, unitMax: 8, cuisine: "Bar panoramique", cuisineI18n: { ar: "بار بإطلالة بانورامية", en: "Panoramic bar" }, avgBudget: 300, slots: evenings(2, [1, 2, 3, 4], "19:00", "21:00"), notes: `${NOTE} Bar au 28e étage, vue sur toute la ville.` },
  { ...base, ...fake(12, "four-seasons"), id: "v-four-seasons", name: "Four Seasons Casablanca (Bleu)", type: "restaurant", district: "Aïn Diab", address: "Anfa Place, boulevard de la Corniche, Casablanca", link: "",
    tiers: ["exclusive"], formats: ["brunch", "cafe"], unitMin: 4, unitMax: 6, cuisine: "Petit-déjeuner et brunch d'hôtel", cuisineI18n: { ar: "فطور وبرانش فندقي", en: "Hotel breakfast and brunch" }, avgBudget: 450, slots: evenings(2, [5, 6, 0], "10:00", "12:00"), notes: `${NOTE} Hôtel face à l'océan ; brunch du dimanche réputé.` },
];

/**
 * 25/11 — SITE DE DÉMONSTRATION : 180 lieux FICTIFS (noms inventés, coordonnées fictives en example.com) pour que la
 * démonstration ne manque jamais de restaurant, quelle que soit la gamme, le format ou le jour. Jamais en production.
 */
const DEMO_PREFIX = ["Le Comptoir", "La Table", "Maison", "Dar", "Le Patio", "La Terrasse", "Bistrot", "L'Atelier", "Le Jardin", "Café"];
const DEMO_NAMES = ["Atlas", "Zellige", "Safran", "Cèdre", "Jasmin", "Arganier", "Mogador", "Oudaya", "Andalou", "Corniche", "Palmeraie", "Menthe", "Figuier", "Oranger", "Amande", "Indigo", "Sable", "Lanterne"];
const DEMO_DISTRICTS = ["Maarif", "Gauthier", "Racine", "Anfa", "Bourgogne", "CIL", "Palmier", "Oasis", "Ain Diab", "Centre-ville", "Californie", "Belvédère"];
const DEMO_CUISINE: Record<string, [string, string, string][]> = {
  casual: [["Marocaine familiale", "مغربية عائلية", "Moroccan home cooking"], ["Bistrot", "بيسترو", "Bistro"], ["Italienne", "إيطالية", "Italian"], ["Café, pâtisserie", "مقهى، حلويات", "Café, pastries"]],
  premium: [["Méditerranéenne", "متوسطية", "Mediterranean"], ["Fusion", "مطبخ مدمج", "Fusion"], ["Marocaine revisitée", "مغربية مجددة", "Modern Moroccan"], ["Brasserie chic", "براسري أنيقة", "Smart brasserie"]],
  exclusive: [["Gastronomique", "راقية", "Fine dining"], ["Française", "فرنسية", "French"], ["Japonaise", "يابانية", "Japanese"], ["Hôtel, table d'exception", "فندق، مائدة استثنائية", "Hotel fine dining"]],
};
const allDays = [0, 1, 2, 3, 4, 5, 6];
export const DEMO_GENERATED_VENUES: Partner[] = Array.from({ length: 180 }, (_, i) => {
  const tier = (["casual", "premium", "exclusive"] as const)[i % 3];
  const kind = Math.floor(i / 3) % 3; // 0 : restaurant (dîner, déjeuner, brunch), 1 : café (café, brunch), 2 : bar (afterwork, dîner)
  const name = `${DEMO_PREFIX[i % DEMO_PREFIX.length]} ${DEMO_NAMES[Math.floor(i / DEMO_PREFIX.length) % DEMO_NAMES.length]}`;
  const district = DEMO_DISTRICTS[i % DEMO_DISTRICTS.length]!;
  const c = DEMO_CUISINE[tier]![i % 4]!;
  const units = 3 + (i % 4);
  const id = `demo-lieu-${String(i + 1).padStart(3, "0")}`;
  const formats = kind === 0 ? ["diner", "dejeuner", "brunch"] : kind === 1 ? ["cafe", "brunch"] : ["afterwork", "diner"];
  const slots = [
    ...(formats.includes("diner") ? evenings(units, allDays, "19:00", "22:00") : []),
    ...(formats.includes("afterwork") ? evenings(units, [1, 2, 3, 4, 5], "18:00", "20:00") : []),
    ...(formats.includes("dejeuner") ? evenings(units, [1, 2, 3, 4, 5], "12:00", "14:00") : []),
    ...(formats.includes("brunch") ? evenings(units, [0, 6], "11:00", "13:30") : []),
    ...(formats.includes("cafe") ? evenings(units, allDays, "15:00", "18:00") : []),
  ];
  return {
    ...base, ...fake(200 + i, id), id, name: `${name} (démo)`, type: kind === 2 ? "venue" : "restaurant", district,
    address: `${10 + i} rue ${DEMO_NAMES[i % DEMO_NAMES.length]}, ${district}, Casablanca`, link: "",
    tiers: [tier], formats: formats as Partner["formats"], unitMin: 4, unitMax: 6, cuisine: c[0], cuisineI18n: { ar: c[1], en: c[2] },
    avgBudget: tier === "casual" ? 150 : tier === "premium" ? 280 : 500, slots,
    notes: "Lieu fictif du site de démonstration (nom inventé, coordonnées fictives). À supprimer avant de travailler pour de vrai.",
  } as Partner;
});
