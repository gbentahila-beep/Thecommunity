import { ArrowRight, BadgeCheck, CalendarCheck, Compass, Handshake, MessageCircle, ShieldCheck, UserRound, Utensils } from "lucide-react";
import { AudienceCards } from "@/components/audience-cards";
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
    text: plainText(a.body[lang].flat().join(" ").replace(/\[\[\w+\]\]/g, "")),
  }));
  const categories = HELP_CATEGORIES.filter((c) => c.audience === audience);
  const tab = (active: boolean) =>
    `rounded-full px-5 py-2.5 text-sm font-semibold transition ${active ? "bg-brand-900 text-white" : "text-brand-900 hover:bg-white"}`;
  return (
    <>
      <section className="bg-brand-900 pb-16 pt-12 text-white">
        <PageShell className="max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">{t("title")}</p>
          <h1 className="page-title mt-3">{t("heroTitle")}</h1>
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
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-900">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h2 id={`cat-${c.key}`} className="font-display text-2xl font-medium text-brand-900">{c.title[lang]}</h2>
                      <p className="mt-1 text-sm text-muted">{c.description[lang]} · {t("articles", { count: articles.length })}</p>
                    </div>
                  </div>
                  <ul className="mt-5 divide-y divide-line">
                    {articles.map((a) => (
                      <li key={a.slug}>
                        <Link href={`/aide/${a.slug}`} className="group flex items-center justify-between gap-3 py-3 text-ink hover:text-brand-900">
                          <span>{a.title[lang]}</span>
                          <ArrowRight className="size-4 shrink-0 text-brand-700 transition group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
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

/** Bas de page commun : écrire à l'équipe, puis les encadrés lieux partenaires et organisateurs. */
export async function HelpContactCards({ audience }: { audience: HelpAudience }) {
  const t = await getTranslations("help");
  return (
    <div className="mt-12 space-y-5" data-testid="help-contact-cards">
      <div className="info-box flex flex-col items-center">
        <MessageCircle className="size-7 text-brand-900" aria-hidden />
        <h2 className="mt-3 font-display text-[1.45rem] leading-tight font-medium text-brand-900">{t("contactTitle")}</h2>
        <p className="mt-2 text-ink/80">{t("contactText")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn btn-primary btn-sm">{t("contactCta")}</Link>
          <Link href="/faq" className="btn btn-secondary btn-sm">{t("faqCta")}</Link>
          {audience === "clients" && <Link href="/aide/partenaires" className="btn btn-secondary btn-sm">{t("tabPartners")}</Link>}
        </div>
      </div>
      <AudienceCards headingLevel="h2" />
    </div>
  );
}
