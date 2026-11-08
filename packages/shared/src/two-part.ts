/**
 * Étape 11 — tarification en deux parts.
 * - Part organisation : le prix de l'expérience (`price`), payé en ligne. Seule cette part reçoit le prix membre,
 *   l'abonnement, les codes promo et les frais de service.
 * - Part partenaire : réglée sur place, directement au partenaire (jamais encaissée par The Host Club) :
 *   prix fixe connu, ou consommation libre (montant inconnu → null, jamais 0).
 * - « Tout en ligne » : aucune part sur place (toutes les expériences antérieures à l'étape 11).
 * Montants en centimes, comme le reste du site.
 */
import type { CurrencyCode } from "./types";

export const PRICING_MODELS = ["online_only", "fixed_partner", "variable_consumption"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export type PartnerPart = {
  name: string;
  paymentMode: "on_site";
  pricingType: "fixed" | "consumption";
  /** Prix fixe par place (centimes), ou null pour une consommation libre. */
  price: { amount: number; currency: CurrencyCode } | null;
  description: string;
};

export type ExperiencePricing = { model: PricingModel; currency: CurrencyCode; partner: PartnerPart | null };

export type PartnerPaymentStatus = "not_applicable" | "due_on_site" | "paid_on_site";

/** Copie figée de la part partenaire, enregistrée dans chaque réservation. */
export type PartnerSnapshot = PartnerPart & { model: PricingModel };

/** Lecture rétrocompatible : une expérience sans `pricing` est « tout en ligne ». */
export function pricingOf(e: { pricing?: ExperiencePricing | null; price?: { currency: CurrencyCode } }): ExperiencePricing {
  const p = e.pricing;
  if (p && PRICING_MODELS.includes(p.model)) {
    if (p.model === "online_only" || !p.partner) return { model: "online_only", currency: p.currency ?? "MAD", partner: null };
    return p;
  }
  return { model: "online_only", currency: e.price?.currency ?? "MAD", partner: null };
}

/** Ce que voit le client pour une place : part en ligne, part sur place (ou null), total connu (ou null). */
export function priceSplit(onlineUnit: number, p: ExperiencePricing) {
  const onSiteUnit = p.model === "fixed_partner" ? (p.partner?.price?.amount ?? null) : null;
  const totalUnit = p.model === "variable_consumption" ? null : onlineUnit + (onSiteUnit ?? 0);
  return {
    model: p.model,
    onlineUnit,
    onSiteUnit,
    totalUnit,
    variable: p.model === "variable_consumption",
    partnerName: p.partner?.name ?? null,
    description: p.partner?.description ?? "",
  };
}

/** Montant attendu sur place pour une réservation (prix fixe × places), ou null (consommation libre / sans objet). */
export function onSiteAmount(p: ExperiencePricing, seats: number): number | null {
  if (p.model !== "fixed_partner" || !p.partner?.price) return null;
  return p.partner.price.amount * seats;
}

export function initialPartnerStatus(p: ExperiencePricing): PartnerPaymentStatus {
  return p.model === "online_only" ? "not_applicable" : "due_on_site";
}

export function partnerSnapshotOf(p: ExperiencePricing): PartnerSnapshot | null {
  return p.model === "online_only" || !p.partner ? null : { ...p.partner, model: p.model };
}

/** Ligne de suivi (11e) : une réservation, vue du tableau de bord en ligne / sur place. */
export type TwoPartLedgerRow = {
  status: string;
  seats: number;
  /** Encaissé en ligne (centimes, paiements réussis, avant remboursement). */
  paidOnline: number;
  /** Remboursé (centimes). */
  refunded: number;
  /** Part sur place attendue (prix fixe × places) ; null = consommation libre ou sans objet. */
  onSiteAmount: number | null;
  partnerStatus: "due_on_site" | "paid_on_site" | null;
};

/**
 * Totaux du tableau de bord. La part sur place attendue ne compte que les prix fixes des réservations
 * valables (confirmées ou présentes) : jamais de montant inventé pour une consommation libre.
 */
export function summarizeLedger(rows: TwoPartLedgerRow[]) {
  const valid = rows.filter((r) => r.status === "confirmed" || r.status === "attended");
  const fixed = valid.filter((r) => r.onSiteAmount != null);
  return {
    reservations: valid.length,
    seats: valid.reduce((a, r) => a + r.seats, 0),
    present: rows.filter((r) => r.status === "attended").reduce((a, r) => a + r.seats, 0),
    noShow: rows.filter((r) => r.status === "no_show").reduce((a, r) => a + r.seats, 0),
    cancelled: rows.filter((r) => r.status === "cancelled" || r.status === "refunded").length,
    paidOnline: rows.reduce((a, r) => a + r.paidOnline, 0),
    refunded: rows.reduce((a, r) => a + r.refunded, 0),
    netOnline: rows.reduce((a, r) => a + r.paidOnline - r.refunded, 0),
    onSiteExpected: fixed.reduce((a, r) => a + (r.onSiteAmount ?? 0), 0),
    onSitePaid: fixed.filter((r) => r.partnerStatus === "paid_on_site").reduce((a, r) => a + (r.onSiteAmount ?? 0), 0),
    consumptionBookings: valid.filter((r) => r.partnerStatus && r.onSiteAmount == null).length,
  };
}

/**
 * 11g — ce que rapporte une place, sans jamais compter la part réglée sur place comme un coût :
 * - nous encaissons la part en ligne (prix public, avant remises) ;
 * - « own » : nos coûts (ou ce que nous reversons au partenaire) sont déduits ; « commission » : nous gardons le pourcentage ;
 * - une commission sur la part sur place se facture au partenaire, hors site (chiffrée seulement pour un prix fixe).
 */
export function seatEconomics(o: {
  onlineUnit: number;
  model: PricingModel;
  onSiteUnit: number | null;
  economicsModel: "own" | "commission";
  costPerSeat?: number;
  commissionPercent?: number;
  onSiteCommissionPercent?: number;
}) {
  const onSite = o.model === "fixed_partner" ? o.onSiteUnit : null;
  const margin = o.economicsModel === "commission" ? Math.round((o.onlineUnit * (o.commissionPercent ?? 0)) / 100) : o.onlineUnit - (o.costPerSeat ?? 0);
  const pct = o.model === "online_only" ? 0 : (o.onSiteCommissionPercent ?? 0);
  return {
    /** Total payé par le client pour une place (null : consommation libre, inconnue). */
    clientPays: o.model === "variable_consumption" ? null : o.onlineUnit + (onSite ?? 0),
    onSiteUnit: onSite,
    weCollect: o.onlineUnit,
    /** Nos coûts, ou ce qui est reversé au partenaire. */
    paidOut: o.onlineUnit - margin,
    margin,
    /** Commission à facturer au partenaire sur la part sur place (prix fixe), ou null. */
    onSiteCommission: onSite != null && pct > 0 ? Math.round((onSite * pct) / 100) : null,
    onSiteCommissionOnConsumption: o.model === "variable_consumption" && pct > 0,
  };
}
