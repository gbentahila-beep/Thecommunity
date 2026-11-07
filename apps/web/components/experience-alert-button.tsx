"use client";

import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

/**
 * « Me prévenir des prochaines dates » (expérience sans date à venir). L'état est lu dans le navigateur
 * (la page publique reste en cache) ; l'inscription passe par le serveur.
 */
export function ExperienceAlertButton({ experienceId, slug }: { experienceId: string; slug: string }) {
  const t = useTranslations("experience");
  const [state, setState] = useState<"loading" | "anonymous" | "off" | "on">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const { auth, db } = firebase();
    auth.authStateReady().then(async () => {
      const user = auth.currentUser;
      if (!user) return alive && setState("anonymous");
      const snap = await getDoc(doc(db, "experienceAlerts", `${experienceId}_${user.uid}`)).catch(() => null);
      if (alive) setState(snap?.exists() ? "on" : "off");
    });
    return () => {
      alive = false;
    };
  }, [experienceId]);

  if (state === "loading") return null;
  if (state === "anonymous") {
    return (
      <Link href={`/connexion?suite=${encodeURIComponent(`/experiences/${slug}`)}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-plum-900 px-5 py-3 text-sm font-semibold text-white">
        <BellRing className="size-4" aria-hidden />
        {t("alertCta")}
      </Link>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={busy}
        aria-pressed={state === "on"}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            await httpsCallable(firebase().functions, "setExperienceAlert")({ experienceId, on: state !== "on" });
            setState(state === "on" ? "off" : "on");
          } catch {
            setError(true);
          }
          setBusy(false);
        }}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60 ${
          state === "on" ? "border border-plum-900 bg-white text-plum-900" : "bg-plum-900 text-white"
        }`}
      >
        <BellRing className="size-4" aria-hidden />
        {state === "on" ? t("alertOn") : t("alertCta")}
      </button>
      {state === "on" && <p className="text-center text-xs text-muted">{t("alertOnHint")}</p>}
      {error && <p role="alert" className="text-center text-xs text-red-800">{t("alertError")}</p>}
    </div>
  );
}
