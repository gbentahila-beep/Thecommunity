import type { Category } from "@thecommunity/shared";
import { ArrowRight, CalendarDays, Check, UsersRound, Wine } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n-text";
import { categoryTone } from "@/lib/site";
import { Bab } from "@/components/brand/bab";

/**
 * « Comment ça marche » en trois cartes légèrement inclinées et décalées (style Wenzy) :
 * 1) un aperçu du choix des univers, 2) un bouton vers les expériences, 3) trois photos de groupe (dîner, sport, jeux).
 */
export async function HowItWorks({ categories, showTitle = true }: { categories: Category[]; showTitle?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  // Étape 6 (docs/29) : cartes droites, même style que le reste du site (plus d'inclinaison).
  // Direction artistique (docs/29) : cartes blanches à ombre douce, rond pastel avec icône et numéro en dégradé.
  const card = "relative flex flex-col rounded-[1.75rem] bg-white p-6 text-start shadow-card sm:p-7";
  const head = (n: number, Icon: typeof Check, tone: "peach" | "lilac") => (
    <span className="flex items-center gap-3">
      <span className={`bub-${tone} grid size-16 shrink-0 place-items-center rounded-full`}><Icon className="size-7 text-ink" strokeWidth={1.6} aria-hidden /></span>
      <span className="step-num">{n}</span>
    </span>
  );
  return (
    <section aria-labelledby={showTitle ? "how-title" : undefined} aria-label={showTitle ? undefined : t("howTitle")}>
      <h2 id="how-title" hidden={!showTitle} className="section-title section-head text-center">
        {t("howTitle")}
        <Bab name="wen" className="ms-2 inline-block w-12 align-[-8px]" />
      </h2>
      <ol className="relative grid gap-4 md:grid-cols-3 md:gap-12">
        {[33.33, 66.66].map((x) => (
          <li key={x} aria-hidden className="pointer-events-none absolute top-24 z-10 hidden -translate-x-1/2 md:block" style={{ insetInlineStart: `${x}%` }}>
            <svg width="40" height="22" viewBox="0 0 44 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink rtl:-scale-x-100"><path d="M3 16 C15 4 29 4 40 12M33 7l7 5-8 3" /></svg>
          </li>
        ))}
        <li className={card}>
          {head(1, UsersRound, "peach")}
          <h3 className="mt-5 font-display text-2xl leading-tight font-semibold text-ink">{t("how1Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how1Text")}</p>
          {/* Aperçu du choix : trois univers en lignes (comme dans l'application), puis « + N autres ». */}
          <ul className="mt-5 space-y-2 text-start" aria-hidden>
            {categories.slice(0, 3).map((c, i) => {
              const style = categoryTone(c);
              return (
                <li key={c.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${i === 0 ? "bg-white shadow-card ring-2 ring-brand-800" : "bg-cream"}`}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${style.bg} ${style.text}`} style={style.style}>
                    <CategoryIcon category={c.id} icon={c.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{tr(c.shortName, locale)}</span>
                  {i === 0 && <Check className="size-4 shrink-0 text-brand-800" strokeWidth={3} />}
                </li>
              );
            })}
          </ul>
          {categories.length > 3 && <p className="mt-2.5 text-center text-xs font-medium text-muted" aria-hidden>{t("howMoreUniverses", { count: categories.length - 3 })}</p>}
        </li>
        <li className={card}>
          {head(2, CalendarDays, "lilac")}
          <h3 className="mt-5 font-display text-2xl leading-tight font-semibold text-ink">{t("how2Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how2Text")}</p>
          <Link href="/experiences" className="btn btn-primary group mt-6 inline-flex self-start">
            {t("heroCta")}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
          </Link>
        </li>
        <li className={card}>
          {head(3, Wine, "peach")}
          <h3 className="mt-5 font-display text-2xl leading-tight font-semibold text-ink">{t("how3Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how3Text")}</p>
          {/* Trois bandeaux (dîner, sport, jeux) légèrement inclinés et superposés : photos panoramiques, visages entiers. */}
          <div className="mt-5 space-y-2" role="img" aria-label={t("howPhotosAlt")}>
            {[
              { src: "/images/photos/rencontre-groupe-diner.webp", cls: "" },
              { src: "/images/photos/rencontre-groupe-sport.webp", cls: "" },
              { src: "/images/photos/rencontre-groupe-jeux.webp", cls: "" },
            ].map((p) => (
              <div key={p.src} className={`relative aspect-[3/1] overflow-hidden rounded-2xl ${p.cls}`}>
                <Image src={p.src} alt="" fill sizes="(min-width: 768px) 22vw, 85vw" className="object-cover" />
              </div>
            ))}
          </div>
        </li>
      </ol>
      {showTitle && (
        <p className="mt-12 text-center md:mt-16">
          <Link href="/comment-ca-marche#deroule" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 underline-offset-4 hover:underline">
            {t("howTimelineLink")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </p>
      )}
    </section>
  );
}
