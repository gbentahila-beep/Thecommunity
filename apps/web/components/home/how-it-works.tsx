import type { Category } from "@thecommunity/shared";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { CATEGORY_STYLES } from "@/lib/site";

/**
 * « Comment ça marche » en trois cartes légèrement inclinées et décalées (style The Host Club) :
 * 1) les univers, 2) un bouton vers les expériences, 3) trois photos de groupe.
 */
export async function HowItWorks({ categories }: { categories: Category[] }) {
  const t = await getTranslations("home");
  const card = "relative rounded-[2rem] p-6 shadow-float transition duration-300 hover:rotate-0 sm:p-7";
  return (
    <section aria-labelledby="how-title" className="py-16">
      <h2 id="how-title" className="text-center font-display text-[1.75rem] leading-tight font-medium text-plum-900 sm:text-[2.25rem]">{t("howTitle")}</h2>
      <ol className="mx-auto mt-10 grid max-w-6xl gap-8 px-2 md:grid-cols-3 md:gap-6 md:pt-6">
        <li className={`${card} -rotate-2 bg-white md:translate-y-6`}>
          <span className="font-display text-5xl text-plum-100">1</span>
          <h3 className="mt-1 text-xl font-semibold text-ink">{t("how1Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how1Text")}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-hidden>
            {categories.map((c) => {
              const style = CATEGORY_STYLES[c.id];
              return (
                <li key={c.id} className={`grid size-11 place-items-center rounded-full ${style?.bg} ${style?.text}`}>
                  <CategoryIcon category={c.id} className="size-5" />
                </li>
              );
            })}
          </ul>
        </li>
        <li className={`${card} rotate-2 bg-gradient-to-br from-plum-900 via-plum-800 to-plum-700 text-white md:-translate-y-2`}>
          <span className="font-display text-5xl text-white/30">2</span>
          <h3 className="mt-1 text-xl font-semibold">{t("how2Title")}</h3>
          <p className="mt-2 text-[15px] text-white/85">{t("how2Text")}</p>
          <Link href="/experiences" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-plum-900 shadow-float transition hover:bg-cream">
            {t("heroCta")}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
          </Link>
        </li>
        <li className={`${card} -rotate-1 bg-white md:translate-y-10`}>
          <span className="font-display text-5xl text-plum-100">3</span>
          <h3 className="mt-1 text-xl font-semibold text-ink">{t("how3Title")}</h3>
          <p className="mt-2 text-[15px] text-muted">{t("how3Text")}</p>
          <div className="relative mt-5 h-40" role="img" aria-label={t("howPhotosAlt")}>
            {[
              { src: "/images/photos/comment-groupe-2.webp", cls: "start-0 top-2 -rotate-6 w-[45%] h-32" },
              { src: "/images/photos/comment-groupe-1.webp", cls: "start-[28%] top-0 rotate-3 w-[46%] h-36 z-10" },
              { src: "/images/photos/comment-groupe-3.webp", cls: "end-0 top-4 -rotate-2 w-[42%] h-32" },
            ].map((p) => (
              <div key={p.src} className={`absolute overflow-hidden rounded-2xl border-4 border-white shadow-card ${p.cls}`}>
                <Image src={p.src} alt="" fill sizes="(min-width: 768px) 12vw, 40vw" className="object-cover" />
              </div>
            ))}
          </div>
        </li>
      </ol>
    </section>
  );
}
