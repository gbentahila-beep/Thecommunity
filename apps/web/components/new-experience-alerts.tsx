"use client";

import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Bell, BellRing, Check, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { Honeypot } from "./honeypot";
import { Sheet } from "./sheet";

export type AlertCity = { id: string; name: string; active: boolean };

type Prefs = { email: boolean; push: boolean; marketingEmail: boolean; newExperiences?: boolean };
type State = { kind: "loading" } | { kind: "visitor" } | { kind: "member"; uid: string; prefs: Prefs };

/**
 * Accueil, sous « Voir toutes les expériences » : une seule ligne « Soyez prévenu·e des nouvelles tables et
 * activités » qui ouvre une fenêtre. Membre connecté : un interrupteur (notificationPrefs.newExperiences).
 * Visiteur : ville + e-mail, avec double confirmation par e-mail (subscribeNewExperienceAlerts).
 * Démonstration : rien n'est envoyé.
 */
export function NewExperienceAlerts({ cities, defaultCity }: { cities: AlertCity[]; defaultCity: string }) {
  const t = useTranslations("alerts");
  const locale = useLocale();
  const [state, setState] = useState<State>(FIREBASE_ENABLED ? { kind: "loading" } : { kind: "visitor" });
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error" | "limited" | "demo">("idle");
  const [open, setOpen] = useState(false);

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

  const field = "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-[16px] text-ink outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100";
  const label = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <div data-testid="home-alerts">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="group mx-auto flex w-full max-w-xl items-center gap-3 rounded-full bg-white px-4 py-3 text-start shadow-card ring-1 ring-line transition hover:ring-plum-200"
        data-testid="home-alerts-open"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-plum-50 text-plum-900">
          <Bell className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-medium text-ink">{t("title")}</span>
        <ChevronRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("title")} closeLabel={t("close")} testId="alerts-sheet">
        <p className="text-[15px] leading-relaxed text-muted">{t("text")}</p>

        {state.kind === "loading" && <p className="mt-5 text-sm text-muted">{t("working")}</p>}

        {state.kind === "member" && (
          <div className="mt-5 space-y-3">
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
              className={`btn w-full ${state.prefs.newExperiences ? "btn-secondary" : "btn-primary"}`}
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
            <p role="status" className="mt-5 rounded-2xl bg-cream p-4 text-sm text-plum-900">{status === "sent" ? t("sent") : t("demo")}</p>
          ) : (
            <form
              className="mt-5 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (!FIREBASE_ENABLED) return setStatus("demo");
                setStatus("busy");
                try {
                  await httpsCallable(firebase().functions, "subscribeNewExperienceAlerts")({
                    email: String(f.get("email")).trim(),
                    cityId: String(f.get("city") ?? defaultCity),
                    locale,
                    website: String(f.get("website") ?? ""),
                  });
                  setStatus("sent");
                } catch (err) {
                  setStatus((err as { details?: { reason?: string } }).details?.reason === "rate_limited" ? "limited" : "error");
                }
              }}
            >
              <div>
                <label htmlFor="alerts-city" className={label}>{t("cityLabel")}</label>
                <select id="alerts-city" name="city" defaultValue={defaultCity} className={field}>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.active ? c.name : t("citySoon", { city: c.name })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="alerts-email" className={label}>{t("emailLabel")}</label>
                <input id="alerts-email" name="email" type="email" required maxLength={120} autoComplete="email" placeholder={t("emailPlaceholder")} className={field} />
              </div>
              <Honeypot />
              <button type="submit" disabled={status === "busy"} className="btn btn-primary w-full">
                {status === "busy" ? t("sending") : t("submit")}
              </button>
              {(status === "error" || status === "limited") && <p role="alert" className="text-sm text-red-700">{status === "limited" ? t("rateLimited") : t("error")}</p>}
              <p className="text-center text-xs text-muted">
                {t("onlyNew")}{" "}
                <Link href="/confidentialite" className="underline underline-offset-2">{t("privacyLink")}</Link>
              </p>
            </form>
          ))}
      </Sheet>
    </div>
  );
}
