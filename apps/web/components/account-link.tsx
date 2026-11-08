"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UnreadBadge, useUnreadLabel } from "./unread-badge";

/** Icône du compte (en-tête, ordinateur), avec la pastille des notifications non lues (étape 13). */
export function AccountLink({ label }: { label: string }) {
  const t = useTranslations("nav");
  const aria = useUnreadLabel(label, (count) => t("unreadCount", { count }));
  return (
    <Link href="/espace" aria-label={aria} className="relative grid size-11 place-items-center rounded-full bg-cream-deep text-plum-900 transition hover:bg-sand">
      <UserRound className="size-5" aria-hidden />
      <UnreadBadge className="-end-0.5 -top-0.5" />
    </Link>
  );
}
