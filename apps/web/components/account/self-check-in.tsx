"use client";

import { httpsCallable } from "firebase/functions";
import { CheckCircle2, MapPinCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * Arrivée autonome (docs/16, phase 7) : pas d'hôte ; le participant appuie sur « Je suis arrivé·e » le jour J
 * (de 30 min avant à 1 h après le début), puis retrouve son groupe affiché juste en dessous.
 */
export function SelfCheckIn({ reservationId, state, arrived, onSiteHost, hasGroup }: { reservationId: string; state: "early" | "open" | "closed"; arrived: boolean; onSiteHost: boolean; hasGroup: boolean }) {
  const t = useTranslations("checkIn");
  const router = useRouter();
  const [done, setDone] = useState(arrived);
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const hint = onSiteHost ? t("hostHint") : hasGroup ? t("groupHint") : t("soloHint");
  return (
    <section aria-labelledby="check-in-title" className="card p-5" data-testid="self-check-in">
      <h2 id="check-in-title" className="flex items-center gap-2 font-display text-[1.45rem] font-medium text-brand-900">
        {done ? <CheckCircle2 className="size-6 text-brand-800" aria-hidden /> : <MapPinCheck className="size-6 text-brand-800" aria-hidden />}
        {done ? t("doneTitle") : t("title")}
      </h2>
      <p className="mt-1.5 text-[15px] text-ink/80">{done ? hint : state === "early" ? t("early") : t("text")}</p>
      {!done && state === "open" && (
        <button
          type="button"
          disabled={status === "busy"}
          onClick={async () => {
            setStatus("busy");
            try {
              if (FIREBASE_ENABLED) await httpsCallable(firebase().functions, "selfCheckIn")({ reservationId });
              setDone(true);
              setStatus("idle");
              router.refresh();
            } catch {
              setStatus("error");
            }
          }}
          className="btn btn-primary mt-4 w-full sm:w-auto"
        >
          {status === "busy" ? t("busy") : t("cta")}
        </button>
      )}
      {status === "error" && <p role="alert" className="mt-2 text-sm text-red-700">{t("error")}</p>}
    </section>
  );
}
