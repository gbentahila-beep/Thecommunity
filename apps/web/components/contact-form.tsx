"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Formulaire de contact : écrit dans contactMessages (format contrôlé par les règles Firestore). */
export function ContactForm() {
  const t = useTranslations("pages");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  if (state === "sent") return <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">{t("contactSent")}</p>;
  const input = "w-full rounded-2xl border border-line bg-white px-4 py-3 text-[16px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100";
  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState("busy");
        try {
          await addDoc(collection(firebase().db, "contactMessages"), {
            name: String(f.get("name")).trim(),
            email: String(f.get("email")).trim(),
            message: String(f.get("message")).trim(),
            createdAt: serverTimestamp(),
          });
          setState("sent");
        } catch {
          setState("error");
        }
      }}
    >
      <label className="block"><span className="mb-1.5 block text-sm font-medium">{t("contactName")}</span><input name="name" required maxLength={80} autoComplete="given-name" className={input} /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">{t("contactEmail")}</span><input name="email" type="email" required maxLength={120} autoComplete="email" className={input} /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">{t("contactMessage")}</span><textarea name="message" required minLength={10} maxLength={3000} rows={5} className={input} /></label>
      {state === "error" && <p role="alert" className="text-sm text-red-700">{t("contactError")}</p>}
      <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-6 py-3 font-semibold text-white hover:bg-plum-800 disabled:opacity-60">{t("contactSend")}</button>
    </form>
  );
}
