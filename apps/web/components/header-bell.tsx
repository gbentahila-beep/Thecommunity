"use client";

import { onAuthStateChanged } from "firebase/auth";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { UnreadBadge, useUnreadLabel } from "./unread-badge";

/**
 * Étape 32 — cloche des notifications dans l'en-tête (téléphone et ordinateur), pour les personnes connectées
 * (et en démonstration, où l'espace membre est visible). La pastille montre le nombre de non-lues.
 */
export function HeaderBell({ className = "", mobile = false }: { className?: string; /** Téléphone : seulement connecté·e (sinon le bouton « S'inscrire » occupe la place). */ mobile?: boolean }) {
  const t = useTranslations("nav");
  const aria = useUnreadLabel(t("notifications"), (count) => t("unreadCount", { count }));
  const [show, setShow] = useState(!FIREBASE_ENABLED && !mobile);
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    return onAuthStateChanged(firebase().auth, (u) => setShow(Boolean(u)));
  }, []);
  if (!show) return null;
  return (
    <Link href="/espace/notifications" aria-label={aria} data-testid="header-bell" className={`relative grid size-10 place-items-center rounded-full text-plum-900 transition hover:bg-cream-deep ${className}`}>
      <Bell className="size-5" aria-hidden />
      <UnreadBadge className="-end-0.5 -top-0.5" />
    </Link>
  );
}
