import { canRenewMembership, formatMoney, isMemberActive } from "@thecommunity/shared";
import { BadgeCheck, Check } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { SubscribeButton } from "@/components/membership/subscribe-button";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getAccountState, getSessionUser } from "@/lib/auth/session";
import { getMembershipPlan } from "@/lib/data";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { formatLongDate } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/abonnement">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "membership" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Situation de la personne connectée : abonnement, économies réalisées, état du compte. */
async function myMembership() {
  const user = await getSessionUser();
  if (!user) return null;
  const db = adminDb();
  const [mem, res, record, account] = await Promise.all([
    db.doc(`memberships/${user.uid}`).get(),
    db.collection("reservations").where("userId", "==", user.uid).limit(200).get(),
    adminAuth().getUser(user.uid),
    getAccountState(user.uid),
  ]);
  const m = mem.data();
  const period = m ? { status: m.status as string, startAt: m.startAt.toDate() as Date, endAt: m.endAt.toDate() as Date } : null;
  const savings = res.docs
    .filter((d) => ["confirmed", "attended", "no_show"].includes(d.data().status))
    .reduce((a, d) => a + ((d.data().pricing?.memberDiscount as number) ?? 0), 0);
  return { period, active: isMemberActive(period), savings, emailVerified: record.emailVerified, onboarded: account.onboardingCompleted };
}

/** Abonnement annuel : avantages, prix, souscription ou renouvellement, et carte de membre. */
export default async function MembershipPage({ params, searchParams }: PageProps<"/[locale]/abonnement">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const sp = await searchParams;
  const [t, plan] = await Promise.all([getTranslations("membership"), getMembershipPlan()]);
  const lang = locale as "fr" | "ar";
  const me = FIREBASE_ENABLED ? await myMembership() : null;

  if (!plan) {
    return (
      <PageShell className="max-w-2xl py-12">
        <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
        <p className="mt-4 text-muted">{t("soon")}</p>
      </PageShell>
    );
  }
  const paid = sp.paiement === "accepte";
  const failed = sp.paiement === "refuse";

  return (
    <PageShell className="max-w-3xl space-y-6 py-10">
      {paid && me?.active && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{t("welcome")}</p>
      )}
      {failed && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{t("paymentFailed")}</p>}

      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-plum-700">{t("eyebrow")}</p>
        <h1 className="mt-1 font-display text-4xl font-medium text-plum-900">{tr(plan.name, locale)}</h1>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-ink">{formatMoney(plan.price, lang)}</span>
          <span className="text-muted">{t("perYear")}</span>
        </p>
      </header>

      {me?.active && me.period && (
        <section className="rounded-[var(--radius-card)] bg-plum-900 p-5 text-white shadow-card">
          <p className="flex items-center gap-2 font-semibold">
            <BadgeCheck className="size-5" aria-hidden />
            {t("activeTitle")}
          </p>
          <p className="mt-1 text-sm text-plum-50">{t("activeUntil", { date: formatLongDate(me.period.endAt.toISOString(), locale) })}</p>
          {me.savings > 0 && <p className="mt-3 text-sm">{t("savings", { amount: formatMoney({ amount: me.savings, currency: "MAD" }, lang) })}</p>}
        </section>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-semibold text-ink">{t("benefitsTitle")}</h2>
        <ul className="mt-3 space-y-2">
          {plan.benefits.map((b, i) => (
            <li key={i} className="flex gap-2 text-ink/85">
              <Check className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
              {tr(b, locale)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">{t("howPriceShows")}</p>
      </section>

      <section className="space-y-3">
        {!FIREBASE_ENABLED ? (
          <>
            <button type="button" disabled className="w-full cursor-not-allowed rounded-full bg-plum-900/40 px-6 py-4 font-semibold text-white">{t("subscribe", { price: formatMoney(plan.price, lang) })}</button>
            <p className="text-center text-xs text-muted">{t("demoNote")}</p>
          </>
        ) : !me ? (
          <Link href={`/connexion?suite=${encodeURIComponent("/abonnement")}`} className="block w-full rounded-full bg-plum-900 px-6 py-4 text-center font-semibold text-white">
            {t("signInToSubscribe")}
          </Link>
        ) : !me.emailVerified ? (
          <VerifyEmailBanner />
        ) : !me.onboarded ? (
          <Link href="/bienvenue" className="block w-full rounded-full bg-plum-900 px-6 py-4 text-center font-semibold text-white">{t("completeProfile")}</Link>
        ) : me.active && me.period && !canRenewMembership(me.period) ? null : (
          <>
            <SubscribeButton label={me.active ? t("renew", { price: formatMoney(plan.price, lang) }) : t("subscribe", { price: formatMoney(plan.price, lang) })} />
            <p className="text-center text-xs text-muted">{me.active ? t("renewNote") : t("noAutoRenew")}</p>
          </>
        )}
      </section>
    </PageShell>
  );
}
