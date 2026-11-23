import { answerIssues, answersInputSchema, type QuestionDef } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { refuse } from "./refuse";

/**
 * 18a — Réponses au questionnaire d'une expérience, envoyées par la personne qui a réservé.
 * Possible tant que l'expérience n'a pas commencé ; réponses vérifiées par rapport aux questions de l'expérience.
 * Si les groupes sont déjà proposés ou validés (pas encore révélés), l'équipe est prévenue qu'ils sont à revoir.
 */
export const submitQuestionnaire = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = answersInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, answers } = parsed.data;
  const ref = db.doc(`reservations/${reservationId}`);
  const r = (await ref.get()).data();
  if (!r || r.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  if (!["pending_payment", "confirmed"].includes(r.status)) refuse("not_active", "Cette réservation n'est plus active.");
  const start = (r.sessionSnapshot?.startAt as Timestamp | undefined)?.toMillis() ?? 0;
  if (start <= Date.now()) refuse("started", "L'expérience a déjà commencé.");
  const e = (await db.doc(`experiences/${r.experienceId}`).get()).data();
  const questions = (e?.questionnaire ?? []) as QuestionDef[];
  if (questions.length === 0) refuse("no_questionnaire", "Cette expérience n'a pas de questionnaire.");
  const issues = answerIssues(questions, answers);
  if (issues.length) invalidArgument(issues.map((i) => ({ path: ["answers", i.id], message: i.problem })));

  await ref.update({ questionnaire: { answers, answeredAt: FieldValue.serverTimestamp() }, updatedAt: FieldValue.serverTimestamp() });
  const sessRef = db.doc(`sessions/${r.sessionId}`);
  const groupsStatus = (await sessRef.get()).data()?.groupsStatus;
  if (groupsStatus === "proposed" || groupsStatus === "validated") await sessRef.update({ groupsNeedReview: true, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

/**
 * Invitation à remplir le questionnaire (notification), une seule fois par réservation, dès que la place est
 * confirmée. Ne fait rien si l'expérience n'a pas de questionnaire ou si les réponses sont déjà là.
 */
export async function notifyQuestionnaire(reservationId: string) {
  const ref = db.doc(`reservations/${reservationId}`);
  await db.runTransaction(async (tx) => {
    const r = (await tx.get(ref)).data();
    if (!r || r.questionnaire || r.questionnaireNotifiedAt) return;
    const e = (await tx.get(db.doc(`experiences/${r.experienceId}`))).data();
    if (!Array.isArray(e?.questionnaire) || e.questionnaire.length === 0) return;
    tx.update(ref, { questionnaireNotifiedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection(`users/${r.userId}/notifications`).doc(), {
      type: "questionnaire",
      title: { fr: "Deux minutes pour composer votre groupe", ar: "دقيقتان لتكوين مجموعتك", en: "Two minutes to shape your group" },
      body: {
        fr: "Répondez au court questionnaire de votre expérience (niveau, envies…) : il nous aide à vous placer avec les bonnes personnes.",
        ar: "أجب عن الاستبيان القصير لتجربتك (المستوى، الرغبات…): يساعدنا على وضعك مع الأشخاص المناسبين.",
        en: "Answer your experience's short questionnaire (level, preferences…): it helps us place you with the right people.",
      },
      link: `/espace/reservations/${reservationId}#questionnaire`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
