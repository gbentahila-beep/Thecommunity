import "server-only";
import { readServiceFee, type ServiceFee } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export type AdminMail = {
  id: string;
  to: string;
  subject: string;
  kind: string;
  locale: string;
  status: "outbox" | "sent" | "failed";
  provider: string;
  html: string;
  attachments: string[];
  refs: Record<string, string>;
  error?: string;
  createdAt: string;
};
export type CompanySettings = {
  legalName: string; address: string; ice: string; if: string; rc: string; email: string; vatRate: number | null;
  mailProvider: "outbox" | "brevo"; fromName: string; fromEmail: string;
};

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : "");

/** Les 200 derniers e-mails (boîte d'envoi de test et envois réels). */
export async function getAdminMail(): Promise<{ mails: AdminMail[]; isDemo: boolean }> {
  await connection();
  if (!FIREBASE_ENABLED) return { mails: [], isDemo: true };
  await requireAdmin();
  const snap = await adminDb().collection("mail").orderBy("createdAt", "desc").limit(200).get();
  return {
    isDemo: false,
    mails: snap.docs.map((d) => {
      const m = d.data();
      return {
        id: d.id,
        to: String(m.to ?? ""),
        subject: String(m.subject ?? ""),
        kind: String(m.kind ?? ""),
        locale: String(m.locale ?? "fr"),
        status: m.status === "sent" || m.status === "failed" ? m.status : "outbox",
        provider: String(m.provider ?? "outbox"),
        html: String(m.html ?? ""),
        attachments: Array.isArray(m.attachments) ? m.attachments.map((a: { filename?: string }) => String(a.filename ?? "")) : [],
        refs: (m.refs ?? {}) as Record<string, string>,
        ...(m.error ? { error: String(m.error) } : {}),
        createdAt: iso(m.createdAt),
      };
    }),
  };
}

/** Réglages société + e-mails (Paramètres). */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  if (!FIREBASE_ENABLED) return null;
  await requireAdmin();
  const [c, e] = await Promise.all([adminDb().doc("settings/company").get(), adminDb().doc("settings/email").get()]);
  const cd = c.data() ?? {};
  const ed = e.data() ?? {};
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    legalName: s(cd.legalName), address: s(cd.address), ice: s(cd.ice), if: s(cd.if), rc: s(cd.rc), email: s(cd.email),
    vatRate: typeof cd.vatRate === "number" ? cd.vatRate : null,
    mailProvider: ed.provider === "brevo" ? "brevo" : "outbox", fromName: s(ed.fromName), fromEmail: s(ed.fromEmail),
  };
}

/** Frais de service en vigueur (Paramètres). */
export async function getServiceFee(): Promise<ServiceFee | null> {
  if (!FIREBASE_ENABLED) return null;
  await requireAdmin();
  return readServiceFee((await adminDb().doc("settings/booking").get()).data()?.serviceFee);
}

/** Mode de paiement (5h) : test ou virement, et coordonnées bancaires de The Host Club (équipe seulement). */
export type PaymentSettingsView = {
  method: "sandbox" | "bank_transfer" | "none";
  bank: { holder: string; bank: string; rib: string; iban: string; swift: string; deadlineHours: number; cutoffHours: number } | null;
};

export async function getPaymentSettings(): Promise<PaymentSettingsView | null> {
  if (!FIREBASE_ENABLED) return null;
  await requireAdmin();
  const [pay, bank] = await Promise.all([adminDb().doc("settings/payment").get(), adminDb().doc("settings/bankTransfer").get()]);
  const p = pay.data();
  const b = bank.data();
  return {
    method: p?.provider === "bank_transfer" ? "bank_transfer" : p?.provider === "sandbox" ? "sandbox" : "none",
    bank: b
      ? { holder: String(b.holder ?? ""), bank: String(b.bank ?? ""), rib: String(b.rib ?? ""), iban: String(b.iban ?? ""), swift: String(b.swift ?? ""), deadlineHours: Number(b.deadlineHours ?? 48), cutoffHours: Number(b.cutoffHours ?? 24) }
      : null,
  };
}
