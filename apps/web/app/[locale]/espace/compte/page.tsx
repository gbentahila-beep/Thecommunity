import { TitleSparks } from "@/components/brand/doodles";
import { carnetCredits, isMemberActive } from "@thecommunity/shared";
import { MemberAvatar } from "@/components/member-avatar";
import { BadgeCheck, Bell, ChevronRight, History, ReceiptText, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { Link } from "@/i18n/navigation";
import { getCity } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/compte">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "nav" }))("myProfile") };
}

type Row = { href: string; label: string; icon: LucideIcon; hint?: string };

function Group({ title, rows }: { title?: string; rows: Row[] }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-2 text-sm font-medium text-muted">{title}</h2>}
      <ul className="overflow-hidden rounded-[1.5rem] bg-white shadow-card">
        {rows.map(({ href, label, icon: Icon, hint }, i) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center gap-4 ps-5 transition hover:bg-cream">
              <span className="bub-lilac grid size-9 shrink-0 place-items-center rounded-full"><Icon className="size-[18px] text-ink" strokeWidth={1.7} aria-hidden /></span>
              <span className={`flex min-h-14 flex-1 items-center justify-between gap-3 pe-4 ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="text-[16px] font-medium text-ink">{label}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  {hint}
                  <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** « Mon profil » : carte d'identité, puis toutes les rubriques personnelles, et la déconnexion (docs/16, phase 2). */
export default async function AccountHubPage({ params }: PageProps<"/[locale]/espace/compte">) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const [t, tn, locale, space] = await Promise.all([getTranslations("account"), getTranslations("nav"), getLocale(), getMemberSpace()]);
  const p = space.profile;
  const city = p.cityId ? await getCity(p.cityId) : null;
  const member = isMemberActive(space.membership ?? null, space.now);
  const credits = carnetCredits(space.carnet ?? null, space.now);
  const since = p.createdAt ? new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" }).format(new Date(p.createdAt)) : null;
  return (
    <div className="space-y-6" data-testid="account-hub">
      <h1 className="page-title"><TitleSparks text={tn("myProfile")} /></h1>
      <Link href="/espace/profil" className="flex items-center gap-4 rounded-[1.75rem] bg-[linear-gradient(105deg,#fff4ee_0%,#fbeef6_45%,#efe5ff_100%)] p-5 shadow-card transition hover:shadow-float">
        <MemberAvatar uid={p.uid} photoPath={p.photoPath} size={64} />
        <span className="min-w-0 flex-1">
          <span className="block truncate card-title">{p.firstName}</span>
          {city && <span className="block text-sm text-ink/80">{tr(city.name, locale)}</span>}
          {since && <span className="block text-sm text-muted">{t("memberSince", { date: since })}</span>}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted rtl:-scale-x-100" aria-hidden />
      </Link>

      <Group
        title={t("hubAccount")}
        rows={[
          { href: "/espace/preferences", label: t("navPreferences"), icon: SlidersHorizontal },
          { href: "/abonnement?depuis=profil", label: t("navMembership"), icon: BadgeCheck, hint: member ? t("hubMemberActive") : credits ? t("hubCredits", { count: credits }) : undefined },
        ]}
      />
      <Group
        title={t("hubNotifications")}
        rows={[{ href: "/espace/notifications", label: t("navNotifications"), icon: Bell, hint: space.unreadCount ? String(space.unreadCount) : undefined }]}
      />
      <Group
        title={t("hubHistory")}
        rows={[
          { href: "/espace/historique", label: t("navHistory"), icon: History },
          { href: "/espace/factures", label: t("navInvoices"), icon: ReceiptText },
        ]}
      />
      {space.session && <LogoutButton />}
    </div>
  );
}
