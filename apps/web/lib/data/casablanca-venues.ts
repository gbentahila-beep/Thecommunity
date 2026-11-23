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
    tiers: ["exclusive"], formats: ["diner", "afterwork"], unitMin: 4, unitMax: 6, cuisine: "Internationale, piano-bar", avgBudget: 450, slots: evenings(2), notes: `${NOTE} Maison mythique (décor du film), soirées piano.` },
  { ...base, ...fake(2, "cabestan"), id: "v-cabestan", name: "Le Cabestan", type: "restaurant", district: "Aïn Diab", address: "90 boulevard de la Corniche, Phare d'El Hank, Casablanca", link: "",
    tiers: ["exclusive"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Méditerranéenne, vue sur l'océan", avgBudget: 500, slots: evenings(2), notes: `${NOTE} Adresse historique au-dessus de l'océan.` },
  { ...base, ...fake(3, "iloli"), id: "v-iloli", name: "Iloli", type: "restaurant", district: "Gauthier", address: "33 rue Najib Mahfoud, Gauthier, Casablanca", link: "iloli-restaurant.com",
    tiers: ["exclusive"], formats: ["diner"], unitMin: 4, unitMax: 6, cuisine: "Japonaise", avgBudget: 550, slots: evenings(2, [2, 3, 4, 5, 6]), notes: `${NOTE} Classé parmi les 50 meilleurs restaurants de la région MENA. Jour de fermeture à vérifier (lundi ou dimanche selon les sources).` },
  { ...base, ...fake(4, "rouget-de-lisle"), id: "v-rouget-de-lisle", name: "Le Rouget de l'Isle", type: "restaurant", district: "Quartier des Hôpitaux", address: "16 rue Rouget de l'Isle, Villa Élise, Casablanca", link: "",
    tiers: ["premium", "exclusive"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Française", avgBudget: 400, slots: [...evenings(3, [1, 2, 3, 4, 5, 6]), ...evenings(2, [1, 2, 3, 4, 5], "12:30", "13:30")], notes: `${NOTE} Villa Art déco avec jardin. Fermé samedi midi et dimanche (à confirmer).` },
  { ...base, ...fake(5, "al-mounia"), id: "v-al-mounia", name: "Al Mounia", type: "restaurant", district: "Centre-ville", address: "95 rue du Prince Moulay Abdallah, Casablanca", link: "",
    tiers: ["premium"], formats: ["diner", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Marocaine traditionnelle", avgBudget: 300, slots: [...evenings(3), ...evenings(2, [1, 2, 3, 4, 5, 6], "12:30", "13:30")], notes: `${NOTE} Cuisine marocaine dans un riad avec jardin.` },
  { ...base, ...fake(6, "la-sqala"), id: "v-la-sqala", name: "La Sqala", type: "restaurant", district: "Ancienne médina", address: "Boulevard des Almohades, Casablanca", link: "",
    tiers: ["premium"], formats: ["brunch", "dejeuner", "cafe"], unitMin: 4, unitMax: 6, cuisine: "Marocaine, brunch beldi", avgBudget: 180, slots: [...evenings(3, [0, 6], "10:30", "12:00"), ...evenings(3, [1, 2, 3, 4, 5], "12:30", "13:30"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30")], notes: `${NOTE} Jardin andalou adossé aux remparts ; brunch beldi très demandé le week-end.` },
  { ...base, ...fake(7, "bondi"), id: "v-bondi", name: "Bondi Coffee Kitchen", type: "restaurant", district: "Gauthier", address: "31 rue Sebou, Gauthier, Casablanca", link: "",
    tiers: ["casual", "premium"], formats: ["cafe", "brunch", "soiree-jeux"], unitMin: 4, unitMax: 5, cuisine: "Café de spécialité, brunch", avgBudget: 120, slots: [...evenings(3, [0, 6], "10:30", "12:00"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30"), ...evenings(2, [2], "19:00", "20:30")], notes: `${NOTE} Ouvert jusqu'à 21 h : soirée jeux possible en début de soirée.` },
  { ...base, ...fake(8, "paul-zevaco"), id: "v-paul-zevaco", name: "Paul, villa Zevaco", type: "restaurant", district: "Anfa", address: "Angle boulevard John F. Kennedy et rue Abdelkrim Khattabi, Anfa, Casablanca", link: "",
    tiers: ["casual"], formats: ["cafe", "brunch", "dejeuner"], unitMin: 4, unitMax: 6, cuisine: "Boulangerie, brasserie", avgBudget: 120, slots: [...evenings(4, [0, 6], "10:30", "12:00"), ...evenings(3, [1, 2, 3, 4, 5], "12:30", "13:30"), ...evenings(3, [1, 2, 3, 4, 5, 6, 0], "16:00", "17:30")], notes: `${NOTE} Grande terrasse dans une villa moderniste.` },
  { ...base, ...fake(9, "la-bodega"), id: "v-la-bodega", name: "La Bodega de Casablanca", type: "restaurant", district: "Centre-ville", address: "129 rue Allal Ben Abdellah, Casablanca", link: "",
    tiers: ["casual"], formats: ["diner", "afterwork", "quiz", "echange-langues"], unitMin: 4, unitMax: 6, cuisine: "Tapas espagnoles", avgBudget: 220, slots: evenings(3, [1, 2, 3, 4], "19:00", "21:00"), notes: `${NOTE} Bar à tapas avec concerts presque tous les soirs : afterwork, quiz ou échange de langues en début de soirée.` },
  { ...base, ...fake(10, "petit-rocher"), id: "v-petit-rocher", name: "Le Petit Rocher", type: "restaurant", district: "Aïn Diab", address: "Boulevard de la Corniche, Phare d'El Hank, Casablanca", link: "",
    tiers: ["premium"], formats: ["diner", "afterwork"], unitMin: 4, unitMax: 6, cuisine: "Méditerranéenne, bar à vin", avgBudget: 350, slots: evenings(3), notes: `${NOTE} Complexe face à la mer (restaurant, bar à vin, bar à cocktails). Numéro de rue à préciser.` },
  { ...base, ...fake(11, "sky-28"), id: "v-sky-28", name: "Sky 28 (Kenzi Tower)", type: "venue", district: "Maârif", address: "Kenzi Tower Hotel, Twin Center, boulevard Zerktouni, Casablanca", link: "",
    tiers: ["exclusive"], formats: ["afterwork"], unitMin: 4, unitMax: 8, cuisine: "Bar panoramique", avgBudget: 300, slots: evenings(2, [1, 2, 3, 4], "19:00", "21:00"), notes: `${NOTE} Bar au 28e étage, vue sur toute la ville.` },
  { ...base, ...fake(12, "four-seasons"), id: "v-four-seasons", name: "Four Seasons Casablanca (Bleu)", type: "restaurant", district: "Aïn Diab", address: "Anfa Place, boulevard de la Corniche, Casablanca", link: "",
    tiers: ["exclusive"], formats: ["brunch", "cafe"], unitMin: 4, unitMax: 6, cuisine: "Petit-déjeuner et brunch d'hôtel", avgBudget: 450, slots: evenings(2, [0, 6], "10:00", "12:00"), notes: `${NOTE} Hôtel face à l'océan ; brunch du dimanche réputé.` },
];
