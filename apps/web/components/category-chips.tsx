import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { CategoryIcon } from "./category-icon";

/** Puces de catégories. `hrefFor` construit le lien de chaque catégorie (undefined = « Tout »). */
export async function CategoryChips({
  active,
  hrefFor,
}: {
  active?: string;
  hrefFor: (categoryId?: string) => string;
}) {
  const [categories, locale, t] = await Promise.all([getCategories(), getLocale(), getTranslations("filters")]);
  const items = [{ id: undefined, label: t("all") }, ...categories.map((c) => ({ id: c.id, label: tr(c.shortName, locale) }))];
  return (
    <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <li key={item.id ?? "all"} className="shrink-0">
            <Link
              href={hrefFor(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-plum-900 bg-plum-900 text-white"
                  : "border-line bg-white/60 text-plum-900 hover:border-plum-200 hover:bg-white"
              }`}
            >
              {item.id && <CategoryIcon category={item.id} className="size-[18px]" />}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
