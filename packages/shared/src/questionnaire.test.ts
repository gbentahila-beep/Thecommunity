import { describe, expect, it } from "vitest";
import { insuranceState, outingProposalSchema, tooYoung } from "./activity";
import { experienceInputSchema } from "./experience-input";
import { composeGroups, groupWarnings, questionnaireCost, type MatchPerson } from "./matching";
import { answerIssues, cleanQuestion, nextQuestionId, QUESTIONNAIRE_TEMPLATES, questionnaireComplete, questionnaireSchema } from "./questionnaire";

const padel = QUESTIONNAIRE_TEMPLATES.find((t) => t.id === "padel")!.questions;
const questions = padel.map(({ id, kind, match }) => ({ id, kind, match }));
const person = (uid: string, level: number, extra: Partial<MatchPerson> = {}): MatchPerson => ({ uid, seats: 1, age: 30, languages: ["fr"], interests: [], answers: { qlevel: level, qgoal: 0 }, ...extra });

describe("questionnaire (18a)", () => {
  it("accepte les modèles et refuse plus de 10 questions ou des doublons", () => {
    for (const t of QUESTIONNAIRE_TEMPLATES) expect(questionnaireSchema.safeParse(t.questions).success).toBe(true);
    const many = Array.from({ length: 11 }, (_, i) => ({ ...padel[0]!, id: `q${i + 1}` }));
    expect(questionnaireSchema.safeParse(many).success).toBe(false);
    expect(questionnaireSchema.safeParse([padel[0], padel[0]]).success).toBe(false);
    expect(questionnaireSchema.safeParse([{ ...padel[0]!, options: [padel[0]!.options[0]] }]).success).toBe(false);
  });
  it("vérifie les réponses : obligatoires, dans la liste, questions connues", () => {
    expect(answerIssues(padel, { qlevel: 1, qgoal: 2 })).toEqual([]);
    expect(answerIssues(padel, { qlevel: 1 })).toEqual([{ id: "qgoal", problem: "required" }]);
    expect(answerIssues(padel, { qlevel: 3, qgoal: 0 })).toEqual([{ id: "qlevel", problem: "invalid" }]);
    expect(answerIssues(padel, { qlevel: 0, qgoal: 0, qzz: 1 })).toEqual([{ id: "qzz", problem: "unknown" }]);
    expect(questionnaireComplete(padel, { qlevel: 0, qgoal: 1 })).toBe(true);
    expect(questionnaireComplete(padel, null)).toBe(false);
    expect(questionnaireComplete([], null)).toBe(true);
  });
  it("retire les traductions vides et numérote les nouvelles questions", () => {
    const q = cleanQuestion({ ...padel[0]!, label: { fr: "Niveau ?", ar: "", en: "" } });
    expect(q.label).toEqual({ fr: "Niveau ?" });
    expect(nextQuestionId([{ id: "q1" }, { id: "q3" }])).toBe("q2");
  });
});

describe("composition par niveau (18a)", () => {
  it("met les écarts de niveau à un coût élevé, les réponses identiques à zéro", () => {
    expect(questionnaireCost([person("a", 0), person("b", 0)], questions)).toBe(0);
    expect(questionnaireCost([person("a", 0), person("b", 2)], questions)).toBe(50);
  });
  it("padel : 4 joueurs de même niveau par terrain", () => {
    const people = [0, 2, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1].map((lvl, i) => person(`p${i}`, lvl));
    const groups = composeGroups(people, { minSize: 4, targetSize: 4, maxSize: 4 }, { questions });
    expect(groups).toHaveLength(3);
    const level = new Map(people.map((p) => [p.uid, p.answers!.qlevel]));
    for (const g of groups) {
      expect(g).toHaveLength(4);
      expect(new Set(g.map((u) => level.get(u))).size).toBe(1);
    }
  });
  it("« mélanger » répartit les joueurs expérimentés (paintball)", () => {
    const pb = QUESTIONNAIRE_TEMPLATES.find((t) => t.id === "paintball")!.questions.map(({ id, kind, match }) => ({ id, kind, match }));
    const people = [0, 0, 2, 2].map((x, i) => ({ ...person(`p${i}`, 0), answers: { qexp: x, qstyle: 0 } }));
    const groups = composeGroups(people, { minSize: 2, targetSize: 2, maxSize: 2 }, { questions: pb });
    const exp = new Map(people.map((p) => [p.uid, p.answers.qexp]));
    for (const g of groups) expect(new Set(g.map((u) => exp.get(u))).size).toBe(2);
  });
  it("alerte l'équipe : niveaux éloignés, questionnaire non rempli", () => {
    const c = { minSize: 2, targetSize: 4, maxSize: 4 };
    expect(groupWarnings([person("a", 0), person("b", 2)], c, { questions })).toContain("level_gap");
    expect(groupWarnings([person("a", 0), person("b", 0, { answers: undefined })], c, { questions })).toContain("questionnaire_missing");
    expect(groupWarnings([person("a", 1), person("b", 1)], c, { questions })).not.toContain("level_gap");
  });
});

describe("activités (18b, 18c, 18d)", () => {
  it("âge minimum : jamais sous 18 ans, vérifié sur la date de naissance", () => {
    const on = new Date("2026-11-19T12:00:00Z");
    expect(tooYoung(21, "2006-01-01", on)).toBe(true);
    expect(tooYoung(21, "2005-11-19", on)).toBe(false);
    expect(tooYoung(18, "2008-01-01", on)).toBe(false);
    expect(tooYoung(null, "2008-01-01", on)).toBe(false);
  });
  it("assurance du lieu : absente, valable, bientôt expirée, expirée", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    expect(insuranceState(null, now)).toBe("missing");
    expect(insuranceState({ verified: true, expiresOn: "2027-06-30" }, now)).toBe("valid");
    expect(insuranceState({ verified: true, expiresOn: "2026-12-01" }, now)).toBe("expiring");
    expect(insuranceState({ verified: true, expiresOn: "2026-10-01" }, now)).toBe("expired");
  });
  it("proposition de sortie : champs essentiels exigés", () => {
    const ok = { title: "Padel du samedi", categoryId: "move", description: "Une partie de padel tous niveaux, suivie d'un café ensemble.", district: "Anfa", datesIdea: "Samedis matin", capacity: 8 };
    expect(outingProposalSchema.safeParse(ok).success).toBe(true);
    expect(outingProposalSchema.safeParse({ ...ok, description: "court" }).success).toBe(false);
    expect(outingProposalSchema.safeParse({ ...ok, capacity: 80 }).success).toBe(false);
  });
  it("fiche : âge minimum ≥ 18, questionnaire et précisions facultatifs", () => {
    const valid = {
      titleFr: "Padel entre inconnus", summaryFr: "Quatre joueurs de même niveau par terrain.", descriptionFr: "Une heure trente de padel en double, puis un verre ensemble.",
      categoryId: "move", cityId: "casablanca", district: "Anfa", venueName: "Club partenaire", address: "Rue X, Anfa, Casablanca",
      revealPolicy: "immediate", bookingMode: "group", groupMin: 4, groupTarget: 4, groupMax: 4, maxSeatsPerBooking: 1, priceDh: 150,
      durationMinutes: 90, languages: ["fr"], alcoholServed: false, cancellationPolicyId: "standard-48h", partnerId: "", economicsModel: "own",
      costPerSeatDh: 80, status: "draft", sessions: { firstDate: "2026-12-12", time: "10:00", weeks: 1, capacity: 16 },
    };
    const ok = experienceInputSchema.safeParse({ ...valid, level: "all", minAge: 21, outdoor: true, physicalActivity: true, questionnaire: padel, whatToBring: "Baskets" });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.questionnaire).toHaveLength(3);
    expect(experienceInputSchema.safeParse(valid).success).toBe(true);
    expect(experienceInputSchema.safeParse({ ...valid, minAge: 16 }).success).toBe(false);
  });
});
