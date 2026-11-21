"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/auth/client";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Bas de la page Menu : « Se connecter » / « Créer un compte », ou « Se déconnecter » pour une personne connectée. */
export function MenuAuth() {
  const t = useTranslations("nav");
  const ta = useTranslations("auth");
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    return onAuthStateChanged(firebase().auth, (u) => setSignedIn(Boolean(u)));
  }, []);
  const primary = "flex min-h-13 w-full items-center justify-center rounded-full px-6 py-3.5 text-[16px] font-semibold transition";
  if (signedIn) {
    return (
      <button
        type="button"
        onClick={async () => {
          await logout();
          router.replace("/");
          router.refresh();
        }}
        className={`${primary} border border-line bg-white text-ink hover:border-plum-700`}
      >
        {ta("logout")}
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <Link href="/connexion" className={`${primary} bg-gradient-to-r from-plum-900 to-plum-700 text-white shadow-float hover:from-plum-800`}>{t("login")}</Link>
      <Link href="/inscription" className={`${primary} border border-line bg-white text-plum-900 hover:border-plum-700`}>{t("signup")}</Link>
    </div>
  );
}
