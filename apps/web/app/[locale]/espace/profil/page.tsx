import { ageOn } from "@thecommunity/shared";
import { Eye, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories, getCity } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { formatCalendarDate, formatLongDate } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/profil">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "profilePage" }))("title") };
}

/** Une réponse ; `step` : la question à rouvrir pour la modifier (/bienvenue?edition=1&etape=…). */
function Row({ label, children, step, editLabel }: { label: string; children: React.ReactNode; step?: string; editLabel?: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-center">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-ink">{children || "—"}</dd>
      {step && (
        <dd>
          <Link href={`/bienvenue?edition=1&etape=${step}`} className="text-sm font-semibold text-plum-800 underline-offset-4 hover:underline" aria-label={`${editLabel} : ${label}`}>
            {editLabel}
          </Link>
        </dd>
      )}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="rounded-full bg-plum-50 px-3 py-1 text-sm text-plum-900">{i}</span>
      ))}
    </span>
  );
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/espace/profil">) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const [t, tl, locale, space] = await Promise.all([getTranslations("profilePage"), getTranslations("labels"), getLocale(), getMemberSpace()]);
  const p = space.profile;
  const [city, cats] = await Promise.all([getCity(p.cityId), getCategories()]);
  const [t2, tm] = await Promise.all([getTranslations("onboarding"), getTranslations("profileMore")]);
  const e = tm("edit");
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <span className="grid size-20 place-items-center rounded-full bg-plum-100 font-display text-3xl text-plum-900" aria-hidden>
          {p.firstName.charAt(0)}
        </span>
        <div className="flex-1">
          <h1 className="page-title">{p.firstName} {p.lastName}</h1>
          <p className="text-sm text-muted">{t("memberSince", { date: formatLongDate(p.createdAt, locale) })}</p>
        </div>
        <Link href="/bienvenue?edition=1" className="btn btn-primary btn-sm">
          <Pencil className="size-4" aria-hidden />
          {t("edit")}
        </Link>
      </header>

      <p className="flex items-start gap-2.5 rounded-2xl border border-line bg-white/70 p-4 text-sm text-ink/80">
        <Eye className="mt-0.5 size-4 shrink-0 text-plum-700" aria-hidden />
        {t("visibility")}
      </p>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("identity")}</h2>
        <dl className="mt-2 divide-y divide-line">
          <Row label={t("email")}><span dir="ltr">{p.email}</span></Row>
          <Row step="phone" editLabel={e} label={t("phone")}><span dir="ltr">{p.phone}</span></Row>
          <Row step="birth" editLabel={e} label={t("birthDate")}>{formatCalendarDate(p.birthDate, locale)} ({ageOn(p.birthDate)})</Row>
          <Row step="city" editLabel={e} label={t("city")}>{city ? tr(city.name, locale) : p.cityId}</Row>
          <Row step="gender" editLabel={e} label={t("gender")}>{p.gender ? tl(`gender.${p.gender}`) : ""}</Row>
        </dl>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("interests")}</h2>
        <dl className="mt-2 divide-y divide-line">
          <Row step="languages" editLabel={e} label={t("languages")}><Chips items={p.languages.map((l) => tl(`languages.${l}`))} /></Row>
          <Row step="interests" editLabel={e} label={t("interests")}><Chips items={p.interests.map((i) => tl(`interests.${i}`))} /></Row>
          <Row step="goals" editLabel={e} label={t("goals")}><Chips items={p.socialGoals.map((g) => tl(`goals.${g}`))} /></Row>
          <Row step="universes" editLabel={e} label={t("favoriteCategories")}><Chips items={(p.favoriteCategories ?? []).map((c) => { const k = cats.find((x) => x.id === c); return k ? tr(k.shortName, locale) : c; })} /></Row>
          <Row step="district" editLabel={e} label={t("district")}>{p.district}</Row>
          <Row step="sport" editLabel={e} label={t("sportLevel")}>{p.sportLevel ? t2(`sportLevel_${p.sportLevel}`) : ""}</Row>
          <Row step="age" editLabel={e} label={t("agePreference")}>{t2(`agePreference_${p.agePreference ?? "any"}`)}</Row>
        </dl>
      </section>

      <section className="card p-5" data-testid="profile-more">
        <h2 className="font-display text-2xl font-medium text-plum-900">{tm("title")}</h2>
        <dl className="mt-2 divide-y divide-line">
          <Row step="vibe" editLabel={e} label={tm("vibe")}>{p.groupVibe ? tl(`vibe.${p.groupVibe}`) : ""}</Row>
          <Row step="conversation" editLabel={e} label={tm("conversation")}>{p.conversationStyle ? tl(`conversation.${p.conversationStyle}`) : ""}</Row>
          <Row step="humor" editLabel={e} label={tm("humor")}>{p.humor ? tl(`humor.${p.humor}`) : ""}</Row>
          <Row step="values" editLabel={e} label={tm("values")}><Chips items={(p.lifeValues ?? []).map((v) => tl(`values.${v}`))} /></Row>
          <Row step="exercise" editLabel={e} label={tm("exercise")}>{p.exerciseFrequency ? tl(`exercise.${p.exerciseFrequency}`) : ""}</Row>
          <Row step="budget" editLabel={e} label={tm("budget")}>{p.venueBudget ? tl(`budget.${p.venueBudget}`) : ""}</Row>
          <Row step="diet" editLabel={e} label={tm("diets")}><Chips items={(p.diets ?? []).map((d) => tl(`profileDiets.${d}`))} /></Row>
          <Row step="sector" editLabel={e} label={tm("sector")}>{p.sector ? tl(`sector.${p.sector}`) : ""}</Row>
          <Row step="referral" editLabel={e} label={tm("referral")}>{p.referral ? tl(`referral.${p.referral}`) : ""}</Row>
          <Row step="phone" editLabel={e} label={tm("whatsapp")}>{p.whatsapp ? tm("yes") : tm("no")}</Row>
          <Row step="instagram" editLabel={e} label={tm("instagram")}>{p.instagram ? <span dir="ltr">@{p.instagram}</span> : ""}</Row>
        </dl>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("about")}</h2>
        <dl className="mt-2 divide-y divide-line">
          <Row label={t("profession")}>{p.profession}</Row>
          <Row step="photo" editLabel={e} label={t("bio")}>{p.bio}</Row>
        </dl>
      </section>
    </div>
  );
}
