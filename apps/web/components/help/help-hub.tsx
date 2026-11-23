import { ArrowRight, BadgeCheck, CalendarCheck, CalendarCog, Compass, Handshake, MapPinCheck, MessageCircle, ShieldCheck, Store, UserRound, Utensils } from "lucide-react";
import { AudienceCards } from "@/components/audience-cards";
import { getTranslations } from "next-intl/server";
import { HELP_ARTICLES, HELP_CATEGORIES, HELP_HUB, helpLang, type HelpAudience, type HelpCategoryKey } from "@/content/help";
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
  "day-of": MapPinCheck,
  "org-start": Store,
  "org-run": CalendarCog,
};

/** Accueil du centre d'aide : recherche, trois publics (Participants, Lieux partenaires, Organisateurs), rubriques et articles. */
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
    `rounded-full px-3 py-2 text-[13px] font-semibold transition sm:px-5 sm:py-2.5 sm:text-sm ${active ? "bg-brand-900 text-white" : "text-brand-900 hover:bg-white"}`;
  return (
    <>
      <section className="bg-brand-50 pb-16 pt-12">
        <PageShell className="max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-700">{t("title")}</p>
          <h1 className="page-title mt-3">{t("heroTitle")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">{t("heroText")}</p>
        </PageShell>
      </section>
      <PageShell className="max-w-5xl">
        <HelpSearch index={index}>
          <nav aria-label={t("tabs")} className="mt-10 flex justify-center">
            <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-cream-deep p-1 [scrollbar-width:none]">
              {(["clients", "partners", "organizers"] as const).map((a) => (
                <Link key={a} href={HELP_HUB[a]} aria-current={audience === a ? "page" : undefined} className={`${tab(audience === a)} whitespace-nowrap`}>
                  {t(a === "clients" ? "tabClients" : a === "partners" ? "tabPartners" : "tabOrganizers")}
                </Link>
              ))}
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
                      <h2 id={`cat-${c.key}`} className="card-title">{c.title[lang]}</h2>
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
        <HelpContactCards />
      </PageShell>
    </>
  );
}

/** Bas de page commun : écrire à l'équipe, puis les encadrés lieux partenaires et organisateurs. */
export async function HelpContactCards() {
  const t = await getTranslations("help");
  return (
    <div className="mt-12 space-y-5" data-testid="help-contact-cards">
      <div className="info-box flex flex-col items-center">
        <MessageCircle className="size-7 text-brand-900" aria-hidden />
        <h2 className="mt-3 card-title">{t("contactTitle")}</h2>
        <p className="mt-2 text-ink/80">{t("contactText")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn btn-primary btn-sm">{t("contactCta")}</Link>
          <Link href="/faq" className="btn btn-secondary btn-sm">{t("faqCta")}</Link>

        </div>
      </div>
      <AudienceCards headingLevel="h2" />
    </div>
  );
}
