"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

/** « Cet article vous a-t-il aidé ? » — enregistré anonymement (helpFeedback), consulté dans le back-office. */
export function HelpFeedback({ article }: { article: string }) {
  const t = useTranslations("help");
  const tf = useTranslations("footer");
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "busy" | "yes" | "no" | "error">("idle");

  async function send(helpful: boolean) {
    setState("busy");
    try {
      await addDoc(collection(firebase().db, "helpFeedback"), { article, helpful, locale, createdAt: serverTimestamp() });
      setState(helpful ? "yes" : "no");
    } catch {
      setState("error");
    }
  }

  if (state === "yes") return <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">{t("thanksYes")}</p>;
  if (state === "no")
    return (
      <p role="status" className="rounded-2xl bg-plum-50 p-4 text-plum-900">
        {t("thanksNo")}{" "}
        <Link href="/contact" className="font-semibold underline underline-offset-4">{tf("contact")}</Link>
      </p>
    );
  const btn = "inline-flex items-center gap-2 rounded-full border border-plum-900 px-5 py-2.5 text-sm font-semibold text-plum-900 transition hover:bg-plum-900 hover:text-white disabled:opacity-60";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
      <p className="me-auto font-semibold text-ink">{t("wasHelpful")}</p>
      <button type="button" className={btn} disabled={state === "busy"} onClick={() => send(true)}>
        <ThumbsUp className="size-4" aria-hidden />
        {t("yes")}
      </button>
      <button type="button" className={btn} disabled={state === "busy"} onClick={() => send(false)}>
        <ThumbsDown className="size-4" aria-hidden />
        {t("no")}
      </button>
      {state === "error" && <p role="alert" className="w-full text-sm text-red-700">{t("feedbackError")}</p>}
    </div>
  );
}
