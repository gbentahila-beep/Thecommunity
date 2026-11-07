import { ArrowRight, BadgeCheck, CalendarCheck, Compass, Handshake, MessageCircle, ShieldCheck, Store, UserRound, Utensils } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HELP_ARTICLES, HELP_CATEGORIES, helpLang, type HelpAudience, type HelpCategoryKey } from "@/content/help";
import { Link } from "@/i18n/navigation";
import { plainText } from "@/lib/rich-text";
import { PageShell } from "../ui";
import { HelpSearch } from "./help-search";

const ICONS: Record<HelpCategoryKey, typeof Compass> = {
  start: Compass,
  bookings: CalendarCheck,
  membership: BadgeCheck,
  account: UserRound,
  safety: ShieldCheck,
  "partner-join": Handshake,
  "partner-hosting": Utensils,
};

/** Accueil du centre d'aide : recherche, onglets Membres / Partenaires, catégories et leurs articles. */
export async function HelpHub({ audience, locale }: { audience: HelpAudience; locale: string }) {
  const t = await getTranslations("help");
  const lang = helpLang(locale);
  const catTitle = Object.fromEntries(HELP_CATEGORIES.map((c) => [c.key, c.title[lang]]));
  const index = HELP_ARTICLES.map((a) => ({
    slug: a.slug,
    title: a.title[lang],
    summary: a.summary[lang],
    category: catTitle[a.category]!,
    text: plainText(a.body[lang].flat().join(" ")),
  }));
  const categories = HELP_CATEGORIES.filter((c) => c.audience === audience);
  const tab = (active: boolean) =>
    `rounded-full px-5 py-2.5 text-sm font-semibold transition ${active ? "bg-plum-900 text-white" : "text-plum-900 hover:bg-white"}`;
  return (
    <>
      <section className="bg-plum-900 pb-16 pt-12 text-white">
        <PageShell className="max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">{t("title")}</p>
          <h1 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/80">{t("heroText")}</p>
        </PageShell>
      </section>
      <PageShell className="max-w-5xl">
        <HelpSearch index={index}>
          <nav aria-label={t("tabs")} className="mt-10 flex justify-center">
            <div className="inline-flex gap-1 rounded-full bg-cream-deep p-1">
              <Link href="/aide" aria-current={audience === "clients" ? "page" : undefined} className={tab(audience === "clients")}>{t("tabClients")}</Link>
              <Link href="/aide/partenaires" aria-current={audience === "partners" ? "page" : undefined} className={tab(audience === "partners")}>{t("tabPartners")}</Link>
            </div>
          </nav>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {categories.map((c) => {
              const Icon = ICONS[c.key];
              const articles = HELP_ARTICLES.filter((a) => a.category === c.key);
              return (
                <section key={c.key} id={c.key} aria-labelledby={`cat-${c.key}`} className="scroll-mt-28 rounded-[var(--radius-card)] bg-white p-6 shadow-card">
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-plum-50 text-plum-900">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h2 id={`cat-${c.key}`} className="font-display text-2xl font-medium text-plum-900">{c.title[lang]}</h2>
                      <p className="mt-1 text-sm text-muted">{c.description[lang]} · {t("articles", { count: articles.length })}</p>
                    </div>
                  </div>
                  <ul className="mt-5 divide-y divide-line">
                    {articles.map((a) => (
                      <li key={a.slug}>
                        <Link href={`/aide/${a.slug}`} className="group flex items-center justify-between gap-3 py-3 text-ink hover:text-plum-900">
                          <span>{a.title[lang]}</span>
                          <ArrowRight className="size-4 shrink-0 text-plum-700 transition group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </HelpSearch>
        <HelpContactCards audience={audience} />
      </PageShell>
    </>
  );
}

/** Bas de page commun : écrire à l'équipe, et (côté membres) l'appel aux partenaires. */
export async function HelpContactCards({ audience }: { audience: HelpAudience }) {
  const t = await getTranslations("help");
  return (
    <div className="mt-12 grid gap-5 md:grid-cols-2">
      <div className="rounded-[var(--radius-card)] bg-cream-deep p-6">
        <MessageCircle className="size-6 text-plum-900" aria-hidden />
        <h2 className="mt-3 font-display text-2xl font-medium text-plum-900">{t("contactTitle")}</h2>
        <p className="mt-2 text-ink/80">{t("contactText")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">{t("contactCta")}</Link>
          <Link href="/faq" className="rounded-full border border-plum-900 px-5 py-2.5 text-sm font-semibold text-plum-900 hover:bg-white">{t("faqCta")}</Link>
        </div>
      </div>
      <div className="rounded-[var(--radius-card)] bg-cream-deep p-6">
        <Store className="size-6 text-plum-900" aria-hidden />
        <h2 className="mt-3 font-display text-2xl font-medium text-plum-900">{t("partnerTitle")}</h2>
        <p className="mt-2 text-ink/80">{t("partnerText")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/devenir-partenaire" className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">{t("partnerCta")}</Link>
          {audience === "clients" && (
            <Link href="/aide/partenaires" className="rounded-full border border-plum-900 px-5 py-2.5 text-sm font-semibold text-plum-900 hover:bg-white">{t("tabPartners")}</Link>
          )}
        </div>
      </div>
    </div>
  );
}
