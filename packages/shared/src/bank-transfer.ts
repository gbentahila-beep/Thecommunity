/**
 * Étape 5h, phase 1 — paiement par virement bancaire.
 * - Chaque paiement reçoit une référence unique (« THC-7K4PQ2 ») à indiquer en motif du virement.
 * - La place est bloquée jusqu'à l'échéance : 48 h après la demande, et au plus tard 24 h avant l'expérience.
 * - L'équipe valide « Virement reçu » dans le back-office → réservation confirmée, billet, facture.
 * - The Host Club ne conserve aucune coordonnée bancaire de client (un remboursement se fait hors site).
 */
import { z } from "zod";

export const TRANSFER_DEADLINE_HOURS = 48;
export const TRANSFER_CUTOFF_HOURS = 24;
/** En dessous de ce délai avant l'échéance, un virement n'a pas le temps d'arriver : réservation par virement fermée. */
export const TRANSFER_MIN_HOURS = 4;
/** Abonnement payé par virement : échéance indicative (aucune place à libérer). */
export const MEMBERSHIP_TRANSFER_DAYS = 7;

/** Alphabet sans caractères ambigus (pas de 0/O, 1/I/L). */
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function transferReference(random: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length)];
  return `THC-${s}`;
}

export function isTransferReference(s: string): boolean {
  return new RegExp(`^THC-[${REF_ALPHABET}]{6}$`).test(s);
}

/** Recherche tolérante : « thc 7k4pq2 », « 7K4PQ2 »… → « THC-7K4PQ2 » (ou null). */
export function normalizeTransferReference(s: string): string | null {
  const raw = s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^THC/, "");
  const ref = `THC-${raw}`;
  return isTransferReference(ref) ? ref : null;
}

/**
 * Échéance du virement pour une réservation : min(maintenant + délai, début − limite).
 * null si l'échéance tomberait trop tôt pour qu'un virement arrive (date trop proche).
 */
export function transferDeadline(now: Date, startAt: Date, o: { deadlineHours?: number; cutoffHours?: number } = {}): Date | null {
  const byDelay = now.getTime() + (o.deadlineHours ?? TRANSFER_DEADLINE_HOURS) * 3_600_000;
  const byStart = startAt.getTime() - (o.cutoffHours ?? TRANSFER_CUTOFF_HOURS) * 3_600_000;
  const at = Math.min(byDelay, byStart);
  return at - now.getTime() < TRANSFER_MIN_HOURS * 3_600_000 ? null : new Date(at);
}

const digits = (s: string) => s.replace(/[\s.-]/g, "");

/** Coordonnées bancaires de The Host Club (saisies par un super-admin, affichées au client qui paie par virement). */
export const bankDetailsSchema = z.object({
  holder: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  bank: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  rib: z
    .string()
    .transform(digits)
    .refine((v) => /^\d{24}$/.test(v), "ribFormat"),
  iban: z
    .string()
    .transform((v) => v.replace(/\s/g, "").toUpperCase())
    .refine((v) => v === "" || /^MA\d{26}$/.test(v), "ibanFormat")
    .default(""),
  swift: z
    .string()
    .transform((v) => v.replace(/\s/g, "").toUpperCase())
    .refine((v) => v === "" || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v), "swiftFormat")
    .default(""),
  deadlineHours: z.coerce.number().int().min(12, "min12").max(120, "max120").default(TRANSFER_DEADLINE_HOURS),
  cutoffHours: z.coerce.number().int().min(12, "min12").max(72, "max72").default(TRANSFER_CUTOFF_HOURS),
});
export type BankDetails = z.infer<typeof bankDetailsSchema>;

/** Réglage du paiement : test (aucun argent) ou virement bancaire (exige des coordonnées complètes). */
export const paymentSettingsInputSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("sandbox") }),
  z.object({ method: z.literal("bank_transfer"), bank: bankDetailsSchema }),
]);
export type PaymentSettingsInput = z.infer<typeof paymentSettingsInputSchema>;

/** Affichage lisible d'un RIB : 3 · 3 · 16 · 2 chiffres. */
export function formatRib(rib: string): string {
  const d = digits(rib);
  return d.length === 24 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 22)} ${d.slice(22)}` : d;
}
