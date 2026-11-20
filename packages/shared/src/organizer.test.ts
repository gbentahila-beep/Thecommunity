import { describe, expect, it } from "vitest";
import { categoryInputSchema } from "./admin-catalog";
import { CATEGORY_ID_PATTERN } from "./constants";
import { organizerApplicationSchema, organizerDecisionSchema, organizerSlug } from "./organizer";

const application = {
  businessName: "Club Padel Anfa",
  contactName: "Nadia Alaoui",
  email: "nadia@example.com",
  phone: "+212 6 00 00 00 00",
  cityId: "casablanca",
  address: "12 boulevard d'Anfa, Casablanca",
  categoryIds: ["move"],
  description: "Club de padel en plein cœur d'Anfa, quatre terrains couverts, coachs diplômés.",
  documents: [{ path: "organizer-uploads/uid123/documents/rc.pdf", name: "Registre de commerce.pdf" }],
  logoPath: "organizer-uploads/uid123/logo/logo.webp",
  acceptTerms: true,
};

describe("organisateurs (19)", () => {
  it("candidature valide", () => {
    expect(organizerApplicationSchema.safeParse(application).success).toBe(true);
  });
  it("le contrat organisateur doit être accepté", () => {
    expect(organizerApplicationSchema.safeParse({ ...application, acceptTerms: false }).success).toBe(false);
  });
  it("pièces et logo : seulement dans un dossier d'envoi ou le dossier public d'un organisateur", () => {
    expect(organizerApplicationSchema.safeParse({ ...application, documents: [{ path: "experiences/e1/rc.pdf", name: "x" }] }).success).toBe(false);
    expect(organizerApplicationSchema.safeParse({ ...application, documents: [{ path: "organizer-uploads/uid/../x/documents/rc.pdf", name: "x" }] }).success).toBe(false);
    expect(organizerApplicationSchema.safeParse({ ...application, logoPath: "organizers/orgA12/public/logo.webp" }).success).toBe(true);
    expect(organizerApplicationSchema.safeParse({ ...application, logoPath: "users/x/avatar/a.webp" }).success).toBe(false);
  });
  it("1 à 3 catégories", () => {
    expect(organizerApplicationSchema.safeParse({ ...application, categoryIds: [] }).success).toBe(false);
    expect(organizerApplicationSchema.safeParse({ ...application, categoryIds: ["eat", "move", "play", "create"] }).success).toBe(false);
  });
  it("refus, complément ou suspension : un message est obligatoire", () => {
    expect(organizerDecisionSchema.safeParse({ organizerId: "orgA123", decision: "approve" }).success).toBe(true);
    expect(organizerDecisionSchema.safeParse({ organizerId: "orgA123", decision: "reject" }).success).toBe(false);
    expect(organizerDecisionSchema.safeParse({ organizerId: "orgA123", decision: "request_info", message: "Merci d'ajouter l'attestation d'assurance." }).success).toBe(true);
  });
  it("adresse de la page organisateur", () => {
    expect(organizerSlug("Atelier Lumière — Casa")).toBe("atelier-lumiere-casa");
    expect(organizerSlug("  Club  Padel  Anfa! ")).toBe("club-padel-anfa");
  });
});

describe("catégories dynamiques (19)", () => {
  const base = {
    id: "rencontres",
    name: { fr: "Rencontres", ar: "", en: "" },
    shortName: { fr: "Rencontres", ar: "", en: "" },
    description: { fr: "Échanges de langues et clubs de lecture.", ar: "", en: "" },
    order: 6,
    isActive: true,
    defaultBookingMode: "open",
  };
  it("identifiant = adresse web : minuscules, chiffres, tirets", () => {
    expect(CATEGORY_ID_PATTERN.test("eat")).toBe(true);
    expect(CATEGORY_ID_PATTERN.test("culture-et-arts")).toBe(true);
    expect(CATEGORY_ID_PATTERN.test("Culture")).toBe(false);
    expect(CATEGORY_ID_PATTERN.test("a")).toBe(false);
    expect(CATEGORY_ID_PATTERN.test("../x")).toBe(false);
  });
  it("pictogramme par défaut, couleur hexadécimale, image du stockage ou du site", () => {
    const r = categoryInputSchema.safeParse(base);
    expect(r.success && r.data.icon).toBe("sparkles");
    expect(categoryInputSchema.safeParse({ ...base, color: "#3d6b8c", icon: "users", imagePath: "categories/x.webp" }).success).toBe(true);
    expect(categoryInputSchema.safeParse({ ...base, color: "bleu" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...base, icon: "rocket" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...base, imagePath: "https://exemple.com/x.jpg" }).success).toBe(false);
  });
  it("sous-catégorie : la parente est un identifiant valide", () => {
    expect(categoryInputSchema.safeParse({ ...base, id: "padel", parentId: "move" }).success).toBe(true);
    expect(categoryInputSchema.safeParse({ ...base, id: "padel", parentId: "Move!" }).success).toBe(false);
  });
});
