import type { CompanyInfo, InvoiceKind, InvoiceLine, InvoiceSeries } from "@thecommunity/shared";

/** Document figé d'une facture / d'un avoir (collection invoices). Les dates sont en ISO 8601. */
export type InvoiceDoc = {
  kind: InvoiceKind;
  series: InvoiceSeries;
  number: string;
  year: number;
  seq: number;
  test: boolean;
  /** Vraie facture (séries FA / AV) ; sinon reçu sans valeur de facture. */
  legal: boolean;
  title: string;
  userId: string;
  paymentId: string;
  purpose: "reservation" | "membership";
  reservationId: string | null;
  relatedInvoiceId?: string;
  relatedInvoiceNumber?: string;
  reasonLabel?: string;
  seller: CompanyInfo | null;
  buyer: { name: string; email: string };
  lines: InvoiceLine[];
  totals: { ht: number; vat: number; ttc: number; rate: number | null };
  currency: string;
  payment: { provider: string; mode: string; at: string };
  issuedAt: string;
  pdfPath: string;
};
