"use client";

import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Lien reçu par e-mail : confirmer (?confirmer=…) ou arrêter (?arreter=…) les alertes « nouvelles expériences ». */
export function AlertsLanding({ action, token }: { action: "confirm" | "stop" | null; token: string | null }) {
  const t = useTranslations("alerts");
  const [state, setState] = useState<"working" | "done" | "invalid" | "none" | "demo">(!action || !token ? "none" : FIREBASE_ENABLED ? "working" : "demo");

  useEffect(() => {
    if (!action || !token || !FIREBASE_ENABLED) return;
    const name = action === "confirm" ? "confirmNewExperienceAlerts" : "stopNewExperienceAlerts";
    httpsCallable<{ token: string }, { ok: boolean }>(firebase().functions, name)({ token })
      .then((r) => setState(r.data.ok ? "done" : "invalid"))
      .catch(() => setState("invalid"));
  }, [action, token]);

  const message =
    state === "working" ? t("working")
    : state === "demo" ? t("demo")
    : state === "invalid" ? t("invalid")
    : state === "none" ? t("noToken")
    : action === "confirm" ? t("confirmed")
    : t("stopped");

  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" data-testid="alerts-status" className="rounded-2xl bg-white p-5 text-brand-900 shadow-card">{message}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/experiences" className="btn btn-primary btn-sm">{t("seeExperiences")}</Link>
        <Link href="/" className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-brand-900">{t("backHome")}</Link>
      </div>
    </div>
  );
}
