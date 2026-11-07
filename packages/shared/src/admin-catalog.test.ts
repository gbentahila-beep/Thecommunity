import { describe, expect, it } from "vitest";
import { cityInputSchema, parseDistricts, partnerInputSchema } from "./admin-catalog";

const partner = {
  name: "Studio Lumière", type: "studio", status: "prospect", cityId: "casablanca", district: "Maarif", address: "", contactName: "Yasmine",
  contactEmail: "contact@studio.ma", contactPhone: "+212 6 12 34 56 78", link: "", model: "commission", defaultCommissionPercent: "20", notes: "",
};

describe("back-office : partenaires, villes", () => {
  it("partenaire valide ; commission obligatoire en modèle commission", () => {
    expect(partnerInputSchema.safeParse(partner).success).toBe(true);
    const r = partnerInputSchema.safeParse({ ...partner, defaultCommissionPercent: "0" });
    expect(r.success).toBe(false);
    expect(partnerInputSchema.safeParse({ ...partner, model: "purchase", defaultCommissionPercent: "0" }).success).toBe(true);
  });
  it("e-mail, téléphone et ville contrôlés", () => {
    expect(partnerInputSchema.safeParse({ ...partner, contactEmail: "pas-un-email" }).success).toBe(false);
    expect(partnerInputSchema.safeParse({ ...partner, contactPhone: "06<script>" }).success).toBe(false);
    expect(partnerInputSchema.safeParse({ ...partner, cityId: "Casa Blanca" }).success).toBe(false);
  });
  it("quartiers : un par ligne ou séparés par des virgules, sans doublon", () => {
    expect(parseDistricts("Anfa, Maarif\nGauthier\n\nAnfa")).toEqual(["Anfa", "Maarif", "Gauthier"]);
    expect(cityInputSchema.safeParse({ id: "rabat", nameFr: "Rabat", nameAr: "الرباط", nameEn: "", isActive: false, isComingSoon: true, order: 2, districts: ["Agdal"] }).success).toBe(true);
  });
});
