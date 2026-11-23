"use client";

import { answerIssues, type QuestionDef, type QuestionnaireAnswers } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { QuestionnaireFields } from "@/components/account/questionnaire-fields";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PhysicalTermsCheckbox } from "@/components/booking/physical-terms";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authReady, bookingErrorOf } from "@/lib/booking-client";
import { firebase } from "@/lib/firebase/client";

/** Date complète : rejoindre ou quitter la liste d'attente. Aucune place ni aucun paiement à ce stade. */
export function WaitlistBox({ sessionId, maxSeats, position, questions = [], physical = false }: { sessionId: string; maxSeats: number; position: number | null; questions?: QuestionDef[]; physical?: boolean }) {
  const tq = useTranslations("questionnaire");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  // Audit 23/11 : activité physique → conditions acceptées dès l'inscription sur la liste (la place proposée en dépend).
  const [physicalOk, setPhysicalOk] = useState(false);
  const [physicalError, setPhysicalError] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const t = useTranslations("waitlist");
  const tb = useTranslations("booking");
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (name: "joinWaitlist" | "leaveWaitlist", data: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await authReady();
      await httpsCallable(firebase().functions, name)(data);
      router.refresh();
    } catch (err) {
      const reason = (err as { details?: { reason?: string } }).details?.reason;
      setError(reason === "seats_available" || reason === "already_waiting" ? t(`errors.${reason}`) : tb(`errors.${bookingErrorOf(err)}`));
    }
    setBusy(false);
  };

  return (
    <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
      {position !== null ? (
        <>
          <h2 className="font-semibold text-ink">{t("onListTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("onListText", { position })}</p>
          <button type="button" disabled={busy} onClick={() => run("leaveWaitlist", { sessionId })} className="mt-4 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-cream disabled:opacity-60">
            {busy ? tb("working") : t("leave")}
          </button>
        </>
      ) : (
        <>
          <h2 className="font-semibold text-ink">{t("joinTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("joinText")}</p>
          {maxSeats > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span id="wl-seats" className="text-sm font-medium text-ink">{tb("seatsLabel")}</span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="wl-seats">
                <button type="button" onClick={() => setSeats((n) => Math.max(1, n - 1))} disabled={seats <= 1 || busy} aria-label={tb("fewer")} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40">
                  <Minus className="size-4" aria-hidden />
                </button>
                <output aria-live="polite" className="w-5 text-center font-semibold">{seats}</output>
                <button type="button" onClick={() => setSeats((n) => Math.min(maxSeats, n + 1))} disabled={seats >= maxSeats || busy} aria-label={tb("more")} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40">
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
          {questions.length > 0 && (
            <div className="mt-4 space-y-4" data-testid="waitlist-questionnaire">
              <p className="text-sm font-medium text-ink">{tq("bookingTitle")}</p>
              <QuestionnaireFields idPrefix="wq" questions={questions} answers={answers} missing={missing} disabled={busy} onChange={(next, id) => { setAnswers(next); setMissing((m) => m.filter((x) => x !== id)); }} />
            </div>
          )}
          {physical && <div className="mt-4"><PhysicalTermsCheckbox checked={physicalOk} onChange={(v) => { setPhysicalOk(v); setPhysicalError(false); }} error={physicalError} disabled={busy} /></div>}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              // docs/22 § 17.H (H15) : le questionnaire se remplit en s'inscrivant ; il suit la place proposée.
              const issues = answerIssues(questions, answers);
              if (issues.length) return setMissing(issues.map((i) => i.id));
              if (physical && !physicalOk) return setPhysicalError(true);
              void run("joinWaitlist", { sessionId, seats, ...(questions.length ? { answers } : {}), ...(physical ? { physicalTermsAccepted: true } : {}) });
            }}
            className="btn btn-primary mt-4 w-full"
          >
            {busy ? tb("working") : t("join")}
          </button>
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    </section>
  );
}

/** Quitter une liste d'attente depuis « Mes réservations ». */
export function LeaveWaitlistButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations("waitlist");
  const tb = useTranslations("booking");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await authReady();
          await httpsCallable(firebase().functions, "leaveWaitlist")({ sessionId });
        } catch {
          /* état relu ci-dessous */
        }
        setBusy(false);
        router.refresh();
      }}
      className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-cream disabled:opacity-60"
    >
      {busy ? tb("working") : t("leave")}
    </button>
  );
}
