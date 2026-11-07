import { ageOn } from "@thecommunity/shared";
import { Eye, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCity } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { formatCalendarDate, formatLongDate } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/profil">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "profilePage" }))("title") };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-ink">{children || "—"}</dd>
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
  const city = await getCity(p.cityId);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <span className="grid size-20 place-items-center rounded-full bg-plum-100 font-display text-3xl text-plum-900" aria-hidden>
          {p.firstName.charAt(0)}
        </span>
        <div className="flex-1">
          <h1 className="font-display text-4xl font-medium text-plum-900">{p.firstName} {p.lastName}</h1>
          <p className="text-sm text-muted">{t("memberSince", { date: formatLongDate(p.createdAt, locale) })}</p>
        </div>
        <Link href="/bienvenue?edition=1" className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">
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
          <Row label={t("phone")}><span dir="ltr">{p.phone}</span></Row>
          <Row label={t("birthDate")}>{formatCalendarDate(p.birthDate, locale)} ({ageOn(p.birthDate)})</Row>
          <Row label={t("city")}>{city ? tr(city.name, locale) : p.cityId}</Row>
          <Row label={t("gender")}>{p.gender ? tl(`gender.${p.gender}`) : ""}</Row>
        </dl>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("interests")}</h2>
        <dl className="mt-2 divide-y divide-line">
          <Row label={t("languages")}><Chips items={p.languages.map((l) => tl(`languages.${l}`))} /></Row>
          <Row label={t("interests")}><Chips items={p.interests.map((i) => tl(`interests.${i}`))} /></Row>
          <Row label={t("goals")}><Chips items={p.socialGoals.map((g) => tl(`goals.${g}`))} /></Row>
        </dl>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("about")}</h2>
        <dl className="mt-2 divide-y divide-line">
          <Row label={t("profession")}>{p.profession}</Row>
          <Row label={t("bio")}>{p.bio}</Row>
        </dl>
      </section>
    </div>
  );
}
