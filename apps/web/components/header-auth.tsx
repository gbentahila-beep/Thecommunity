"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/member-avatar";
import { useMember } from "@/lib/use-member";

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
        <Link href="/espace/compte" aria-label={t("myProfile")} className="ms-1 rounded-full ring-2 ring-transparent transition hover:ring-brand-200">
          <MemberAvatar uid={member.uid} photoPath={member.photoPath} size={40} />
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
