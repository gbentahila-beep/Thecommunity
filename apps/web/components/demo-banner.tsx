import { getTranslations } from "next-intl/server";
import { IS_DEMO } from "@/lib/data";

export async function DemoBanner() {
  if (!IS_DEMO) return null;
  const t = await getTranslations("demo");
  return (
    <div role="note" className="bg-plum-900 px-4 py-1.5 text-center text-xs text-plum-50">
      <span className="me-2 rounded-full bg-plum-50/15 px-2 py-0.5 font-semibold uppercase tracking-wide">
        {t("badge")}
      </span>
      {t("banner")}
    </div>
  );
}
