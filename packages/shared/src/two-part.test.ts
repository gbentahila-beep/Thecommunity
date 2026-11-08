import { describe, expect, it } from "vitest";
import { experienceInputSchema } from "./experience-input";
import { initialPartnerStatus, onSiteAmount, partnerSnapshotOf, priceSplit, pricingOf, type ExperiencePricing } from "./two-part";

const fixed: ExperiencePricing = { model: "fixed_partner", currency: "MAD", partner: { name: "Escape Room Maarif", paymentMode: "on_site", pricingType: "fixed", price: { amount: 20000, currency: "MAD" }, description: "La partie d'escape game" } };
const variable: ExperiencePricing = { model: "variable_consumption", currency: "MAD", partner: { name: "Café Gauthier", paymentMode: "on_site", pricingType: "consumption", price: null, description: "" } };

describe("tarification en deux parts (11)", () => {
  it("une ancienne expérience sans pricing est « tout en ligne »", () => {
    expect(pricingOf({ price: { currency: "MAD" } })).toEqual({ model: "online_only", currency: "MAD", partner: null });
    expect(priceSplit(16900, pricingOf({}))).toMatchObject({ onlineUnit: 16900, onSiteUnit: null, totalUnit: 16900, variable: false });
  });
  it("prix fixe : 250 en ligne + 200 sur place = 450", () => {
    expect(priceSplit(25000, fixed)).toMatchObject({ onlineUnit: 25000, onSiteUnit: 20000, totalUnit: 45000, partnerName: "Escape Room Maarif" });
    expect(onSiteAmount(fixed, 2)).toBe(40000);
    expect(initialPartnerStatus(fixed)).toBe("due_on_site");
  });
  it("consommation libre : jamais de faux total, montant sur place inconnu (null)", () => {
    expect(priceSplit(15000, variable)).toMatchObject({ onlineUnit: 15000, onSiteUnit: null, totalUnit: null, variable: true });
    expect(onSiteAmount(variable, 3)).toBeNull();
    expect(partnerSnapshotOf(variable)).toMatchObject({ model: "variable_consumption", price: null });
  });
  it("le prix membre ne touche que la part en ligne", () => {
    expect(priceSplit(21250, fixed).totalUnit).toBe(41250); // 250 DH − 15 % = 212,50 DH + 200 DH
  });
  it("formulaire : un partenaire est obligatoire pour les parts sur place ; prix fixe obligatoire en formule A", () => {
    const base = { titleFr: "Escape game entre inconnus", summaryFr: "Une partie en équipe pour faire connaissance.", descriptionFr: "Une partie d'escape game en équipe, pensée pour faire connaissance autour d'un défi commun.", categoryId: "play", cityId: "casablanca", district: "Maarif", venueName: "Escape Room", address: "1 rue X, Casablanca", revealPolicy: "immediate", durationMinutes: 90, bookingMode: "group", groupMin: 4, groupTarget: 5, groupMax: 6, maxSeatsPerBooking: 2, admission: "direct", priceDh: 250, languages: ["fr"], membersOnly: false, alcoholServed: false, requestMessageRequired: false, cancellationPolicyId: "standard-48h", economicsModel: "own", costPerSeatDh: 0, status: "draft", sessions: { firstDate: "2030-01-10", time: "19:00", weeks: 1, capacity: 12 } };
    const r1 = experienceInputSchema.safeParse({ ...base, pricingModel: "fixed_partner" });
    expect(r1.success).toBe(false);
    expect(r1.error?.issues.map((i) => i.message)).toEqual(expect.arrayContaining(["pricingNeedsPartner", "required"]));
    expect(experienceInputSchema.safeParse({ ...base, pricingModel: "fixed_partner", partnerId: "p1", partnerPriceDh: 200 }).success).toBe(true);
    const old = experienceInputSchema.safeParse(base);
    expect(old.success && old.data.pricingModel).toBe("online_only");
  });
});
