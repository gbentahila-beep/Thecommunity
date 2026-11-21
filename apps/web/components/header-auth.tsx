"use client";

import { onAuthStateChanged } from "firebase/auth";
import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** En-tête (ordinateur) : « Se connecter » et « S'inscrire », ou l'accès au compte une fois connecté·e. */
export function HeaderAuth() {
  const t = useTranslations("nav");
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    return onAuthStateChanged(firebase().auth, (u) => setSignedIn(Boolean(u)));
  }, []);
  if (signedIn) {
    return (
      <Link href="/espace" aria-label={t("account")} className="relative grid size-11 place-items-center rounded-full bg-cream-deep text-plum-900 transition hover:bg-sand">
        <UserRound className="size-5" aria-hidden />
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Link href="/connexion" className="hidden rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap text-ink hover:bg-cream-deep xl:inline-flex">{t("login")}</Link>
      <Link href="/inscription" className="inline-flex h-10 items-center rounded-full bg-plum-900 px-4 text-sm font-semibold whitespace-nowrap text-white shadow-card hover:bg-plum-800">{t("signup")}</Link>
    </div>
  );
}
