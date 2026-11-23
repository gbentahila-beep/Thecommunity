import { carnetCredits, countedAbsences, DEFAULT_WENZY_PRICE, formatMoney, isMemberActive, isSuspended, MEMBERSHIP_WITHDRAWAL_DAYS, offerEconomics, offerLabel, PASS_MAX_UPCOMING, planOffers, SUSPENSION_DAYS, withdrawalRefusal } from "@thecommunity/shared";
import { BadgeCheck, Check, ChevronLeft, Sparkles, Ticket } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { OfferPicker, type OfferView } from "@/components/membership/offer-picker";
import { WithdrawButton } from "@/components/membership/withdraw-button";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getAccountState, getSessionUser } from "@/lib/auth/session";
import { getMembershipPlan, getPaymentMethod } from "@/lib/data";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { formatLongDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/abonnement">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pass" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const iso = (v: unknown) => (v && typeof v === "object" && "toDate" in v ? (v as { toDate: () => Date }).toDate().toISOString() : null);

/** Situation de la personne connectée (docs/22 § 17.I) : pass, carnet, absences, virement en attente, état du compte. */
async function mySituation() {
  const user = await getSessionUser();
  if (!user) return null;
  const db = adminDb();
  const [mem, car, record, account, pending, wenzy] = await Promise.all([
    db.doc(`memberships/${user.uid}`).get(),
    db.doc(`carnets/${user.uid}`).get(),
    adminAuth().getUser(user.uid),
    getAccountState(user.uid),
    db.collection("payments").where("userId", "==", user.uid).where("purpose", "==", "membership").where("status", "==", "initiated").get(),
    db.doc("settings/booking").get(),
  ]);
  const transferDoc = pending.docs.find((d) => d.data().provider === "bank_transfer");
  const transfer = transferDoc
    ? { id: transferDoc.id, reference: String(transferDoc.data().reference ?? ""), amount: transferDoc.data().amount as number, deadline: transferDoc.data().transferDeadline?.toDate().toISOString() as string | undefined }
    : null;
  const m = mem.data();
  const pass = m ? { status: String(m.status), startAt: iso(m.startAt) ?? "", endAt: iso(m.endAt) ?? "", suspendedUntil: iso(m.suspendedUntil), absences: ((m.absences ?? []) as { at: unknown }[]).map((a) => ({ at: iso(a.at) ?? "" })), since: iso(m.lastSuspensionAt) } : null;
  const c = car.data();
  const carnet = c ? { credits: Number(c.credits ?? 0), expiresAt: iso(c.expiresAt) ?? "" } : null;
  // Audit 23/11 : achats des 7 derniers jours encore rétractables (même règle que le serveur, qui la refait).
  const recent = await db.collection("payments").where("userId", "==", user.uid).where("purpose", "==", "membership").where("status", "==", "succeeded").get();
  const toMs = (v: unknown) => (v && typeof v === "object" && "toMillis" in v ? (v as { toMillis: () => number }).toMillis() : 0);
  const withdrawable: { id: string; label: string; amount: number; until: string }[] = [];
  for (const d of recent.docs) {
    const p = d.data();
    const purchasedAt = new Date(toMs(p.succeededAt) || toMs(p.updatedAt) || toMs(p.createdAt));
    if (p.withdrawnAt || Date.now() > purchasedAt.getTime() + MEMBERSHIP_WITHDRAWAL_DAYS * 86_400_000) continue;
    const used = p.kind === "carnet" ? 0 : (await db.collection("reservations").where("userId", "==", user.uid).where("createdAt", ">=", purchasedAt).get()).docs.filter((x) => Number(x.get("pricing.coverage.passSeats") ?? 0) > 0 && ["pending_payment", "confirmed", "attended", "no_show"].includes(String(x.get("status")))).length;
    const creditsLeft = c && toMs(c.expiresAt) > Date.now() ? Number(c.credits ?? 0) : 0;
    if (withdrawalRefusal({ status: "succeeded", kind: p.kind === "carnet" ? "carnet" : "pass", purchasedAt, passSeatsUsedSince: used, creditsBought: Number(p.credits ?? 0), creditsLeft })) continue;
    withdrawable.push({ id: d.id, label: String(p.label ?? ""), amount: Number(p.amount ?? 0), until: new Date(purchasedAt.getTime() + MEMBERSHIP_WITHDRAWAL_DAYS * 86_400_000).toISOString() });
  }
  return { pass, carnet, withdrawable, emailVerified: record.emailVerified, onboarded: account.onboardingCompleted, transfer, wenzyPrice: Number(wenzy.data()?.wenzyPrice ?? DEFAULT_WENZY_PRICE) };
}

/** Carnet et Pass (docs/22 § 9) : offres, avantages, achat, et la situation de la personne. */
export default async function MembershipPage({ params, searchParams }: PageProps<"/[locale]/abonnement">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const sp = await searchParams;
  const [t, tv, tn, plan, method] = await Promise.all([getTranslations("pass"), getTranslations("transfer"), getTranslations("nav"), getMembershipPlan(), getPaymentMethod()]);
  const lang = locale as "fr" | "ar" | "en";
  const me = FIREBASE_ENABLED ? await mySituation() : null;
  // Par virement : pas de pass semaine (il arrive avec le paiement par carte, docs/22 § 9).
  const offers = planOffers(plan).filter((o) => !(method === "bank_transfer" && o.kind === "pass" && o.days < 30));
  if (!plan || offers.length === 0) {
    return (
      <PageShell className="max-w-2xl py-12">
        <h1 className="page-title">{t("title")}</h1>
        <p className="mt-4 text-center text-muted">{t("soon")}</p>
      </PageShell>
    );
  }
  const now = new Date();
  const unit = me?.wenzyPrice ?? DEFAULT_WENZY_PRICE;
  const money = (amount: number) => formatMoney({ amount, currency: "MAD" }, lang);
  const views: OfferView[] = offers.map((o) => {
    const eco = offerEconomics(o, unit);
    return {
      id: o.id,
      kind: o.kind,
      title: offerLabel(o, locale),
      price: money(o.price.amount),
      perMonth: eco.perMonth && o.days > 30 ? money(eco.perMonth) : null,
      // Repère parlant (docs/22 § 9) : par mois pour les pass d'un mois et plus.
      note: o.kind === "carnet" ? t("carnetNote", { credits: o.credits ?? 3, months: Math.round(o.days / 30) })
        : eco.perMonth ? t("breakEvenMonth", { count: Math.ceil(eco.perMonth / unit) })
        : eco.breakEven ? t("breakEven", { count: eco.breakEven }) : null,
      highlight: Boolean(o.highlight),
      main: ["carnet3", "pass30", "pass180"].includes(o.id),
    };
  });
  const initial = offers.find((o) => o.highlight)?.id ?? views[0]!.id;
  const passOn = me?.pass ? isMemberActive({ ...me.pass, suspendedUntil: null }, now) : false;
  const suspended = me?.pass ? isSuspended(me.pass, now) : false;
  const absences = me?.pass ? countedAbsences(me.pass.absences, now, me.pass.since) : 0;
  const credits = carnetCredits(me?.carnet ?? null, now);
  const canBuy = me && me.emailVerified && me.onboarded && !me.transfer;
  const ctaClass = "btn btn-primary w-full shadow-float";
  const date = (x: string) => formatLongDate(x, locale);

  return (
    <PageShell className="max-w-5xl space-y-6 py-8 sm:py-10">
      {sp.depuis === "profil" && (
        <Link href="/espace/compte" className="-ms-1 inline-flex items-center gap-1 rounded-full py-1 pe-3 text-sm font-semibold text-brand-900 hover:bg-white" data-testid="account-back">
          <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
          {tn("myProfile")}
        </Link>
      )}
      {sp.paiement === "accepte" && (passOn || credits > 0) && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{t("welcome")}</p>}
      {sp.paiement === "refuse" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{t("paymentFailed")}</p>}

      <h1 className="page-title">{t("title")}</h1>

      <section className="card p-6 text-center sm:p-10" aria-labelledby="pass-hero">
        <Sparkles className="mx-auto size-7 text-brand-800" aria-hidden />
        <h2 id="pass-hero" className="section-title mx-auto mt-3 max-w-xl">{t("heroTitle")}</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink/80">{t("heroText", { price: money(unit) })}</p>
      </section>

      {(passOn || suspended || credits > 0) && (
        <section className="grid gap-3 sm:grid-cols-2" data-testid="my-subscription">
          {(passOn || suspended) && me?.pass && (
            <div className={`rounded-[var(--radius-card)] p-5 shadow-card ${suspended ? "border border-amber-300 bg-amber-50 text-amber-950" : "bg-brand-900 text-white"}`}>
              <p className="flex items-center gap-2 font-semibold"><BadgeCheck className="size-5" aria-hidden />{suspended ? t("suspendedTitle") : t("passActive")}</p>
              <p className="mt-1 text-sm">{suspended ? t("suspendedText", { date: date(me.pass.suspendedUntil!) }) : t("passUntil", { date: date(me.pass.endAt) })}</p>
              {!suspended && absences > 0 && <p className="mt-2 text-sm" data-testid="absence-warning">{t("absenceWarning", { count: absences })}</p>}
              <p className="mt-2 text-xs opacity-80">{t("passRules", { max: PASS_MAX_UPCOMING, days: SUSPENSION_DAYS })}</p>
            </div>
          )}
          {credits > 0 && me?.carnet && (
            <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
              <p className="flex items-center gap-2 font-semibold text-ink"><Ticket className="size-5 text-brand-800" aria-hidden />{t("carnetActive", { count: credits })}</p>
              <p className="mt-1 text-sm text-muted">{t("carnetUntil", { date: date(me.carnet.expiresAt) })}</p>
            </div>
          )}
        </section>
      )}

      {me?.transfer && (
        <div role="status" className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 text-amber-950" data-testid="membership-transfer">
          <h2 className="font-semibold">{tv("pendingTitle")}</h2>
          <p className="mt-1 text-sm">{tv("pendingMembership", { reference: me.transfer.reference, amount: money(me.transfer.amount), when: me.transfer.deadline ? date(me.transfer.deadline) : "" })}</p>
          <Link href={`/paiement/virement/${me.transfer.id}`} className="btn btn-primary btn-sm mt-4">{tv("seeInstructions")}</Link>
        </div>
      )}
      {me && me.withdrawable.length > 0 && (
        <section className="space-y-2" aria-label={t("withdrawTitle")}>
          {me.withdrawable.map((w) => <WithdrawButton key={w.id} paymentId={w.id} label={w.label} amount={money(w.amount)} until={formatLongDate(w.until, locale)} />)}
        </section>
      )}
      {me && !me.emailVerified && <VerifyEmailBanner />}

      {!me?.transfer && (
        <section aria-labelledby="offers-title">
          <h2 id="offers-title" className="section-title mb-5">{t("choose")}</h2>
          <OfferPicker
            offers={views}
            initialId={initial}
            mode={!FIREBASE_ENABLED ? "disabled" : canBuy ? "subscribe" : "custom"}
            cta={
              !me ? <Link href={`/connexion?suite=${encodeURIComponent("/abonnement")}`} className={ctaClass}>{t("signIn")}</Link>
              : !me.onboarded ? <Link href="/bienvenue" className={ctaClass}>{t("completeProfile")}</Link>
              : null
            }
          />
          <p className="mt-2 text-center text-xs text-muted">{!FIREBASE_ENABLED ? t("demoNote") : t("noAutoRenew")}{method === "bank_transfer" ? ` ${t("weekCardOnly")}` : ""}</p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="pass-benefits">
          <h2 className="card-title">{t("passTitle")}</h2>
          <ul className="mt-4 space-y-2.5">
            {(["pass1", "pass2", "pass3", "pass4"] as const).map((k) => <li key={k} className="flex gap-2.5 text-ink/85"><Check className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />{t(k, { max: PASS_MAX_UPCOMING })}</li>)}
          </ul>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="card-title">{t("carnetTitle")}</h2>
          <ul className="mt-4 space-y-2.5">
            {(["carnet1", "carnet2", "carnet3"] as const).map((k) => <li key={k} className="flex gap-2.5 text-ink/85"><Check className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />{t(k)}</li>)}
          </ul>
        </div>
      </section>

      <section className="info-box">
        <p className="text-[16px] text-ink">{t("notReady", { price: money(unit) })}</p>
        <Link href="/experiences" className="mt-4 inline-flex rounded-full border border-emerald-800/30 bg-white px-6 py-3 font-semibold text-emerald-900 hover:border-emerald-800">{t("notReadyCta")}</Link>
      </section>

      <details className="rounded-[var(--radius-card)] bg-white px-5 py-4 shadow-card">
        <summary className="cursor-pointer font-semibold text-ink">{t("termsTitle")}</summary>
        <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm text-ink/80">
          {(["terms1", "terms2", "terms3", "terms4"] as const).map((k) => <li key={k}>{t(k, { max: PASS_MAX_UPCOMING, days: SUSPENSION_DAYS })}</li>)}
        </ul>
        <Link href="/cgv" className="mt-3 inline-block text-sm font-semibold text-brand-900 underline underline-offset-4">{t("termsLink")}</Link>
      </details>
    </PageShell>
  );
}
