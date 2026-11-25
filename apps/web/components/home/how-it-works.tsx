import type { Category } from "@thecommunity/shared";
import { ArrowRight, Check } from "lucide-react";
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
  const card = "relative flex flex-col rounded-3xl bg-white p-6 text-start ring-1 ring-line/70 sm:p-7";
  return (
    <section aria-labelledby={showTitle ? "how-title" : undefined} aria-label={showTitle ? undefined : t("howTitle")}>
      <h2 id="how-title" hidden={!showTitle} className="section-title section-head text-center">
        {t("howTitle")}
        <Bab name="wen" className="ms-2 inline-block w-12 align-[-8px]" />
      </h2>
      <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
        <li className={card}>
          <span className="font-display text-4xl font-semibold text-brand-700">1</span>
          <h3 className="mt-1 text-xl font-semibold text-ink">{t("how1Title")}</h3>
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
          <span className="font-display text-4xl font-semibold text-brand-700">2</span>
          <h3 className="mt-1 text-xl font-semibold text-ink">{t("how2Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how2Text")}</p>
          <Link href="/experiences" className="btn btn-primary group mt-6 inline-flex self-start">
            {t("heroCta")}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
          </Link>
        </li>
        <li className={card}>
          <span className="font-display text-4xl font-semibold text-brand-700">3</span>
          <h3 className="mt-1 text-xl font-semibold text-ink">{t("how3Title")}</h3>
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
