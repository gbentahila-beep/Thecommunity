import { canRenewMembership, formatMoney, isMemberActive, offerEconomics, pickOffer, planOffers } from "@thecommunity/shared";
import { BadgeCheck, Check, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { OfferPicker, type OfferView } from "@/components/membership/offer-picker";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getAccountState, getSessionUser } from "@/lib/auth/session";
import { getMembershipPlan, getPublishedExperiences } from "@/lib/data";
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
  const [mem, res, record, account, pending] = await Promise.all([
    db.doc(`memberships/${user.uid}`).get(),
    db.collection("reservations").where("userId", "==", user.uid).limit(200).get(),
    adminAuth().getUser(user.uid),
    getAccountState(user.uid),
    // C : abonnement payé par virement, encore attendu
    db.collection("payments").where("userId", "==", user.uid).where("purpose", "==", "membership").where("status", "==", "initiated").get(),
  ]);
  const transferDoc = pending.docs.find((d) => d.data().provider === "bank_transfer");
  const transfer = transferDoc
    ? { id: transferDoc.id, reference: String(transferDoc.data().reference ?? ""), amount: transferDoc.data().amount as number, currency: (transferDoc.data().currency as string) ?? "MAD", deadline: transferDoc.data().transferDeadline?.toDate().toISOString() as string | undefined }
    : null;
  const m = mem.data();
  const period = m ? { status: m.status as string, startAt: m.startAt.toDate() as Date, endAt: m.endAt.toDate() as Date } : null;
  const savings = res.docs
    .filter((d) => ["confirmed", "attended", "no_show"].includes(d.data().status))
    .reduce((a, d) => a + ((d.data().pricing?.memberDiscount as number) ?? 0), 0);
  return { period, active: isMemberActive(period), savings, emailVerified: record.emailVerified, onboarded: account.onboardingCompleted, transfer };
}

/** Abonnement : formules par durée, avantages, souscription ou renouvellement, et carte de membre. */
export default async function MembershipPage({ params, searchParams }: PageProps<"/[locale]/abonnement">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const sp = await searchParams;
  const [t, tv, plan, experiences] = await Promise.all([getTranslations("membership"), getTranslations("transfer"), getMembershipPlan(), getPublishedExperiences()]);
  const lang = locale as "fr" | "ar" | "en";
  const me = FIREBASE_ENABLED ? await myMembership() : null;
  const offers = plan ? planOffers(plan) : [];

  if (!plan || offers.length === 0) {
    return (
      <PageShell className="max-w-2xl py-12">
        <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
        <p className="mt-4 text-muted">{t("soon")}</p>
      </PageShell>
    );
  }
  const paid = sp.paiement === "accepte";
  const failed = sp.paiement === "refuse";
  const money = (amount: number) => formatMoney({ amount, currency: "MAD" }, lang);
  // « Rentabilisé en ~N expériences » : économie moyenne par expérience (réduction membre sur le prix public moyen).
  const prices = experiences.map((e) => e.price.amount).filter((a) => a > 0);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const perExperience = Math.round((avg * plan.discountPercent) / 100);
  const bestId = [...offers].sort((a, b) => offerEconomics(b, offers).savingPercent - offerEconomics(a, offers).savingPercent)[0]?.id;
  const views: OfferView[] = offers.map((o) => {
    const eco = offerEconomics(o, offers);
    const breakEven = perExperience > 0 ? Math.ceil(o.price.amount / perExperience) : null;
    return {
      id: o.id,
      months: o.months,
      price: money(o.price.amount),
      perMonth: money(eco.perMonth),
      reference: eco.saving > 0 ? money(eco.reference) : null,
      saving: eco.saving > 0 ? money(eco.saving) : null,
      savingPercent: eco.savingPercent,
      // Affiché seulement si c'est réaliste : environ 2 expériences par mois au plus.
      breakEven: breakEven !== null && breakEven <= o.months * 2 ? breakEven : null,
      highlight: Boolean(o.highlight),
      best: o.id === bestId && eco.savingPercent > 0 && !o.highlight,
    };
  });
  const initial = pickOffer(plan)?.id ?? views[0]!.id;
  const cheapest = Math.min(...offers.map((o) => offerEconomics(o, offers).perMonth));
  const canBuy = me && me.emailVerified && me.onboarded && !me.transfer && !(me.active && me.period && !canRenewMembership(me.period));
  const ctaClass = "block w-full rounded-full bg-gradient-to-r from-plum-900 to-plum-700 px-6 py-4 text-center font-semibold text-white shadow-float";

  return (
    <PageShell className="max-w-5xl space-y-6 py-8 sm:py-10">
      {paid && me?.active && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{t("welcome")}</p>
      )}
      {failed && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{t("paymentFailed")}</p>}

      <h1 className="font-display text-3xl font-medium text-ink sm:text-4xl">{t("title")}</h1>

      <section className="rounded-[2rem] bg-gradient-to-br from-[#f7e4e8] via-[#f3e6f1] to-[#ece6f6] p-6 text-center shadow-card sm:p-10" aria-labelledby="membership-hero">
        <Sparkles className="mx-auto size-7 text-plum-800" aria-hidden />
        <h2 id="membership-hero" className="mx-auto mt-3 max-w-xl font-display text-[1.9rem] leading-tight font-medium text-ink sm:text-[2.6rem]">
          {t("heroTitle", { price: money(cheapest) })}
        </h2>
        <p className="mx-auto mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 rounded-full bg-white/85 px-5 py-2.5 text-[15px] font-semibold text-ink shadow-card">
          {t("heroChip", { percent: plan.discountPercent })}
          {plan.waiveServiceFee && <span className="text-plum-800">· {t("heroChipFees")}</span>}
        </p>
        {plan.earlyAccessHours > 0 && <p className="mx-auto mt-4 max-w-md text-[15px] text-ink/80"><span className="font-semibold text-plum-800">{t("heroNew")}</span> {t("heroEarly", { hours: plan.earlyAccessHours })}</p>}
      </section>

      {me?.active && me.period && (
        <section className="rounded-[var(--radius-card)] bg-plum-900 p-5 text-white shadow-card">
          <p className="flex items-center gap-2 font-semibold">
            <BadgeCheck className="size-5" aria-hidden />
            {t("activeTitle")}
          </p>
          <p className="mt-1 text-sm text-plum-50">{t("activeUntil", { date: formatLongDate(me.period.endAt.toISOString(), locale) })}</p>
          {me.savings > 0 && <p className="mt-3 text-sm">{t("savings", { amount: money(me.savings) })}</p>}
        </section>
      )}

      {me?.transfer && (
        <div role="status" className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 text-amber-950" data-testid="membership-transfer">
          <h2 className="font-semibold">{tv("pendingTitle")}</h2>
          <p className="mt-1 text-sm">
            {tv("pendingMembership", {
              reference: me.transfer.reference,
              amount: formatMoney({ amount: me.transfer.amount, currency: me.transfer.currency as "MAD" }, lang),
              when: me.transfer.deadline ? formatLongDate(me.transfer.deadline, locale) : "",
            })}
          </p>
          <Link href={`/paiement/virement/${me.transfer.id}`} className="mt-4 inline-block rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">{tv("seeInstructions")}</Link>
        </div>
      )}
      {me && !me.emailVerified && <VerifyEmailBanner />}

      {!(me?.active && me.period && !canRenewMembership(me.period)) && !me?.transfer && (
        <section aria-labelledby="offers-title">
          <h2 id="offers-title" className="sr-only">{t("chooseOffer")}</h2>
          <OfferPicker
            offers={views}
            initialId={initial}
            renew={Boolean(me?.active)}
            mode={!FIREBASE_ENABLED ? "disabled" : canBuy ? "subscribe" : "custom"}
            cta={
              !me ? (
                <Link href={`/connexion?suite=${encodeURIComponent("/abonnement")}`} className={ctaClass}>{t("signInToSubscribe")}</Link>
              ) : !me.onboarded ? (
                <Link href="/bienvenue" className={ctaClass}>{t("completeProfile")}</Link>
              ) : null
            }
          />
          <p className="mt-2 text-center text-xs text-muted">{!FIREBASE_ENABLED ? t("demoNote") : me?.active ? t("renewNote") : t("noAutoRenewShort")}</p>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-display text-2xl font-medium text-ink">{t("benefitsTitle")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {plan.benefits.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-ink/85">
              <Check className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
              {tr(b, locale)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">{t("howPriceShows")}</p>
      </section>

      <section className="rounded-[var(--radius-card)] bg-gradient-to-br from-[#e6f2e8] to-[#f2f6e2] p-6 text-center shadow-card">
        <p className="text-[16px] text-ink">{t("notReady")}</p>
        <Link href="/experiences" className="mt-4 inline-flex rounded-full border border-emerald-800/30 bg-white px-6 py-3 font-semibold text-emerald-900 hover:border-emerald-800">{t("notReadyCta")}</Link>
      </section>

      <details className="rounded-[var(--radius-card)] bg-white px-5 py-4 shadow-card">
        <summary className="cursor-pointer font-semibold text-ink">{t("termsTitle")}</summary>
        <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm text-ink/80">
          <li>{t("terms1")}</li>
          <li>{t("terms2")}</li>
          <li>{t("terms3")}</li>
        </ul>
        <Link href="/cgv" className="mt-3 inline-block text-sm font-semibold text-plum-900 underline underline-offset-4">{t("termsLink")}</Link>
      </details>
    </PageShell>
  );
}
