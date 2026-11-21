"use client";

import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { BellRing, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { Honeypot } from "./honeypot";

type Prefs = { email: boolean; push: boolean; marketingEmail: boolean; newExperiences?: boolean };
type State = { kind: "loading" } | { kind: "visitor" } | { kind: "member"; uid: string; prefs: Prefs };

/**
 * Accueil, sous « Voir toutes les expériences » : « Soyez prévenu·e des nouvelles tables et activités ».
 * Membre connecté : un interrupteur (notificationPrefs.newExperiences). Visiteur : son e-mail, avec double
 * confirmation par e-mail (subscribeNewExperienceAlerts). Démonstration : rien n'est envoyé.
 */
export function NewExperienceAlerts() {
  const t = useTranslations("alerts");
  const locale = useLocale();
  const [state, setState] = useState<State>(FIREBASE_ENABLED ? { kind: "loading" } : { kind: "visitor" });
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error" | "limited" | "demo">("idle");

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    let alive = true;
    const { auth, db } = firebase();
    auth.authStateReady().then(async () => {
      const user = auth.currentUser;
      if (!user) return alive && setState({ kind: "visitor" });
      const snap = await getDoc(doc(db, "users", user.uid)).catch(() => null);
      const prefs = (snap?.get("notificationPrefs") as Prefs | undefined) ?? { email: true, push: false, marketingEmail: false };
      if (alive) setState({ kind: "member", uid: user.uid, prefs });
    });
    return () => {
      alive = false;
    };
  }, []);

  const input = "min-w-0 flex-1 rounded-full border border-line bg-white px-5 py-3 text-[16px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100";

  return (
    <section aria-labelledby="alerts-title" data-testid="home-alerts" className="relative mx-auto max-w-2xl rounded-[var(--radius-card)] bg-cream-deep p-6 text-center sm:p-8">
      <BellRing className="mx-auto size-7 text-plum-900" strokeWidth={1.5} aria-hidden />
      <h2 id="alerts-title" className="mt-3 font-display text-2xl leading-tight font-medium text-plum-900 sm:text-[1.75rem]">{t("title")}</h2>
      <p className="mt-2 text-[15px] text-muted">{t("text")}</p>

      {state.kind === "member" && (
        <div className="mt-5 space-y-2">
          <button
            type="button"
            aria-pressed={Boolean(state.prefs.newExperiences)}
            disabled={status === "busy"}
            onClick={async () => {
              const next = { ...state.prefs, newExperiences: !state.prefs.newExperiences };
              setStatus("busy");
              try {
                await updateDoc(doc(firebase().db, "users", state.uid), { notificationPrefs: next, updatedAt: serverTimestamp() });
                setState({ ...state, prefs: next });
                setStatus("idle");
              } catch {
                setStatus("error");
              }
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60 ${
              state.prefs.newExperiences ? "border border-plum-900 bg-white text-plum-900" : "bg-plum-900 text-white hover:bg-plum-800"
            }`}
          >
            {state.prefs.newExperiences ? <Check className="size-4" aria-hidden /> : <BellRing className="size-4" aria-hidden />}
            {state.prefs.newExperiences ? t("memberOn") : t("memberCta")}
          </button>
          {state.prefs.newExperiences && <p className="text-xs text-muted">{t("memberHint")}</p>}
          {status === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
        </div>
      )}

      {state.kind === "visitor" &&
        (status === "sent" || status === "demo" ? (
          <p role="status" className="mt-5 rounded-2xl bg-white p-4 text-sm text-plum-900">{status === "sent" ? t("sent") : t("demo")}</p>
        ) : (
          <form
            className="mt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (!FIREBASE_ENABLED) return setStatus("demo");
              setStatus("busy");
              try {
                await httpsCallable(firebase().functions, "subscribeNewExperienceAlerts")({
                  email: String(f.get("email")).trim(),
                  locale,
                  website: String(f.get("website") ?? ""),
                });
                setStatus("sent");
              } catch (err) {
                setStatus((err as { details?: { reason?: string } }).details?.reason === "rate_limited" ? "limited" : "error");
              }
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="alerts-email">{t("emailLabel")}</label>
              <input id="alerts-email" name="email" type="email" required maxLength={120} autoComplete="email" placeholder={t("emailPlaceholder")} className={input} />
              <button type="submit" disabled={status === "busy"} className="rounded-full bg-plum-900 px-6 py-3 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
                {status === "busy" ? t("sending") : t("submit")}
              </button>
            </div>
            <Honeypot />
            {(status === "error" || status === "limited") && <p role="alert" className="mt-3 text-sm text-red-700">{status === "limited" ? t("rateLimited") : t("error")}</p>}
            <p className="mt-3 text-xs text-muted">
              {t("privacy")}{" "}
              <Link href="/confidentialite" className="underline underline-offset-2">{t("privacyLink")}</Link>
            </p>
          </form>
        ))}
    </section>
  );
}
