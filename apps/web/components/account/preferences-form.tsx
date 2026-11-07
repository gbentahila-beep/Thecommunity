"use client";

import type { UserProfile } from "@thecommunity/shared";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Prefs = UserProfile["notificationPrefs"];
const KEY = "tc:demo-preferences";

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-start justify-between gap-6 py-4 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span>
        <span className="block font-medium text-ink">{label}</span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-plum-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-plum-700" />
        <span className="absolute start-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
      </span>
    </label>
  );
}

/** Préférences de notification. Phase 2 : enregistrées sur l'appareil ; phase 3 : dans users/{uid}.notificationPrefs. */
export function PreferencesForm({ initial }: { initial: Prefs }) {
  const t = useTranslations("preferences");
  const [prefs, setPrefs] = useState<Prefs>(initial);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique d'une valeur stockée côté navigateur
      if (saved) setPrefs({ ...initial, ...JSON.parse(saved) });
    } catch {
      /* ignore */
    }
  }, [initial]);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div className="divide-y divide-line">
        <Toggle label={t("emailNotif")} hint={t("emailNotifHint")} checked={prefs.email} onChange={(v) => update({ email: v })} />
        <Toggle label={t("pushNotif")} hint={t("pushNotifHint")} checked={false} disabled onChange={() => {}} />
        <Toggle label={t("marketing")} hint={t("marketingHint")} checked={prefs.marketingEmail} onChange={(v) => update({ marketingEmail: v })} />
      </div>
      <p className="mt-2 text-xs text-muted">{t("savedLocally")}</p>
    </div>
  );
}
