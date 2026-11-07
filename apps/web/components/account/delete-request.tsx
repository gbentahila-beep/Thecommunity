"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Demande de suppression du compte (loi 09-08) : enregistrée dans dataRequests, traitée par l'équipe. */
export function DeleteRequest({ uid }: { uid: string }) {
  const t = useTranslations("preferences");
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "done" | "error">("idle");
  if (step === "done") return <p role="status" className="text-sm text-emerald-800">{t("deleteRequested")}</p>;
  if (step === "idle")
    return (
      <button type="button" onClick={() => setStep("confirm")} className="inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm font-semibold text-red-800 hover:underline">
        <Trash2 className="size-4" aria-hidden />
        {t("delete")}
      </button>
    );
  return (
    <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
      <p>{t("deleteExplain")}</p>
      {step === "error" && <p role="alert">{t("saveError")}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={step === "busy"}
          onClick={async () => {
            setStep("busy");
            try {
              await addDoc(collection(firebase().db, "dataRequests"), { userId: uid, type: "deletion", createdAt: serverTimestamp() });
              setStep("done");
            } catch {
              setStep("error");
            }
          }}
          className="rounded-full bg-red-800 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {t("deleteConfirm")}
        </button>
        <button type="button" onClick={() => setStep("idle")} className="rounded-full px-4 py-2 font-medium">{t("cancel")}</button>
      </div>
    </div>
  );
}
