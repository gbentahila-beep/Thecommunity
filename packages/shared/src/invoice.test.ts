import { describe, expect, it } from "vitest";
import { companyReady, counterId, formatInvoiceNumber, invoiceSeries, invoiceYear, linesTotal, reservationLines, splitVat } from "./invoice";

describe("factures", () => {
  it("numérotation continue et lisible", () => {
    expect(formatInvoiceNumber("FA", 2026, 123)).toBe("FA-2026-000123");
    expect(formatInvoiceNumber("TEST-AV", 2027, 1)).toBe("TEST-AV-2027-000001");
    expect(() => formatInvoiceNumber("FA", 2026, 0)).toThrow();
    expect(counterId("FA", 2026)).toBe("FA-2026");
  });
  it("séries : test, reçu sans société, facture réelle", () => {
    expect(invoiceSeries("invoice", { test: true, companyReady: true })).toBe("TEST-FA");
    expect(invoiceSeries("credit_note", { test: false, companyReady: false })).toBe("RA");
    expect(invoiceSeries("invoice", { test: false, companyReady: true })).toBe("FA");
  });
  it("société identifiée seulement avec raison sociale, siège et ICE", () => {
    expect(companyReady(null)).toBe(false);
    expect(companyReady({ legalName: "X SARL", address: "Casablanca", ice: " " })).toBe(false);
    expect(companyReady({ legalName: "X SARL", address: "Casablanca", ice: "001", vatRate: 20 })).toBe(true);
  });
  it("année d'émission (fuseau de Casablanca)", () => {
    expect(invoiceYear(new Date("2026-12-31T12:00:00Z"))).toBe(2026);
    expect(invoiceYear(new Date("2027-01-01T12:00:00Z"))).toBe(2027);
  });
  it("TVA : HT + TVA = TTC, au centime", () => {
    expect(splitVat(16900, 20)).toEqual({ ht: 14083, vat: 2817, ttc: 16900, rate: 20 });
    expect(splitVat(16900, null)).toEqual({ ht: 16900, vat: 0, ttc: 16900, rate: null });
    const s = splitVat(9999, 10);
    expect(s.ht + s.vat).toBe(9999);
  });
  it("lignes d'une réservation avec remise membre", () => {
    const lines = reservationLines({ title: "Dîner", dateLabel: "jeudi 12 novembre", seats: 2, unitAmount: 16900, memberDiscount: 5000 });
    expect(lines).toHaveLength(2);
    expect(linesTotal(lines)).toBe(28800);
  });
});
