"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

const TYPES = ["restaurant", "studio", "workshop", "venue", "organizer", "other"] as const;

/** Candidature partenaire : écrite dans partnerApplications (format contrôlé par les règles Firestore). */
export function PartnerApplicationForm() {
  const t = useTranslations("partner");
  const tf = useTranslations("footer");
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  if (state === "sent") return <p role="status" className="rounded-2xl bg-emerald-50 p-5 text-emerald-900">{t("sent")}</p>;
  const input = "w-full rounded-2xl border border-line bg-white px-4 py-3 text-[16px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100";
  const label = "mb-1.5 block text-sm font-medium";
  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const v = (k: string) => String(f.get(k) ?? "").trim();
        setState("busy");
        try {
          await addDoc(collection(firebase().db, "partnerApplications"), {
            contactName: v("contactName"),
            businessName: v("businessName"),
            type: v("type"),
            city: v("city"),
            email: v("email"),
            phone: v("phone"),
            link: v("link"),
            message: v("message"),
            locale,
            createdAt: serverTimestamp(),
          });
          setState("sent");
        } catch {
          setState("error");
        }
      }}
    >
      <h2 className="font-display text-2xl font-medium text-plum-900">{t("formTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className={label}>{t("contactName")}</span><input name="contactName" required maxLength={80} autoComplete="name" className={input} /></label>
        <label className="block"><span className={label}>{t("businessName")}</span><input name="businessName" required maxLength={120} autoComplete="organization" className={input} /></label>
        <label className="block">
          <span className={label}>{t("type")}</span>
          <select name="type" required defaultValue="" className={input}>
            <option value="" disabled>—</option>
            {TYPES.map((k) => <option key={k} value={k}>{t(`types.${k}`)}</option>)}
          </select>
        </label>
        <label className="block"><span className={label}>{t("city")}</span><input name="city" required maxLength={60} defaultValue="Casablanca" autoComplete="address-level2" className={input} /></label>
        <label className="block"><span className={label}>{t("email")}</span><input name="email" type="email" required maxLength={120} autoComplete="email" dir="ltr" className={input} /></label>
        <label className="block"><span className={label}>{t("phone")}</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" dir="ltr" className={input} /></label>
      </div>
      <label className="block"><span className={label}>{t("link")}</span><input name="link" maxLength={200} inputMode="url" dir="ltr" className={input} /></label>
      <label className="block">
        <span className={label}>{t("message")}</span>
        <textarea name="message" required minLength={20} maxLength={2000} rows={5} aria-describedby="partner-message-hint" className={input} />
        <span id="partner-message-hint" className="mt-1.5 block text-xs text-muted">{t("messageHint")}</span>
      </label>
      <p className="text-xs text-muted">
        {t("privacy")} <Link href="/confidentialite" className="underline underline-offset-2">{tf("privacy")}</Link>
      </p>
      {state === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
      <button type="submit" disabled={state === "busy"} className="w-full rounded-full bg-plum-900 px-6 py-3.5 font-semibold text-white hover:bg-plum-800 disabled:opacity-60 sm:w-auto">
        {state === "busy" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
