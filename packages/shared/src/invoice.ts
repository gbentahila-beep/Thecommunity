/**
 * Factures et avoirs (5c) — règles pures, partagées par le serveur (émission) et l'interface (affichage).
 * Les montants sont en centimes. La numérotation est attribuée par le serveur, dans une transaction.
 */
import { MOROCCO_TIMEZONE } from "./constants";

export type InvoiceKind = "invoice" | "credit_note";
/**
 * Série de numérotation :
 * - FA / AV : factures et avoirs réels (paiement réel ET société renseignée) ;
 * - RE / RA : reçus (paiement réel mais société pas encore renseignée — sans valeur de facture) ;
 * - TEST-FA / TEST-AV : paiements de test (bac à sable), jamais mélangés aux séries réelles.
 */
export type InvoiceSeries = "FA" | "AV" | "RE" | "RA" | "TEST-FA" | "TEST-AV";

/** Informations de la société émettrice (Paramètres → Société, super-admin). */
export type CompanyInfo = {
  legalName: string;
  address: string;
  ice: string;
  if?: string;
  rc?: string;
  email?: string;
  /** Taux de TVA en % appliqué aux montants TTC ; null = mention « TVA : à confirmer ». */
  vatRate: number | null;
};

/** Une facture ne peut être légale que si la société est identifiée (raison sociale, siège, ICE). */
export function companyReady(c: Partial<CompanyInfo> | null | undefined): c is CompanyInfo {
  return Boolean(c && c.legalName?.trim() && c.address?.trim() && c.ice?.trim());
}

export function invoiceSeries(kind: InvoiceKind, o: { test: boolean; companyReady: boolean }): InvoiceSeries {
  if (o.test) return kind === "invoice" ? "TEST-FA" : "TEST-AV";
  if (!o.companyReady) return kind === "invoice" ? "RE" : "RA";
  return kind === "invoice" ? "FA" : "AV";
}

/** Année d'émission à l'heure marocaine (une facture du 31 décembre à 23 h 30 appartient à cette année-là). */
export function invoiceYear(at: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: MOROCCO_TIMEZONE, year: "numeric" }).format(at));
}

/** Identifiant du compteur d'une série pour une année (document counters/{id}). */
export const counterId = (series: InvoiceSeries, year: number) => `${series}-${year}`;

/** « FA-2026-000123 » */
export function formatInvoiceNumber(series: InvoiceSeries, year: number, seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) throw new Error("Numéro de séquence invalide");
  return `${series}-${year}-${String(seq).padStart(6, "0")}`;
}

/** Sépare un montant TTC en HT + TVA (arrondi au centime, la TVA absorbe l'arrondi pour que HT + TVA = TTC). */
export function splitVat(totalTtc: number, ratePercent: number | null): { ht: number; vat: number; ttc: number; rate: number | null } {
  if (ratePercent == null || ratePercent <= 0) return { ht: totalTtc, vat: 0, ttc: totalTtc, rate: ratePercent ?? null };
  const ht = Math.round(totalTtc / (1 + ratePercent / 100));
  return { ht, vat: totalTtc - ht, ttc: totalTtc, rate: ratePercent };
}

/** Titre du document selon sa série. */
export function documentTitle(series: InvoiceSeries): { fr: string; en: string } {
  switch (series) {
    case "FA": return { fr: "Facture", en: "Invoice" };
    case "AV": return { fr: "Avoir", en: "Credit note" };
    case "RE": return { fr: "Reçu — projet d'essai (sans valeur de facture)", en: "Receipt — trial project (not an invoice)" };
    case "RA": return { fr: "Reçu de remboursement — projet d'essai", en: "Refund receipt — trial project" };
    case "TEST-FA": return { fr: "Reçu de TEST — aucun paiement réel", en: "TEST receipt — no real payment" };
    case "TEST-AV": return { fr: "Reçu de remboursement de TEST", en: "TEST refund receipt" };
  }
}

export type InvoiceLine = { label: string; detail?: string; quantity: number; unitAmount: number; amount: number };

/** Lignes d'une réservation : places au prix public, puis remise membre éventuelle (montants TTC). */
export function reservationLines(o: {
  title: string;
  dateLabel: string;
  seats: number;
  unitAmount: number;
  memberDiscount: number;
  discount?: number;
  promoCode?: string;
  fees?: number;
}): InvoiceLine[] {
  const lines: InvoiceLine[] = [{ label: o.title, detail: o.dateLabel, quantity: o.seats, unitAmount: o.unitAmount, amount: o.unitAmount * o.seats }];
  if (o.memberDiscount > 0) lines.push({ label: "Remise membre", quantity: 1, unitAmount: -o.memberDiscount, amount: -o.memberDiscount });
  if (o.discount && o.discount > 0) lines.push({ label: o.promoCode ? `Code promo ${o.promoCode}` : "Remise", quantity: 1, unitAmount: -o.discount, amount: -o.discount });
  if (o.fees && o.fees > 0) lines.push({ label: "Frais de service", quantity: 1, unitAmount: o.fees, amount: o.fees });
  return lines;
}

export const linesTotal = (lines: InvoiceLine[]) => lines.reduce((a, l) => a + l.amount, 0);
