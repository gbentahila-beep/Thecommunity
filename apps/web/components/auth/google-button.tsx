"use client";

import { getAdditionalUserInfo, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authErrorKey, safeNext, startServerSession } from "@/lib/auth/client";
import { firebase } from "@/lib/firebase/client";

const noop = () => () => undefined;

/**
 * Navigateurs intégrés (Instagram, Facebook, WhatsApp, TikTok, Snapchat…) : Google y refuse la connexion
 * (« disallowed_useragent »). On n'y montre pas le bouton, mais une invitation à ouvrir la page dans le navigateur.
 */
export function isInAppBrowser(ua: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview|; wv\)/i.test(ua);
}

/**
 * Audit du 23/11 — « Continuer avec Google » (inscription et connexion). Compte Google = e-mail déjà vérifié :
 * pas d'étape de confirmation. Nouveau compte : consentements enregistrés (texte d'acceptation sous le bouton,
 * prospection décochée sauf choix contraire), puis questionnaire, puis retour à l'événement choisi (`next`).
 */
export function GoogleButton({ next, marketing }: { next: string | null; marketing?: () => boolean }) {
  const t = useTranslations("auth");
  const tf = useTranslations("footer");
  const router = useRouter();
  // Lu côté navigateur seulement (false au rendu serveur) : le navigateur ne change pas pendant la visite.
  const inApp = useSyncExternalStore(noop, () => isInAppBrowser(navigator.userAgent), () => false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (inApp) return <p className="rounded-xl bg-cream px-4 py-3 text-sm text-ink/80" data-testid="google-in-app">{t("googleInApp")}</p>;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-5 py-3 text-[15px] font-semibold text-ink hover:bg-cream disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const { auth, functions } = firebase();
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            const cred = await signInWithPopup(auth, provider);
            const isNew = getAdditionalUserInfo(cred)?.isNewUser === true;
            if (isNew) await httpsCallable(functions, "acceptTerms")({ terms: true, privacy: true, codeOfConduct: true, marketing: marketing?.() === true });
            await startServerSession(cred.user);
            const target = safeNext(next, "/espace");
            if (isNew) router.replace(`/bienvenue${next ? `?suite=${encodeURIComponent(target)}` : ""}`);
            else if (target.startsWith("/admin")) return window.location.assign(target);
            else router.replace(target);
            router.refresh();
          } catch (err) {
            const code = (err as { code?: string }).code ?? "";
            if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError(code === "auth/popup-blocked" ? "popupBlocked" : authErrorKey(err));
            setBusy(false);
          }
        }}
      >
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
        </svg>
        {busy ? t("loading") : t("googleCta")}
      </button>
      <p className="text-center text-xs text-muted">
        {t("googleConsent")}{" "}
        <Link href="/cgu" className="underline underline-offset-2">{tf("terms")}</Link>,{" "}
        <Link href="/confidentialite" className="underline underline-offset-2">{tf("privacy")}</Link>,{" "}
        <Link href="/charte" className="underline underline-offset-2">{tf("charter")}</Link>.
      </p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{t(`errors.${error}` as "errors.generic")}</p>}
      <div className="flex items-center gap-3 pt-2 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
