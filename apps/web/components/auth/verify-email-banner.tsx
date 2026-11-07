"use client";

import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { MailWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

/** Rappel de confirmation d'e-mail (obligatoire pour réserver, contrôlé côté serveur en phase 4). */
export function VerifyEmailBanner() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(firebase().auth, () => setReady(true)), []);
  return (
    <div role="note" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <MailWarning className="size-5 shrink-0" aria-hidden />
      <span className="flex-1">{t("verifyBanner")}</span>
      <button
        type="button"
        disabled={!ready || sent}
        onClick={async () => {
          const user = firebase().auth.currentUser;
          if (user) await sendEmailVerification(user).catch(() => undefined);
          setSent(true);
        }}
        className="rounded-full border border-amber-300 bg-white px-3 py-1.5 font-medium disabled:opacity-60"
      >
        {sent ? t("resent") : t("resend")}
      </button>
      <button type="button" onClick={() => router.refresh()} className="rounded-full bg-amber-900 px-3 py-1.5 font-medium text-white">
        {t("iVerified")}
      </button>
    </div>
  );
}
