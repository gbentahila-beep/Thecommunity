import { describe, expect, it } from "vitest";
import { needsTicket, reservationRequestSchema } from "./booking";
import { answerIssues, type QuestionDef } from "./questionnaire";
import { isSecretVenue, placeLabel, publicExperience } from "./venue";

const secret = {
  district: "Maarif",
  venue: { name: "Dghmira", address: "Rue des princesses", revealPolicy: "on_group_reveal" as const, geo: { lat: 33.5, lng: -7.6 } },
  partnerSnapshot: { name: "Dghmira" },
  pricing: { model: "variable_consumption", partner: { name: "Dghmira", price: null } },
};
const shown = { ...secret, venue: { ...secret.venue, revealPolicy: "immediate" as const } };

describe("lieu secret (docs/22, lot 0)", () => {
  it("retire nom, adresse, coordonnées, quartier et partenaire quand le lieu est secret", () => {
    const p = publicExperience(secret);
    expect(isSecretVenue(secret)).toBe(true);
    expect(p.district).toBe("");
    expect(p.venue).toEqual({ name: "", address: "", revealPolicy: "on_group_reveal", geo: null });
    expect(p.partnerSnapshot).toBeNull();
    expect(p.pricing?.partner?.name).toBe("");
    expect(JSON.stringify(p)).not.toMatch(/Dghmira|princesses|Maarif|33\.5/);
  });

  it("ne change rien quand le lieu est visible dès la réservation", () => {
    expect(publicExperience(shown)).toBe(shown);
    expect(isSecretVenue(shown)).toBe(false);
  });

  it("« Quartier, Ville » sans quartier vide", () => {
    expect(placeLabel("Maarif", "Casablanca")).toBe("Maarif, Casablanca");
    expect(placeLabel("", "Casablanca")).toBe("Casablanca");
    expect(placeLabel(null, "Casablanca")).toBe("Casablanca");
  });
});

describe("billet à QR code (docs/22, lot 0)", () => {
  it("seulement avec une hôtesse ou un organisateur sur place", () => {
    expect(needsTicket({ onSiteHost: true })).toBe(true);
    expect(needsTicket({ onSiteHost: false, organizerId: "org1" })).toBe(true);
    expect(needsTicket({ onSiteHost: false }, { organizerId: "org1" })).toBe(true);
    expect(needsTicket({ onSiteHost: false }, { organizerId: null })).toBe(false);
    expect(needsTicket(null)).toBe(false);
  });
});

describe("questionnaire avant le paiement (docs/22, lot 0)", () => {
  const questions: QuestionDef[] = [
    { id: "qlevel", kind: "ordered", label: { fr: "Niveau ?" }, options: [{ fr: "Débutant" }, { fr: "Confirmé" }], required: true, match: "same" },
    { id: "qside", kind: "choice", label: { fr: "Côté ?" }, options: [{ fr: "Gauche" }, { fr: "Droite" }], required: false, match: "none" },
  ];
  it("la demande de réservation accepte les réponses", () => {
    const ok = reservationRequestSchema.safeParse({ sessionId: "s1", seats: 1, answers: { qlevel: 1 } });
    expect(ok.success).toBe(true);
    expect(reservationRequestSchema.safeParse({ sessionId: "s1", seats: 1, answers: { "bad id": 1 } }).success).toBe(false);
  });
  it("questions obligatoires exigées, facultatives non", () => {
    expect(answerIssues(questions, {})).toEqual([{ id: "qlevel", problem: "required" }]);
    expect(answerIssues(questions, { qlevel: 0 })).toEqual([]);
  });
});
