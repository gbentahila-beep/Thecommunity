"use client";

import { TABLE_MESSAGE_MAX } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/** Écrire à sa table après la rencontre (décision 39) : ni numéro ni réseaux affichés. */
export function TableChatForm({ groupId, open }: { groupId: string; open: boolean }) {
  const t = useTranslations("tableChat");
  const router = useRouter();
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  if (!open) return <p className="text-sm text-muted">{t("closed")}</p>;
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setState("busy");
        try {
          if (FIREBASE_ENABLED) {
            await firebase().auth.authStateReady();
            await httpsCallable(firebase().functions, "sendTableMessage")({ groupId, text: text.trim() });
          }
          setText("");
          setState("idle");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <label htmlFor="tc-text" className="block text-sm font-medium">{t("label")}</label>
      <textarea id="tc-text" rows={3} maxLength={TABLE_MESSAGE_MAX} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px]" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary btn-sm" disabled={state === "busy" || !text.trim()}>{state === "busy" ? t("busy") : t("send")}</button>
        <span className="text-xs text-muted">{t("privacy")}</span>
      </div>
      {state === "error" && <p role="alert" className="text-sm text-red-800">{t("error")}</p>}
    </form>
  );
}
