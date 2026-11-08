import { bankDetailsSchema, formatMoney, formatRib, MEMBERSHIP_TRANSFER_DAYS } from "@thecommunity/shared";
import { CheckCircle2, Landmark } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CopyButton } from "@/components/booking/copy-button";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { requireMember } from "@/lib/data/member";
import { formatLongDate, formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Instructions de virement (étape 5h) : montant, référence unique, coordonnées bancaires de The Host Club, échéance.
 * Visible seulement par la personne qui paie. La confirmation vient de l'équipe (« Virement reçu »), jamais de cette page.
 */
export default async function TransferPage({ params }: PageProps<"/[locale]/paiement/virement/[paymentId]">) {
  const { locale, paymentId } = await params;
  setRequestLocale(locale);
  await connection();
  if (!FIREBASE_ENABLED) notFound();
  const user = await requireMember({ next: `/paiement/virement/${paymentId}` });
  const db = adminDb();
  const [paySnap, bankSnap] = await Promise.all([db.doc(`payments/${paymentId}`).get(), db.doc("settings/bankTransfer").get()]);
  const pay = paySnap.data();
  if (!pay || pay.userId !== user.uid || pay.provider !== "bank_transfer" || pay.type !== "payment") notFound();
  const bank = bankDetailsSchema.safeParse(bankSnap.data() ?? {});
  const t = await getTranslations("transfer");
  const lang = locale as "fr" | "ar" | "en";
  const amount = formatMoney({ amount: pay.amount, currency: pay.currency }, lang);
  const membership = pay.purpose === "membership";
  const back = membership ? { href: "/abonnement", label: t("seeMembership") } : { href: `/espace/reservations/${pay.reservationId}`, label: t("seeBooking") };

  let what = "";
  let open = pay.status === "initiated";
  let deadlineIso: string | null = pay.transferDeadline?.toDate().toISOString() ?? null;
  if (membership) {
    const plan = (await db.doc(`membershipPlans/${pay.planId}`).get()).data();
    what = plan ? tr(plan.name, locale) : "";
  } else {
    const r = (await db.doc(`reservations/${pay.reservationId}`).get()).data();
    if (!r) notFound();
    what = `${tr(r.sessionSnapshot.title, locale)} · ${formatLongDate(r.sessionSnapshot.startAt.toDate().toISOString(), locale)}`;
    open = open && r.status === "pending_payment" && r.paymentId === paymentId;
    deadlineIso = r.holdExpiresAt?.toDate().toISOString() ?? deadlineIso;
  }

  if (pay.status === "succeeded" || pay.status === "refunded" || pay.status === "partially_refunded") {
    return (
      <PageShell className="max-w-xl py-8">
        <section role="status" className="rounded-[var(--radius-card)] bg-emerald-50 p-5 text-emerald-950">
          <h1 className="flex items-center gap-2 font-display text-3xl font-medium"><CheckCircle2 className="size-7" aria-hidden />{t("receivedTitle")}</h1>
          <p className="mt-2">{t("receivedText")}</p>
          <Link href={back.href} className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">{back.label}</Link>
        </section>
      </PageShell>
    );
  }
  if (!open) {
    return (
      <PageShell className="max-w-xl py-8">
        <section role="status" className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h1 className="font-display text-3xl font-medium text-plum-900">{t("closedTitle")}</h1>
          <p className="mt-2 text-ink">{t("closedText")}</p>
          <Link href={back.href} className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">{back.label}</Link>
        </section>
      </PageShell>
    );
  }

  const deadlineText = membership
    ? t("deadlineMembership", { days: MEMBERSHIP_TRANSFER_DAYS })
    : deadlineIso
      ? t("deadline", { when: `${formatLongDate(deadlineIso, locale)} ${formatTime(deadlineIso, locale)}` })
      : "";
  const rows: [string, string][] = bank.success
    ? [
        [t("beneficiary"), bank.data.holder],
        [t("bank"), bank.data.bank],
        [t("rib"), formatRib(bank.data.rib)],
        ...(bank.data.iban ? ([[t("iban"), bank.data.iban]] as [string, string][]) : []),
        ...(bank.data.swift ? ([[t("swift"), bank.data.swift]] as [string, string][]) : []),
      ]
    : [];

  return (
    <PageShell className="max-w-xl py-8">
      <h1 className="flex items-center gap-3 font-display text-4xl font-medium text-plum-900">
        <Landmark className="size-8 shrink-0" aria-hidden />
        {t("title")}
      </h1>
      <p className="mt-2 text-ink/80">{t("intro")}</p>

      <section className="mt-5 rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="transfer-summary">
        <p className="text-sm text-muted">{what}</p>
        <p className="mt-3 text-sm font-medium text-muted">{t("amount")}</p>
        <p className="text-3xl font-bold text-plum-900">{amount}</p>
        {deadlineText && <p className="mt-1 text-sm font-semibold text-ink">{deadlineText}</p>}
        <div className="mt-4 rounded-xl bg-plum-50 p-4">
          <p className="text-sm font-medium text-plum-900">{t("reference")}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-2xl font-bold tracking-wider text-plum-900" data-testid="transfer-reference">{pay.reference}</p>
            <CopyButton value={pay.reference} label={t("copy")} copiedLabel={t("copied")} />
          </div>
          <p className="mt-1 text-xs text-plum-900/80">{t("referenceHint")}</p>
        </div>
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="transfer-bank">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t("noBank")}</p>
        ) : (
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-medium text-ink" dir="ltr">{v}</dd>
                </div>
                {k !== t("beneficiary") && k !== t("bank") && <CopyButton value={v.replace(/\s/g, "")} label={t("copy")} copiedLabel={t("copied")} />}
              </div>
            ))}
          </dl>
        )}
      </section>

      <ol className="mt-5 space-y-2 ps-5 text-sm text-ink [&>li]:list-decimal">
        <li>{t("step1")}</li>
        <li>{t("step2", { reference: pay.reference })}</li>
        <li>{t("step3")}</li>
      </ol>
      <Link href={back.href} className="mt-6 inline-block text-sm font-semibold text-plum-900 underline">{back.label}</Link>
    </PageShell>
  );
}
