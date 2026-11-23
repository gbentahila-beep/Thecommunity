"use client";

import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Field } from "@/components/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { Link, useRouter } from "@/i18n/navigation";
import { authErrorKey, safeNext, startServerSession } from "@/lib/auth/client";
import { firebase } from "@/lib/firebase/client";

export function SignupForm() {
  const t = useTranslations("auth");
  const tf = useTranslations("footer");
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Audit 23/11 : l'événement choisi avant l'inscription (?suite=/reserver/…) est gardé jusqu'au bout du questionnaire.
  const params = useSearchParams();
  const suite = params.get("suite") ? safeNext(params.get("suite"), "") : "";
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        if (form.get("consent") !== "on") return setError("consentRequired");
        setBusy(true);
        setError("");
        try {
          const { auth, functions } = firebase();
          const cred = await createUserWithEmailAndPassword(auth, String(form.get("email")).trim(), String(form.get("password")));
          await updateProfile(cred.user, { displayName: String(form.get("firstName")).trim() });
          await httpsCallable(functions, "acceptTerms")({ terms: true, privacy: true, codeOfConduct: true, marketing: form.get("marketing") === "on" });
          // Le lien de confirmation ramène à l'événement choisi (renvoyable depuis l'espace membre).
          await sendEmailVerification(cred.user, suite ? { url: `${window.location.origin}${suite}` } : undefined).catch(() => sendEmailVerification(cred.user).catch(() => undefined));
          await startServerSession(cred.user);
          router.replace(suite ? `/bienvenue?suite=${encodeURIComponent(suite)}` : "/bienvenue");
          router.refresh();
        } catch (err) {
          setError(authErrorKey(err));
          setBusy(false);
        }
      }}
    >
      <GoogleButton next={suite || null} marketing={() => (formRef.current?.elements.namedItem("marketing") as HTMLInputElement | null)?.checked === true} />
      <Field label={t("firstName")} name="firstName" autoComplete="given-name" required maxLength={50} />
      <Field label={t("email")} type="email" name="email" autoComplete="email" required />
      <div>
        <Field label={t("password")} type="password" name="password" autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-muted">{t("passwordHint")}</p>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink/80">
        <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-brand-900" />
        <span>
          {t("consent")}
          <span className="mt-1 flex flex-wrap gap-x-3 text-brand-900">
            <Link href="/cgu" className="underline underline-offset-2">{tf("terms")}</Link>
            <Link href="/confidentialite" className="underline underline-offset-2">{tf("privacy")}</Link>
            <Link href="/charte" className="underline underline-offset-2">{tf("charter")}</Link>
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink/80">
        <input type="checkbox" name="marketing" className="mt-0.5 size-5 shrink-0 accent-brand-900" />
        <span>{t("marketingOptIn")}</span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{t(`errors.${error}` as "errors.generic")}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? t("loading") : t("signupCta")}
      </button>
    </form>
  );
}
