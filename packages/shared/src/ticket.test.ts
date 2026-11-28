import { describe, expect, it } from "vitest";
import { ticketCode, ticketPath, ticketState } from "./ticket";

describe("billet (11d)", () => {
  it("code court lisible, chemin du back-office", () => {
    expect(ticketCode("aB3dE9fG7hJk")).toBe("AB3DE9FG");
    expect(ticketCode("res-0012")).toBe("RES0012");
    expect(ticketPath("aB3")).toBe("/admin/billets/aB3");
  });
  it("état du billet selon la réservation", () => {
    expect(ticketState("confirmed")).toBe("valid");
    expect(ticketState("attended")).toBe("used");
    expect(ticketState("pending_payment")).toBe("pending");
    expect(ticketState("refunded")).toBe("void");
    expect(ticketState("no_show")).toBe("void");
  });
});
