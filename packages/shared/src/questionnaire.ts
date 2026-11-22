import { z } from "zod";
import type { LocalizedText } from "./types";

/**
 * Étape 18a — questionnaire d'une expérience (10 questions au plus), défini par l'équipe à la création
 * et rempli par chaque participant pendant sa réservation, avant le paiement (docs/22), modifiable ensuite. Les réponses servent uniquement à composer
 * les tables et les équipes (calcul fait chez nous, aucune donnée envoyée à un service externe)
 * et sont effacées 30 jours après l'expérience, comme le régime et les allergies.
 *
 * Deux sortes de questions, toutes à choix (pas de texte libre : rien à modérer, rien de sensible) :
 * - « choice » : réponses sans ordre (ex. « Vous venez plutôt pour… ») ;
 * - « ordered » : réponses dans l'ordre (ex. niveau Débutant → Confirmé, allure de course) :
 *   l'écart entre deux réponses compte.
 * Chaque question dit comment l'utiliser pour les groupes :
 * - « same » : réunir des personnes aux réponses proches (niveau de padel, allure) ;
 * - « mix » : mélanger les réponses (expérience au paintball, timides et bavards à table) ;
 * - « none » : information pour l'équipe seulement.
 */

export const QUESTIONNAIRE_MAX = 10;
export const QUESTION_OPTIONS_MIN = 2;
export const QUESTION_OPTIONS_MAX = 6;
export const QUESTION_KINDS = ["choice", "ordered"] as const;
export const QUESTION_MATCHES = ["same", "mix", "none"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];
export type QuestionMatch = (typeof QUESTION_MATCHES)[number];

export type QuestionDef = {
  id: string;
  kind: QuestionKind;
  label: LocalizedText;
  options: LocalizedText[];
  required: boolean;
  match: QuestionMatch;
};
/** Réponses : identifiant de question → numéro de la réponse choisie (0, 1, 2…). */
export type QuestionnaireAnswers = Record<string, number>;

const localized = (max: number, min = 1) =>
  z.object({
    fr: z.string().trim().min(min, "required").max(max, "tooLong"),
    ar: z.string().trim().max(max, "tooLong").optional().or(z.literal("")),
    en: z.string().trim().max(max, "tooLong").optional().or(z.literal("")),
  });

export const questionDefSchema = z.object({
  id: z.string().regex(/^q[a-z0-9]{1,12}$/),
  kind: z.enum(QUESTION_KINDS),
  label: localized(140, 3),
  options: z.array(localized(60)).min(QUESTION_OPTIONS_MIN, "optionsMin").max(QUESTION_OPTIONS_MAX, "optionsMax"),
  required: z.boolean().default(true),
  match: z.enum(QUESTION_MATCHES).default("same"),
});

export const questionnaireSchema = z
  .array(questionDefSchema)
  .max(QUESTIONNAIRE_MAX, "questionnaireMax")
  .default([])
  .superRefine((qs, ctx) => {
    const ids = new Set<string>();
    qs.forEach((q, i) => {
      if (ids.has(q.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: "duplicate" });
      ids.add(q.id);
    });
  });

/** Nettoie une question (traductions vides retirées) pour l'enregistrement. */
export function cleanQuestion(q: z.infer<typeof questionDefSchema>): QuestionDef {
  const lt = (t: { fr: string; ar?: string; en?: string }): LocalizedText => ({ fr: t.fr, ...(t.ar ? { ar: t.ar } : {}), ...(t.en ? { en: t.en } : {}) });
  return { id: q.id, kind: q.kind, label: lt(q.label), options: q.options.map(lt), required: q.required, match: q.match };
}

/** Réponses envoyées par le navigateur : identifiant de question → numéro de réponse. */
export const questionnaireAnswersSchema = z.record(z.string().regex(/^q[a-z0-9]{1,12}$/), z.number().int().min(0).max(QUESTION_OPTIONS_MAX - 1));

export const answersInputSchema = z.object({
  reservationId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  answers: questionnaireAnswersSchema,
});

/** Réponses valides pour ce questionnaire ? Renvoie les problèmes (vide = tout va bien). */
export function answerIssues(questions: QuestionDef[], answers: QuestionnaireAnswers): { id: string; problem: "required" | "invalid" | "unknown" }[] {
  const out: { id: string; problem: "required" | "invalid" | "unknown" }[] = [];
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const id of Object.keys(answers)) if (!byId.has(id)) out.push({ id, problem: "unknown" });
  for (const q of questions) {
    const a = answers[q.id];
    if (a === undefined) {
      if (q.required) out.push({ id: q.id, problem: "required" });
    } else if (!Number.isInteger(a) || a < 0 || a >= q.options.length) out.push({ id: q.id, problem: "invalid" });
  }
  return out;
}

/** Toutes les questions obligatoires ont une réponse ? */
export const questionnaireComplete = (questions: QuestionDef[], answers: QuestionnaireAnswers | undefined | null) =>
  questions.length === 0 || (answers != null && answerIssues(questions, answers).length === 0);

/** Texte d'une réponse dans une langue (repli sur le français). */
export const optionText = (q: QuestionDef, index: number, lang: "fr" | "ar" | "en" = "fr") => {
  const o = q.options[index];
  return o ? (o[lang] || o.fr) : "";
};

const L = (fr: string, en: string, ar: string): LocalizedText => ({ fr, en, ar });
const LEVELS = [L("Débutant", "Beginner", "مبتدئ"), L("Intermédiaire", "Intermediate", "متوسط"), L("Confirmé", "Advanced", "متمرّس")];

/** Modèles proposés à l'équipe (chargés puis modifiables dans le formulaire). */
export const QUESTIONNAIRE_TEMPLATES: { id: string; name: string; questions: QuestionDef[] }[] = [
  {
    id: "padel",
    name: "Padel (niveau)",
    questions: [
      { id: "qlevel", kind: "ordered", required: true, match: "same", label: L("Votre niveau de padel ?", "Your padel level?", "ما مستواك في البادل؟"), options: [L("Débutant : je découvre", "Beginner: just starting", "مبتدئ: أكتشف اللعبة"), L("Intermédiaire : je joue régulièrement", "Intermediate: I play regularly", "متوسط: ألعب بانتظام"), L("Confirmé : je joue en compétition ou presque", "Advanced: I play competitively", "متمرّس: ألعب بمستوى تنافسي تقريباً")] },
      { id: "qgoal", kind: "choice", required: true, match: "same", label: L("Vous jouez plutôt…", "You mostly play…", "تلعب غالباً…"), options: [L("Pour le plaisir", "For fun", "من أجل المتعة"), L("Pour progresser", "To improve", "من أجل التقدّم"), L("Pour gagner", "To win", "من أجل الفوز")] },
      { id: "qside", kind: "choice", required: false, match: "none", label: L("Votre côté préféré ?", "Your preferred side?", "جانبك المفضّل؟"), options: [L("Gauche", "Left", "اليسار"), L("Droite", "Right", "اليمين"), L("Peu importe", "No preference", "لا يهم")] },
    ],
  },
  {
    id: "running",
    name: "Course à pied (allure)",
    questions: [
      { id: "qpace", kind: "ordered", required: true, match: "same", label: L("Votre allure habituelle ?", "Your usual pace?", "سرعتك المعتادة؟"), options: [L("Plus de 7 min/km", "Slower than 7 min/km", "أكثر من 7 دقائق/كم"), L("6 à 7 min/km", "6 to 7 min/km", "من 6 إلى 7 دقائق/كم"), L("5 à 6 min/km", "5 to 6 min/km", "من 5 إلى 6 دقائق/كم"), L("Moins de 5 min/km", "Faster than 5 min/km", "أقل من 5 دقائق/كم")] },
      { id: "qdist", kind: "ordered", required: true, match: "same", label: L("Distance confortable aujourd'hui ?", "Comfortable distance today?", "المسافة المريحة لك حالياً؟"), options: [L("Moins de 5 km", "Under 5 km", "أقل من 5 كم"), L("5 à 10 km", "5 to 10 km", "من 5 إلى 10 كم"), L("Plus de 10 km", "Over 10 km", "أكثر من 10 كم")] },
      { id: "qtalk", kind: "choice", required: false, match: "same", label: L("En courant, vous aimez…", "While running, you like to…", "أثناء الجري تحب…"), options: [L("Discuter", "Chat", "الدردشة"), L("Courir en silence", "Run quietly", "الجري بصمت"), L("Un peu des deux", "A bit of both", "قليلاً من الاثنين")] },
    ],
  },
  {
    id: "paintball",
    name: "Paintball / jeu en équipe",
    questions: [
      { id: "qexp", kind: "ordered", required: true, match: "mix", label: L("Vous avez déjà joué ?", "Have you played before?", "هل لعبت من قبل؟"), options: [L("Jamais", "Never", "أبداً"), L("Une ou deux fois", "Once or twice", "مرة أو مرتين"), L("Souvent", "Often", "كثيراً")] },
      { id: "qstyle", kind: "choice", required: true, match: "same", label: L("Votre état d'esprit ?", "Your mindset?", "ما هي روحك في اللعب؟"), options: [L("Pour rigoler", "Just for fun", "للضحك والمتعة"), L("Pour gagner", "To win", "من أجل الفوز")] },
    ],
  },
  {
    id: "dinner",
    name: "Dîner / rencontre (personnalité)",
    questions: [
      { id: "qtalk", kind: "ordered", required: true, match: "mix", label: L("À table, vous êtes plutôt…", "At the table, you are more…", "على المائدة، أنت غالباً…"), options: [L("Celui ou celle qui écoute", "The listener", "من يستمع"), L("Un peu des deux", "A bit of both", "قليلاً من الاثنين"), L("Celui ou celle qui anime", "The one who gets things going", "من ينشّط الحديث")] },
      { id: "qtopic", kind: "choice", required: true, match: "same", label: L("Le sujet qui vous fait parler des heures ?", "The topic you could talk about for hours?", "الموضوع الذي تتحدث عنه لساعات؟"), options: [L("Voyages", "Travel", "السفر"), L("Culture et arts", "Culture and arts", "الثقافة والفنون"), L("Entrepreneuriat et travail", "Business and work", "ريادة الأعمال والعمل"), L("Sport et bien-être", "Sport and wellbeing", "الرياضة والعافية"), L("Cuisine", "Food", "الطبخ"), L("Société", "Society", "المجتمع")] },
      { id: "qgoal", kind: "choice", required: true, match: "same", label: L("Vous venez surtout pour…", "You're mainly coming to…", "تأتي أساساً من أجل…"), options: [L("Me faire de nouveaux amis", "Make new friends", "تكوين أصدقاء جدد"), L("Élargir mon réseau", "Widen my network", "توسيع شبكة معارفي"), L("Découvrir la ville et ses lieux", "Discover the city", "اكتشاف المدينة وأماكنها")] },
    ],
  },
  {
    id: "workshop",
    name: "Atelier (niveau)",
    questions: [
      { id: "qlevel", kind: "ordered", required: true, match: "same", label: L("Votre expérience dans cette activité ?", "Your experience with this activity?", "خبرتك في هذا النشاط؟"), options: [L("Jamais essayé", "Never tried", "لم أجرّب أبداً"), L("Quelques bases", "Some basics", "بعض الأساسيات"), L("À l'aise", "Comfortable", "مرتاح فيه")] },
    ],
  },
  {
    id: "level",
    name: "Niveau seul (Débutant / Intermédiaire / Confirmé)",
    questions: [{ id: "qlevel", kind: "ordered", required: true, match: "same", label: L("Votre niveau ?", "Your level?", "ما مستواك؟"), options: LEVELS }],
  },
];

/** Identifiant libre pour une nouvelle question (q1, q2… sans doublon). */
export function nextQuestionId(questions: { id: string }[]): string {
  for (let i = 1; ; i++) if (!questions.some((q) => q.id === `q${i}`)) return `q${i}`;
}
