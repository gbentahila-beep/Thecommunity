import { describe, expect, it } from "vitest";
import { bankDetailsSchema, formatRib, isTransferReference, normalizeTransferReference, paymentSettingsInputSchema, transferDeadline, transferReference } from "./bank-transfer";

const H = 3_600_000;

describe("virement bancaire (5h)", () => {
  it("référence unique lisible, recherche tolérante", () => {
    let i = 0;
    const ref = transferReference(() => [0, 0.1, 0.3, 0.5, 0.7, 0.99][i++]!);
    expect(isTransferReference(ref)).toBe(true);
    expect(ref).toMatch(/^THC-[2-9A-Z]{6}$/);
    expect(normalizeTransferReference(` thc ${ref.slice(4).toLowerCase()} `)).toBe(ref);
    expect(normalizeTransferReference("THC-0O1IL0")).toBeNull();
    expect(new Set(Array.from({ length: 200 }, () => transferReference())).size).toBeGreaterThan(195);
  });

  it("échéance : 48 h, au plus tard 24 h avant l'expérience ; fermé si trop proche", () => {
    const now = new Date("2026-11-10T10:00:00Z");
    expect(transferDeadline(now, new Date(now.getTime() + 10 * 24 * H))!.getTime()).toBe(now.getTime() + 48 * H);
    expect(transferDeadline(now, new Date(now.getTime() + 40 * H))!.getTime()).toBe(now.getTime() + 16 * H);
    expect(transferDeadline(now, new Date(now.getTime() + 26 * H))).toBeNull(); // 2 h pour virer : trop court
    expect(transferDeadline(now, new Date(now.getTime() + 10 * 24 * H), { deadlineHours: 24 })!.getTime()).toBe(now.getTime() + 24 * H);
  });

  it("coordonnées bancaires : RIB de 24 chiffres exigé pour activer le virement", () => {
    const ok = bankDetailsSchema.parse({ holder: "The Host Club SARL", bank: "Banque X", rib: "011 780 0000123456789012 34", iban: "", swift: "" });
    expect(ok.rib).toHaveLength(24);
    expect(formatRib(ok.rib)).toBe("011 780 0000123456789012 34");
    expect(bankDetailsSchema.safeParse({ holder: "A B", bank: "Banque", rib: "1234" }).success).toBe(false);
    expect(paymentSettingsInputSchema.safeParse({ method: "bank_transfer" }).success).toBe(false);
    expect(paymentSettingsInputSchema.safeParse({ method: "sandbox" }).success).toBe(true);
  });
});
