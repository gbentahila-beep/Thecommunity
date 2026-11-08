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

describe("tableau de bord en ligne / sur place (11e)", () => {
  it("additionne l'encaissé, les remboursements et la part fixe attendue, jamais la consommation", async () => {
    const { summarizeLedger } = await import("./two-part");
    const s = summarizeLedger([
      { status: "attended", seats: 2, paidOnline: 50000, refunded: 0, onSiteAmount: 40000, partnerStatus: "paid_on_site" },
      { status: "confirmed", seats: 1, paidOnline: 25000, refunded: 0, onSiteAmount: 20000, partnerStatus: "due_on_site" },
      { status: "confirmed", seats: 1, paidOnline: 15000, refunded: 0, onSiteAmount: null, partnerStatus: "due_on_site" },
      { status: "refunded", seats: 1, paidOnline: 25000, refunded: 25000, onSiteAmount: 20000, partnerStatus: "due_on_site" },
      { status: "no_show", seats: 1, paidOnline: 25000, refunded: 0, onSiteAmount: 20000, partnerStatus: "due_on_site" },
    ]);
    expect(s).toMatchObject({ reservations: 3, seats: 4, present: 2, noShow: 1, cancelled: 1, paidOnline: 140000, refunded: 25000, netOnline: 115000 });
    expect(s.onSiteExpected).toBe(60000); // annulée et absente exclues, consommation jamais chiffrée
    expect(s.onSitePaid).toBe(40000);
    expect(s.consumptionBookings).toBe(1);
  });
});

describe("économie d'une place sans double comptage (11g)", () => {
  it("prix fixe sur place : la part partenaire n'est pas un coût ; commission facturée à part", async () => {
    const { seatEconomics } = await import("./two-part");
    const e = seatEconomics({ onlineUnit: 25000, model: "fixed_partner", onSiteUnit: 20000, economicsModel: "own", costPerSeat: 3000, onSiteCommissionPercent: 10 });
    expect(e).toMatchObject({ clientPays: 45000, weCollect: 25000, paidOut: 3000, margin: 22000, onSiteCommission: 2000, onSiteCommissionOnConsumption: false });
  });
  it("tout en ligne avec un partenaire : reversement ou commission ; consommation : pas de total inventé", async () => {
    const { seatEconomics } = await import("./two-part");
    expect(seatEconomics({ onlineUnit: 16900, model: "online_only", onSiteUnit: null, economicsModel: "own", costPerSeat: 9500 })).toMatchObject({ clientPays: 16900, paidOut: 9500, margin: 7400, onSiteCommission: null });
    expect(seatEconomics({ onlineUnit: 18000, model: "online_only", onSiteUnit: null, economicsModel: "commission", commissionPercent: 15, onSiteCommissionPercent: 10 })).toMatchObject({ margin: 2700, paidOut: 15300, onSiteCommission: null });
    expect(seatEconomics({ onlineUnit: 12000, model: "variable_consumption", onSiteUnit: null, economicsModel: "own", onSiteCommissionPercent: 8 })).toMatchObject({ clientPays: null, margin: 12000, onSiteCommission: null, onSiteCommissionOnConsumption: true });
  });
});
