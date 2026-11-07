import { describe, expect, it } from "vitest";
import { bookingClosesAt, bookingRefusal, computePricing, maxSeatsFor, reservationRequestSchema } from "./booking";

const start = new Date("2026-12-10T19:00:00Z");
const session = { status: "published", startAt: start, capacity: 12, seatsConfirmed: 8, seatsHeld: 2 };
const dinner = { bookingMode: "social_dinner" as const, maxSeatsPerBooking: 1 };
const open = { bookingMode: "open" as const, maxSeatsPerBooking: 4 };

describe("réservation", () => {
  it("calcule le prix en centimes", () => {
    expect(computePricing(35000, 3, "MAD")).toEqual({ unitAmount: 35000, seats: 3, subtotal: 105000, discount: 0, fees: 0, total: 105000, currency: "MAD" });
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
