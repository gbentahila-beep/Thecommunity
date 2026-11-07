"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth-card";
import { Link, useRouter } from "@/i18n/navigation";
import { authErrorKey, safeNext, startServerSession } from "@/lib/auth/client";
import { firebase } from "@/lib/firebase/client";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("compte") === "suspendu" ? "suspended" : "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const cred = await signInWithEmailAndPassword(firebase().auth, String(form.get("email")).trim(), String(form.get("password")));
          await startServerSession(cred.user);
          const next = safeNext(params.get("suite"));
          // Le back-office n'est pas sous une langue : navigation complète.
          if (next.startsWith("/admin")) return window.location.assign(next);
          router.replace(next);
          router.refresh();
        } catch (err) {
          setError(authErrorKey(err));
          setBusy(false);
        }
      }}
    >
      <Field label={t("email")} type="email" name="email" autoComplete="email" required />
      <Field label={t("password")} type="password" name="password" autoComplete="current-password" required />
      <p className="text-end text-sm">
        <Link href="/mot-de-passe-oublie" className="text-plum-900 underline underline-offset-4">{t("forgot")}</Link>
      </p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{t(`errors.${error}` as "errors.generic")}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-full bg-plum-900 px-6 py-4 font-semibold text-white transition hover:bg-plum-800 disabled:opacity-60">
        {busy ? t("loading") : t("loginCta")}
      </button>
    </form>
  );
}
