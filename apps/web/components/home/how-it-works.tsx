import type { Category } from "@thecommunity/shared";
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n-text";
import { categoryTone } from "@/lib/site";

/**
 * « Comment ça marche » en trois cartes légèrement inclinées et décalées (style Wenzy) :
 * 1) un aperçu du choix des univers, 2) un bouton vers les expériences, 3) trois photos de groupe (dîner, sport, jeux).
 */
export async function HowItWorks({ categories, showTitle = true }: { categories: Category[]; showTitle?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const card = "relative rounded-3xl p-6 shadow-float transition duration-300 hover:rotate-0 sm:p-7";
  return (
    <section aria-labelledby={showTitle ? "how-title" : undefined} aria-label={showTitle ? undefined : t("howTitle")} className={showTitle ? "py-16" : "pb-16"}>
      <h2 id="how-title" hidden={!showTitle} className="section-title text-center">{t("howTitle")}</h2>
      <ol className="mx-auto mt-10 grid max-w-6xl gap-8 px-2 md:grid-cols-3 md:gap-6 md:pt-6">
        <li className={`${card} -rotate-2 bg-white md:translate-y-6`}>
          <span className="font-display text-5xl text-brand-100">1</span>
          <h3 className="mt-1 text-xl font-semibold text-ink">{t("how1Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how1Text")}</p>
          {/* Aperçu du choix : trois univers en lignes (comme dans l'application), puis « + N autres ». */}
          <ul className="mt-5 space-y-2" aria-hidden>
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
        <li className={`${card} rotate-2 bg-brand-900 text-white md:-translate-y-2`}>
          <span className="font-display text-5xl text-white/30">2</span>
          <h3 className="mt-1 text-xl font-semibold">{t("how2Title")}</h3>
          <p className="mt-2 text-[15px] text-white/85">{t("how2Text")}</p>
          <Link href="/experiences" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-brand-900 shadow-float transition hover:bg-cream">
            {t("heroCta")}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
          </Link>
        </li>
        <li className={`${card} -rotate-1 bg-white md:translate-y-10`}>
          <span className="font-display text-5xl text-brand-100">3</span>
          <h3 className="mt-1 text-xl font-semibold text-ink">{t("how3Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how3Text")}</p>
          {/* Trois bandeaux (dîner, sport, jeux) légèrement inclinés et superposés : photos panoramiques, visages entiers. */}
          <div className="mt-5 -space-y-2" role="img" aria-label={t("howPhotosAlt")}>
            {[
              { src: "/images/photos/rencontre-groupe-diner.webp", cls: "-rotate-2" },
              { src: "/images/photos/rencontre-groupe-sport.webp", cls: "rotate-[1.5deg] z-10" },
              { src: "/images/photos/rencontre-groupe-jeux.webp", cls: "-rotate-1" },
            ].map((p) => (
              <div key={p.src} className={`relative aspect-[3/1] overflow-hidden rounded-2xl border-4 border-white shadow-card ${p.cls}`}>
                <Image src={p.src} alt="" fill sizes="(min-width: 768px) 22vw, 85vw" className="object-cover" />
              </div>
            ))}
          </div>
        </li>
      </ol>
    </section>
  );
}
