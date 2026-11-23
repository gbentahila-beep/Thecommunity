"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/member-avatar";
import { type MemberCard } from "@/lib/use-member";

/** Carte « Prénom Nom — Votre profil › » (menu burger, page Menu) : ouvre la page Mon profil. */
export function ProfileCard({ member, onNavigate, className = "" }: { member: MemberCard; onNavigate?: () => void; className?: string }) {
  const t = useTranslations("nav");
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  return (
    <Link href="/espace/compte" onClick={onNavigate} className={`flex items-center gap-3.5 rounded-2xl py-2 transition hover:bg-cream ${className}`} data-testid="profile-card">
      <MemberAvatar uid={member.uid} photoPath={member.photoPath} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold text-ink">{name || t("account")}</span>
        <span className="block text-sm text-muted">{t("yourProfile")}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}
