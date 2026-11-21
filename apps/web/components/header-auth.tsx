"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { initialsOf, useMember } from "@/lib/use-member";

/** En-tête (ordinateur) : « Se connecter » et « S'inscrire », ou les initiales (page Mon profil) une fois connecté·e. */
export function HeaderAuth() {
  const t = useTranslations("nav");
  const member = useMember();
  if (member === undefined) return null;
  if (member) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/espace/reservations" className="rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap text-ink hover:bg-cream-deep">{t("bookings")}</Link>
        <Link href="/espace/rencontres" className="rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap text-ink hover:bg-cream-deep">{t("meet")}</Link>
        <Link href="/espace/compte" aria-label={t("myProfile")} className="ms-1 grid size-10 place-items-center rounded-full bg-plum-100 text-sm font-semibold text-plum-900 transition hover:bg-plum-200">
          {initialsOf(member)}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Link href="/connexion" className="hidden rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap text-ink hover:bg-cream-deep xl:inline-flex">{t("login")}</Link>
      <Link href="/inscription" className="btn btn-primary btn-sm h-10 whitespace-nowrap">{t("signup")}</Link>
    </div>
  );
}
