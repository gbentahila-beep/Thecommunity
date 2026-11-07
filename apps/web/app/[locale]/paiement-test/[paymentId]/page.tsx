import { formatMoney } from "@thecommunity/shared";
import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TestPaymentActions } from "@/components/booking/test-payment-actions";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { requireMember } from "@/lib/data/member";
import { formatLongDate, formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Page du prestataire de paiement de TEST (adaptateur « sandbox »).
 * N'existe que si settings/payment = { provider: "sandbox", mode: "test" } ; sinon 404.
 * Aucune carte n'est demandée : les deux boutons simulent la réponse de la banque.
 */
export default async function TestPaymentPage({ params }: PageProps<"/[locale]/paiement-test/[paymentId]">) {
  const { locale, paymentId } = await params;
  setRequestLocale(locale);
  await connection();
  if (!FIREBASE_ENABLED) notFound();
  const user = await requireMember({ next: `/paiement-test/${paymentId}` });
  const db = adminDb();
  const [settings, paySnap] = await Promise.all([db.doc("settings/payment").get(), db.doc(`payments/${paymentId}`).get()]);
  const s = settings.data();
  if (s?.provider !== "sandbox" || s?.mode !== "test") notFound();
  const pay = paySnap.data();
  if (!pay || pay.userId !== user.uid || pay.provider !== "sandbox" || pay.type !== "payment") notFound();
  // (réservation ou abonnement : traités ci-dessous)
  const t = await getTranslations("testPayment");
  const lang = locale as "fr" | "ar" | "en";
  const pending = pay.status === "initiated";

  // Abonnement annuel : même « banque » de test, retour sur la page Abonnement.
  if (pay.purpose === "membership") {
    const plan = (await db.doc(`membershipPlans/${pay.planId}`).get()).data();
    return (
      <PageShell className="max-w-xl py-8">
        <TestBanner title={t("bannerTitle")} text={t("bannerText")} />
        <h1 className="mt-6 font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
        <section className="mt-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <p className="font-semibold text-ink">{plan ? tr(plan.name, locale) : ""}</p>
          <p className="mt-1 text-sm text-muted">{t("membershipPeriod")}</p>
          <p className="mt-4 text-3xl font-bold text-plum-900">{formatMoney({ amount: pay.amount, currency: pay.currency }, lang)}</p>
        </section>
        {pending ? (
          <TestPaymentActions paymentId={paymentId} reservationId="" returnTo="/abonnement" />
        ) : (
          <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
            <p className="text-ink">{t("alreadyProcessed")}</p>
            <Link href="/abonnement" className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">{t("seeMembership")}</Link>
          </section>
        )}
      </PageShell>
    );
  }

  const r = (await db.doc(`reservations/${pay.reservationId}`).get()).data();
  if (!r) notFound();
  const startAt = r.sessionSnapshot.startAt.toDate().toISOString();
  const holdIso = r.holdExpiresAt?.toDate().toISOString();

  return (
    <PageShell className="max-w-xl py-8">
      <TestBanner title={t("bannerTitle")} text={t("bannerText")} />

      <h1 className="mt-6 font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
      <section className="mt-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <p className="font-semibold text-ink">{tr(r.sessionSnapshot.title, locale)}</p>
        <p className="mt-1 text-sm text-muted">
          {formatLongDate(startAt, locale)} · {t("seats", { count: r.seats })}
        </p>
        <p className="mt-4 text-3xl font-bold text-plum-900">{formatMoney({ amount: pay.amount, currency: pay.currency }, lang)}</p>
        {pending && holdIso && r.status === "pending_payment" && <p className="mt-2 text-sm text-muted">{t("holdUntil", { time: formatTime(holdIso, locale) })}</p>}
      </section>

      {pending ? (
        <TestPaymentActions paymentId={paymentId} reservationId={pay.reservationId} />
      ) : (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <p className="text-ink">{t("alreadyProcessed")}</p>
          <Link href={`/espace/reservations/${pay.reservationId}`} className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">
            {t("seeReservation")}
          </Link>
        </section>
      )}
    </PageShell>
  );
}

function TestBanner({ title, text }: { title: string; text: string }) {
  return (
    <div role="note" className="flex gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-amber-950">
      <FlaskConical className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm">{text}</p>
      </div>
    </div>
  );
}
