import type { Organizer } from "@thecommunity/shared";
import type { OrganizerDetails } from "./organizer";

/**
 * Étape 20 — organisateur de démonstration : un club de padel indépendant qui propose « Padel entre inconnus ».
 * Utilisé par l'espace /pro en démonstration et par le jeu de données des émulateurs (compte club@thecommunity.test).
 */
export const DEMO_ORGANIZER_ID = "org-club-padel-anfa";

export const DEMO_ORGANIZER: Organizer = {
  id: DEMO_ORGANIZER_ID,
  name: "Club Padel Anfa",
  slug: "club-padel-anfa",
  description: {
    fr: "Quatre terrains couverts au cœur d'Anfa, des coachs diplômés et des matchs en double pour tous les niveaux. Le club accueille les sessions « Padel entre inconnus » de Wenzy.",
    en: "Four covered courts in the heart of Anfa, qualified coaches and doubles matches for every level. The club hosts Wenzy's “Padel with strangers” sessions.",
    ar: "أربعة ملاعب مغطاة في قلب أنفا، مدربون معتمدون ومباريات زوجية لجميع المستويات.",
  },
  cityId: "casablanca",
  categoryIds: ["move"],
  status: "approved",
  website: "",
  instagram: "",
  ratingAvg: 0,
  ratingCount: 0,
  createdAt: "2026-10-01T09:00:00.000Z",
  isDemo: true,
};

export const DEMO_ORGANIZER_DETAILS: OrganizerDetails = {
  ownerUid: "demo-club",
  memberUids: ["demo-club"],
  contactName: "Nadia Alaoui",
  email: "club@thecommunity.test",
  phone: "+212 5 22 00 00 00",
  address: "Boulevard d'Anfa, Casablanca",
  documents: [{ path: "organizer-uploads/demo-club/documents/registre-commerce.pdf", name: "Registre de commerce.pdf" }],
  terms: { version: "2026-11-20", acceptedAt: "2026-10-01T09:00:00.000Z" },
  decisionMessage: null,
  submittedAt: "2026-10-01T09:00:00.000Z",
  history: [
    { at: "2026-10-01T09:00:00.000Z", by: "demo-club", action: "submitted" },
    { at: "2026-10-02T10:30:00.000Z", by: "demo-admin", action: "approve" },
  ],
};

/** Démonstration du back-office : une demande en attente de validation. */
export const DEMO_PENDING_ORGANIZER: Organizer = {
  id: "org-atelier-terre-feu",
  name: "Atelier Terre & Feu",
  slug: "atelier-terre-feu",
  description: { fr: "Atelier de céramique à Maârif : initiations au tour et au modelage en petit groupe, cuisson comprise, pour débutants comme confirmés." },
  cityId: "casablanca",
  categoryIds: ["create"],
  status: "pending",
  ratingAvg: 0,
  ratingCount: 0,
  createdAt: "2026-11-18T15:20:00.000Z",
  isDemo: true,
};
export const DEMO_PENDING_ORGANIZER_DETAILS: OrganizerDetails = {
  ownerUid: "demo-atelier",
  memberUids: ["demo-atelier"],
  contactName: "Yasmine Tazi",
  email: "atelier@example.com",
  phone: "+212 6 00 00 00 01",
  address: "Rue Ibnou Mounir, Maârif, Casablanca",
  documents: [
    { path: "organizer-uploads/demo-atelier/documents/statut-auto-entrepreneur.pdf", name: "Statut auto-entrepreneur.pdf" },
    { path: "organizer-uploads/demo-atelier/documents/assurance-rc.pdf", name: "Attestation assurance RC.pdf" },
  ],
  terms: { version: "2026-11-20", acceptedAt: "2026-11-18T15:20:00.000Z" },
  decisionMessage: null,
  submittedAt: "2026-11-18T15:20:00.000Z",
  history: [{ at: "2026-11-18T15:20:00.000Z", by: "demo-atelier", action: "submitted" }],
};
