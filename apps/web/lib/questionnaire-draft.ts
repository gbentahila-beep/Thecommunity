import { nextQuestionId, type QuestionDef, type QuestionKind, type QuestionMatch } from "@thecommunity/shared";

/** 18a — Question telle qu'éditée dans le formulaire du back-office (traductions vides possibles). */
export type QuestionDraft = {
  id: string;
  kind: QuestionKind;
  match: QuestionMatch;
  required: boolean;
  label: { fr: string; ar: string; en: string };
  options: { fr: string; ar: string; en: string }[];
};

export const toDraft = (q: QuestionDef): QuestionDraft => ({
  id: q.id,
  kind: q.kind,
  match: q.match,
  required: q.required,
  label: { fr: q.label.fr, ar: q.label.ar ?? "", en: q.label.en ?? "" },
  options: q.options.map((o) => ({ fr: o.fr, ar: o.ar ?? "", en: o.en ?? "" })),
});

/** Nouvelle question « niveau » vide (échelle Débutant → Confirmé), modifiable. */
export const nextQuestionDraft = (existing: { id: string }[]): QuestionDraft => ({
  id: nextQuestionId(existing),
  kind: "ordered",
  match: "same",
  required: true,
  label: { fr: "", ar: "", en: "" },
  options: [
    { fr: "Débutant", ar: "مبتدئ", en: "Beginner" },
    { fr: "Intermédiaire", ar: "متوسط", en: "Intermediate" },
    { fr: "Confirmé", ar: "متمرّس", en: "Advanced" },
  ],
});
