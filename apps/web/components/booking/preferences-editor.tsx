"use client";

import type { BookingPreferences } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { needsConsent, PreferencesFields } from "./preferences-fields";

/** Modifier son régime, ses allergies ou ses langues de table depuis la réservation (jusqu'au début). */
export function PreferencesEditor({ reservationId, initial, editable }: { reservationId: string; initial: BookingPreferences; editable: boolean }) {
  const t = useTranslations("prefs");
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [consentError, setConsentError] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (needsConsent(v) && !v.consent) return setConsentError(true);
        setConsentError(false);
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "updateReservationPreferences")({ reservationId, preferences: { ...v, allergies: v.allergies.trim() } });
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <PreferencesFields idPrefix="edit-pref" value={v} onChange={(x) => { setV(x); setState("idle"); setConsentError(false); }} disabled={!editable || state === "busy"} consentError={consentError} />
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === "busy"} className="rounded-full border border-plum-900 px-5 py-2.5 text-sm font-semibold text-plum-900 hover:bg-plum-900 hover:text-white disabled:opacity-60">{t("save")}</button>
          {state === "saved" && <p role="status" className="text-sm text-emerald-800">{t("saved")}</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-800">{t("error")}</p>}
        </div>
      )}
    </form>
  );
}
