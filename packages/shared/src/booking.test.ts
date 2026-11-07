import { describe, expect, it } from "vitest";
import { bookingClosesAt, bookingRefusal, computePricing, maxSeatsFor, reservationRequestSchema } from "./booking";

const start = new Date("2026-12-10T19:00:00Z");
const session = { status: "published", startAt: start, capacity: 12, seatsConfirmed: 8, seatsHeld: 2 };
const dinner = { bookingMode: "social_dinner" as const, maxSeatsPerBooking: 1 };
const open = { bookingMode: "open" as const, maxSeatsPerBooking: 4 };

describe("réservation", () => {
  it("calcule le prix en centimes", () => {
    expect(computePricing(35000, 3, "MAD")).toEqual({ unitAmount: 35000, seats: 3, subtotal: 105000, memberDiscount: 0, discount: 0, fees: 0, total: 105000, currency: "MAD" });
    expect(computePricing(30000, 2, "MAD", { memberUnitAmount: 25500 })).toMatchObject({ subtotal: 60000, memberDiscount: 9000, total: 51000 });
  });
  it("ferme les dîners 12 h avant, les autres formats 2 h avant", () => {
    expect(bookingClosesAt(start, "social_dinner").toISOString()).toBe("2026-12-10T07:00:00.000Z");
    expect(bookingClosesAt(start, "individual").toISOString()).toBe("2026-12-10T17:00:00.000Z");
  });
  it("accepte une demande valide", () => {
    const now = new Date("2026-12-09T10:00:00Z");
    expect(bookingRefusal(session, dinner, 1, now)).toBeNull();
    expect(bookingRefusal(session, open, 2, now)).toBeNull();
  });
  it("refuse avec la bonne raison", () => {
    const now = new Date("2026-12-09T10:00:00Z");
    expect(bookingRefusal({ ...session, status: "draft" }, dinner, 1, now)).toBe("not_open");
    expect(bookingRefusal(session, dinner, 1, new Date("2026-12-10T08:00:00Z"))).toBe("closed");
    expect(bookingRefusal({ ...session, seatsConfirmed: 10 }, dinner, 1, now)).toBe("full");
    expect(bookingRefusal(session, dinner, 2, now)).toBe("too_many_seats");
    expect(bookingRefusal(session, open, 3, now)).toBe("not_enough_seats");
  });
  it("borne le nombre de places par réservation", () => {
    expect(maxSeatsFor({})).toBe(1);
    expect(maxSeatsFor({ maxSeatsPerBooking: 0 })).toBe(1);
    expect(maxSeatsFor({ maxSeatsPerBooking: 99 })).toBe(20);
  });
  it("valide la demande du navigateur", () => {
    expect(reservationRequestSchema.safeParse({ sessionId: "abc_123", seats: 1 }).success).toBe(true);
    expect(reservationRequestSchema.safeParse({ sessionId: "../x", seats: 1 }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ sessionId: "abc", seats: 0 }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ sessionId: "abc", seats: 1.5 }).success).toBe(false);
  });
});

describe("demandes de participation", () => {
  it("reconnaît un compte Instagram sous plusieurs formes", async () => {
    const { normalizeInstagram } = await import("./booking");
    expect(normalizeInstagram("@Rita.B")).toBe("rita.b");
    expect(normalizeInstagram("rita_b")).toBe("rita_b");
    expect(normalizeInstagram("https://www.instagram.com/rita.b/?hl=fr")).toBe("rita.b");
    expect(normalizeInstagram("instagram.com/rita.b")).toBe("rita.b");
    expect(normalizeInstagram("https://evil.com/rita")).toBeNull();
    expect(normalizeInstagram("rita b")).toBeNull();
    expect(normalizeInstagram("")).toBeNull();
  });
  it("valide la demande : message borné, Instagram facultatif mais valide", async () => {
    const { bookingRequestSchema } = await import("./booking");
    expect(bookingRequestSchema.safeParse({ sessionId: "s1", seats: 1 }).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ sessionId: "s1", seats: 1, message: "Bonjour", instagram: "@rita" }).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ sessionId: "s1", seats: 1, instagram: "pas valide !" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ sessionId: "s1", seats: 1, message: "x".repeat(501) }).success).toBe(false);
  });
});

describe("avis", () => {
  it("présent·e ou confirmé·e après la fin, dans les 60 jours ; jamais absent·e", async () => {
    const { canReview } = await import("./booking");
    const end = "2026-11-10T21:00:00Z";
    const at = (iso: string) => new Date(iso);
    expect(canReview({ status: "attended", sessionSnapshot: { endAt: end } }, at("2026-11-10T20:00:00Z"))).toBe(true);
    expect(canReview({ status: "confirmed", sessionSnapshot: { endAt: end } }, at("2026-11-10T20:00:00Z"))).toBe(false);
    expect(canReview({ status: "confirmed", sessionSnapshot: { endAt: end } }, at("2026-11-11T09:00:00Z"))).toBe(true);
    expect(canReview({ status: "no_show", sessionSnapshot: { endAt: end } }, at("2026-11-11T09:00:00Z"))).toBe(false);
    expect(canReview({ status: "cancelled", sessionSnapshot: { endAt: end } }, at("2026-11-11T09:00:00Z"))).toBe(false);
    expect(canReview({ status: "attended", sessionSnapshot: { endAt: end } }, at("2027-01-20T09:00:00Z"))).toBe(false);
  });
  it("nom public : prénom + initiale", async () => {
    const { publicNameOf } = await import("./booking");
    expect(publicNameOf("Sara", "benali")).toBe("Sara B.");
    expect(publicNameOf("Sara", "")).toBe("Sara");
    expect(publicNameOf("", "")).toBe("Membre");
  });
});
