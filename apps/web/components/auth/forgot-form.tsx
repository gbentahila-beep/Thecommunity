"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/auth-card";
import { authErrorKey } from "@/lib/auth/client";
import { firebase } from "@/lib/firebase/client";

export function ForgotForm() {
  const t = useTranslations("auth");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");
  if (state === "sent") return <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("forgotSent")}</p>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError("");
        try {
          await sendPasswordResetEmail(firebase().auth, String(new FormData(e.currentTarget).get("email")).trim());
          setState("sent");
        } catch (err) {
          const key = authErrorKey(err);
          // Ne pas révéler si un compte existe : même message de succès pour « utilisateur inconnu ».
          if (key === "invalidCredentials") return setState("sent");
          setError(key);
          setState("idle");
        }
      }}
    >
      <Field label={t("email")} type="email" name="email" autoComplete="email" required />
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{t(`errors.${error}` as "errors.generic")}</p>}
      <button type="submit" disabled={state === "busy"} className="w-full rounded-full bg-plum-900 px-6 py-4 font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
        {state === "busy" ? t("loading") : t("forgotCta")}
      </button>
    </form>
  );
}
