"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Pages rangées sous « Mon profil » : un retour « ‹ Mon profil » en haut. */
const UNDER_PROFILE = ["/espace/profil", "/espace/preferences", "/espace/notifications", "/espace/historique", "/espace/factures", "/espace/proposer"];

export function AccountBack() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  if (!UNDER_PROFILE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <Link href="/espace/compte" className="-ms-1 mb-4 inline-flex items-center gap-1 rounded-full py-1 pe-3 text-sm font-semibold text-brand-900 hover:bg-white" data-testid="account-back">
      <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
      {t("myProfile")}
    </Link>
  );
}
