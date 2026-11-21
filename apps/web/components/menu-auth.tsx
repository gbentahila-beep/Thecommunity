"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/auth/client";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { useMember } from "@/lib/use-member";
import { ProfileCard } from "./profile-card";

/** Haut de la page Menu : la carte « Votre profil » d'une personne connectée. */
export function MenuProfile() {
  const member = useMember();
  return member ? <ProfileCard member={member} className="card px-4" /> : null;
}

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
        className="btn btn-secondary w-full"
      >
        {ta("logout")}
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <Link href="/connexion" className={`${primary} bg-plum-900 text-white hover:bg-plum-800`}>{t("login")}</Link>
      <Link href="/inscription" className={`${primary} border border-line bg-white text-plum-900 hover:border-plum-700`}>{t("signup")}</Link>
    </div>
  );
}
