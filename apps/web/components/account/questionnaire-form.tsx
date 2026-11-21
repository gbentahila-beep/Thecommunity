"use client";

import { answerIssues, optionText, type QuestionDef, type QuestionnaireAnswers } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

/**
 * 18a — Questionnaire de l'expérience, rempli après la réservation (modifiable jusqu'au début).
 * Réponses à choix uniquement ; vérifiées par le serveur, utilisées pour composer les groupes, effacées 30 jours après.
 */
export function QuestionnaireForm({ reservationId, questions, initial, editable }: { reservationId: string; questions: QuestionDef[]; initial: QuestionnaireAnswers | null; editable: boolean }) {
  const t = useTranslations("questionnaire");
  const lang = useLocale() as "fr" | "ar" | "en";
  const router = useRouter();
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initial ?? {});
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(Boolean(initial));
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const issues = answerIssues(questions, answers);
    if (issues.length) {
      setMissing(issues.map((i) => i.id));
      requestAnimationFrame(() => document.getElementById(`qq-${issues[0]!.id}`)?.focus());
      return;
    }
    setBusy(true);
    setError("");
    setJustSaved(false);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "submitQuestionnaire")({ reservationId, answers });
      setSaved(true);
      setJustSaved(true);
      router.refresh();
    } catch (err) {
      const reason = (err as { details?: { reason?: string } }).details?.reason;
      setError(reason === "started" ? t("errorStarted") : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5" data-testid="questionnaire-form">
      {questions.map((q, i) => {
        const label = q.label[lang] || q.label.fr;
        const isMissing = missing.includes(q.id);
        return (
          <fieldset key={q.id} id={`qq-${q.id}`} tabIndex={-1} aria-invalid={isMissing} aria-describedby={isMissing ? `qq-${q.id}-err` : undefined} className="space-y-2 outline-none">
            <legend className="mb-2 font-medium text-ink">
              {i + 1}. {label} {!q.required && <span className="text-sm font-normal text-muted">({t("optional")})</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {q.options.map((_, k) => {
                const on = answers[q.id] === k;
                return (
                  <label key={k} className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plum-700 ${on ? "border-plum-900 bg-plum-900 text-white" : "border-line bg-white text-ink hover:border-plum-700"} ${!editable ? "cursor-default opacity-70" : ""}`}>
                    <input
                      type="radio"
                      name={`qq-${q.id}`}
                      value={k}
                      checked={on}
                      disabled={!editable || busy}
                      onChange={() => { setAnswers((a) => ({ ...a, [q.id]: k })); setMissing((m) => m.filter((x) => x !== q.id)); setJustSaved(false); }}
                      className="sr-only"
                    />
                    {optionText(q, k, lang)}
                  </label>
                );
              })}
            </div>
            {isMissing && <p id={`qq-${q.id}-err`} role="alert" className="text-sm text-red-800">{t("required")}</p>}
          </fieldset>
        );
      })}
      {editable ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? t("saving") : saved ? t("update") : t("submit")}
          </button>
          {justSaved && <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-800"><CheckCircle2 className="size-4" aria-hidden /> {t("saved")}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("closed")}</p>
      )}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </form>
  );
}
