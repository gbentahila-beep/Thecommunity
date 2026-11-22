"use client";

import { answerIssues, type QuestionDef, type QuestionnaireAnswers } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { QuestionnaireFields } from "./questionnaire-fields";

/**
 * 18a — Questionnaire de l'expérience : rempli dans le tunnel, avant le paiement (docs/22), et modifiable ici jusqu'au début.
 * Réponses à choix uniquement ; vérifiées par le serveur, utilisées pour composer les groupes, effacées 30 jours après.
 */
export function QuestionnaireForm({ reservationId, questions, initial, editable }: { reservationId: string; questions: QuestionDef[]; initial: QuestionnaireAnswers | null; editable: boolean }) {
  const t = useTranslations("questionnaire");
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
      <QuestionnaireFields
        questions={questions}
        answers={answers}
        missing={missing}
        disabled={!editable || busy}
        onChange={(next, id) => { setAnswers(next); setMissing((m) => m.filter((x) => x !== id)); setJustSaved(false); }}
      />
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
