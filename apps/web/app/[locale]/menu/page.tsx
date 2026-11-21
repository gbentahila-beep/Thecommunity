import { Bell, BookOpen, Star, CalendarRange, ChevronRight, CircleHelp, HandHeart, Info, Mail, MessageCircle, Newspaper, Award, Settings2, ShieldCheck, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { LanguageSwitch } from "@/components/language-switch";
import { MenuAuth, MenuProfile } from "@/components/menu-auth";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("menu"), robots: { index: false } };
}

type Row = { href: string; label: string; icon: ReactNode; hint?: string };

function Group({ title, rows }: { title?: string; rows: Row[] }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-2 text-sm font-medium text-muted">{title}</h2>}
      <ul className="overflow-hidden rounded-3xl bg-white shadow-card">
        {rows.map((r, i) => (
          <li key={r.href}>
            <Link href={r.href} className="flex min-h-14 items-center gap-4 ps-5 transition hover:bg-cream">
              <span className="grid size-6 shrink-0 place-items-center text-ink/80">{r.icon}</span>
              <span className={`flex min-h-14 flex-1 items-center justify-between gap-3 pe-4 ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="text-[16px] font-medium text-ink">{r.label}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  {r.hint}
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

const ico = (Icon: LucideIcon) => <Icon className="size-[22px]" strokeWidth={1.6} aria-hidden />;

/** Onglet « Menu » de la barre du bas (téléphone) : tout le site en listes, comme une application. */
export default async function MenuPage({ params }: PageProps<"/[locale]/menu">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tf, tm, categories, loc] = await Promise.all([getTranslations("nav"), getTranslations("footer"), getTranslations("menuPage"), getCategories(), getLocale()]);
  return (
    <PageShell className="max-w-2xl space-y-6 py-8">
      <h1 className="page-title">{t("menu")}</h1>
      <MenuProfile />

      <Group
        rows={[
          { href: "/experiences", label: t("allExperiences"), icon: ico(CalendarRange) },
          ...categories.map((c) => ({ href: `/casablanca/${c.id}`, label: tr(c.name, loc), icon: <CategoryIcon category={c.id} icon={c.icon} className="size-[22px]" /> })),
        ]}
      />
      <Group
        title={tm("account")}
        rows={[
          { href: "/espace/compte", label: t("myProfile"), icon: ico(UserRound) },
          { href: "/espace/notifications", label: t("notifications"), icon: ico(Bell) },
          { href: "/espace/preferences", label: tm("preferences"), icon: ico(Settings2) },
        ]}
      />
      <Group
        title={tm("club")}
        rows={[
          { href: "/comment-ca-marche", label: t("how"), icon: ico(Sparkles) },
          { href: "/abonnement", label: tf("membership"), icon: ico(Award) },
          { href: "/avis", label: t("reviews"), icon: ico(Star) },
          { href: "/devenir-partenaire", label: tf("partner"), icon: ico(HandHeart) },
          { href: "/blog", label: tf("blog"), icon: ico(Newspaper) },
          { href: "/a-propos", label: tf("about"), icon: ico(Info) },
        ]}
      />
      <Group
        title={tm("help")}
        rows={[
          { href: "/aide", label: tf("help"), icon: ico(MessageCircle), hint: tm("helpHint") },
          { href: "/faq", label: tm("faq"), icon: ico(CircleHelp) },
          { href: "/charte", label: tf("charter"), icon: ico(BookOpen) },
          { href: "/securite", label: tf("safety"), icon: ico(ShieldCheck) },
          { href: "/cgu", label: tm("terms"), icon: ico(ShieldCheck) },
          { href: "/contact", label: tf("contact"), icon: ico(Mail) },
        ]}
      />

      <div className="flex justify-center py-2">
        <LanguageSwitch />
      </div>
      <MenuAuth />
    </PageShell>
  );
}
