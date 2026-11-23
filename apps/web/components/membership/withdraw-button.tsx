"use client";

import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

/** Audit 23/11 — « Me rétracter » : carnet ou pass acheté il y a moins de 7 jours et pas encore utilisé. */
export function WithdrawButton({ paymentId, label, amount, until }: { paymentId: string; label: string; amount: string; until: string }) {
  const t = useTranslations("pass");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  return (
    <div className="rounded-2xl border border-line bg-white p-4" data-testid="withdraw">
      <p className="text-sm text-ink">{t("withdrawText", { label, amount, until })}</p>
      {!asking ? (
        <button type="button" onClick={() => setAsking(true)} className="mt-3 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">{t("withdrawCta")}</button>
      ) : (
        <div role="alertdialog" className="mt-3 space-y-2">
          <p className="text-sm font-medium text-ink">{t("withdrawConfirm", { label, amount })}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={state === "busy"}
              className="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={async () => {
                setState("busy");
                try {
                  await firebase().auth.authStateReady();
                  await httpsCallable(firebase().functions, "withdrawMembership")({ paymentId });
                  router.refresh();
                } catch {
                  setState("error");
                }
              }}
            >
              {state === "busy" ? t("withdrawBusy") : t("withdrawYes")}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">{t("withdrawKeep")}</button>
          </div>
          {state === "error" && <p role="alert" className="text-sm text-red-800">{t("withdrawError")}</p>}
        </div>
      )}
    </div>
  );
}
