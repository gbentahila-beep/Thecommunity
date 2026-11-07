"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

/** Export des données personnelles (droit d'accès, loi 09-08). Phase 3 : généré par une Cloud Function. */
export function DataExport({ data }: { data: unknown }) {
  const t = useTranslations("preferences");
  return (
    <button
      type="button"
      onClick={() => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "the-community-mes-donnees.json";
        a.click();
        URL.revokeObjectURL(url);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-plum-900 px-5 py-2.5 text-sm font-semibold text-plum-900 transition hover:bg-plum-900 hover:text-white"
    >
      <Download className="size-4" aria-hidden />
      {t("export")}
    </button>
  );
}
