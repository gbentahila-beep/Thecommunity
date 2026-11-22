"use client";

import { QUESTION_OPTIONS_MAX, QUESTION_OPTIONS_MIN, QUESTIONNAIRE_MAX, QUESTIONNAIRE_TEMPLATES, type QuestionKind, type QuestionMatch } from "@thecommunity/shared";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { nextQuestionDraft, toDraft, type QuestionDraft } from "@/lib/questionnaire-draft";

export type { QuestionDraft };

const KINDS: { id: QuestionKind; label: string }[] = [
  { id: "ordered", label: "Échelle dans l'ordre (niveau, allure…)" },
  { id: "choice", label: "Choix sans ordre" },
];
const MATCHES: { id: QuestionMatch; label: string }[] = [
  { id: "same", label: "Réunir les réponses proches" },
  { id: "mix", label: "Mélanger les réponses" },
  { id: "none", label: "Information pour l'équipe seulement" },
];
const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100";

/**
 * 18a — Questionnaire d'une expérience (10 questions au plus), rempli par chaque participant après sa réservation.
 * Modèles prêts à l'emploi (padel, course, paintball, dîner, atelier), puis chaque question est modifiable.
 * Aucune question à réponse libre : uniquement des choix, pour composer les groupes sans rien de sensible.
 */
export function QuestionnaireEditor({ value, onChange, error }: { value: QuestionDraft[]; onChange: (v: QuestionDraft[]) => void; error?: string }) {
  const [template, setTemplate] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const update = (i: number, patch: Partial<QuestionDraft>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const applyTemplate = () => {
    const t = QUESTIONNAIRE_TEMPLATES.find((x) => x.id === template);
    if (!t) return;
    onChange(t.questions.map(toDraft));
    setConfirmReplace(false);
    setTemplate("");
  };

  return (
    <div className="space-y-4 sm:col-span-2" data-testid="questionnaire-editor">
      <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
        <p className="font-semibold">Questionnaire (facultatif, {QUESTIONNAIRE_MAX} questions au plus)</p>
        <p className="mt-1 text-brand-900/85">
          Chaque participant le remplit après sa réservation. Les réponses servent à composer les tables et les équipes (ex. 4 joueurs de même niveau par terrain de padel),
          puis sont effacées 30 jours après l&apos;expérience. Uniquement des choix, jamais de texte libre.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="q-template" className="mb-1 block text-sm font-medium text-ink">Partir d&apos;un modèle</label>
          <select id="q-template" value={template} onChange={(e) => { setTemplate(e.target.value); setConfirmReplace(false); }} className={`${input} w-auto`}>
            <option value="">— Choisir un modèle —</option>
            {QUESTIONNAIRE_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {template && !confirmReplace && (
          <button type="button" onClick={() => (value.length ? setConfirmReplace(true) : applyTemplate())} className="rounded-full border border-brand-900 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50">
            Utiliser ce modèle
          </button>
        )}
        {confirmReplace && (
          <span role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            Remplacer les {value.length} question{value.length > 1 ? "s" : ""} actuelle{value.length > 1 ? "s" : ""} ?
            <button type="button" onClick={applyTemplate} className="rounded-full bg-brand-900 px-3 py-1.5 font-semibold text-white">Oui, remplacer</button>
            <button type="button" onClick={() => setConfirmReplace(false)} className="rounded-full border border-line px-3 py-1.5">Non</button>
          </span>
        )}
      </div>

      {value.length === 0 && <p className="text-sm text-muted">Aucune question : les groupes seront composés avec le profil (langues, âges, centres d&apos;intérêt).</p>}

      <ol className="space-y-3">
        {value.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-line p-3" data-testid="question">
            <div className="flex items-start gap-2">
              <span className="mt-2 grid size-7 shrink-0 place-items-center rounded-full bg-brand-900 text-xs font-semibold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <label htmlFor={`q-${q.id}-label`} className="mb-1 block text-sm font-medium text-ink">Question (français)</label>
                  <input id={`q-${q.id}-label`} value={q.label.fr} maxLength={140} onChange={(e) => update(i, { label: { ...q.label, fr: e.target.value } })} className={input} placeholder="Ex. Votre niveau de padel ?" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`q-${q.id}-kind`} className="mb-1 block text-xs font-medium text-ink">Type de réponses</label>
                    <select id={`q-${q.id}-kind`} value={q.kind} onChange={(e) => update(i, { kind: e.target.value as QuestionKind })} className={input}>
                      {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`q-${q.id}-match`} className="mb-1 block text-xs font-medium text-ink">Pour composer les groupes</label>
                    <select id={`q-${q.id}-match`} value={q.match} onChange={(e) => update(i, { match: e.target.value as QuestionMatch })} className={input}>
                      {MATCHES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <fieldset>
                  <legend className="mb-1 text-xs font-medium text-ink">Réponses proposées {q.kind === "ordered" ? "(dans l'ordre, de la plus faible à la plus forte)" : ""}</legend>
                  <ul className="space-y-1.5">
                    {q.options.map((o, k) => (
                      <li key={k} className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`q-${q.id}-o${k}`}>Réponse {k + 1}</label>
                        <input id={`q-${q.id}-o${k}`} value={o.fr} maxLength={60} onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? { ...x, fr: e.target.value } : x)) })} className={input} />
                        <button type="button" aria-label={`Retirer la réponse ${k + 1}`} disabled={q.options.length <= QUESTION_OPTIONS_MIN} onClick={() => update(i, { options: q.options.filter((_, m) => m !== k) })} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-cream disabled:opacity-30">
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" disabled={q.options.length >= QUESTION_OPTIONS_MAX} onClick={() => update(i, { options: [...q.options, { fr: "", ar: "", en: "" }] })} className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-900 disabled:opacity-40">
                    <Plus className="size-4" aria-hidden /> Ajouter une réponse
                  </button>
                </fieldset>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} className="size-4 accent-brand-900" /> Réponse obligatoire
                </label>
                <details className="rounded-lg bg-cream/60 p-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-ink">Traductions arabe et anglaise (recommandé)</summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input aria-label="Question en arabe" dir="rtl" lang="ar" value={q.label.ar} maxLength={140} onChange={(e) => update(i, { label: { ...q.label, ar: e.target.value } })} className={input} placeholder="السؤال بالعربية" />
                    <input aria-label="Question en anglais" lang="en" value={q.label.en} maxLength={140} onChange={(e) => update(i, { label: { ...q.label, en: e.target.value } })} className={input} placeholder="Question in English" />
                    {q.options.map((o, k) => (
                      <div key={k} className="contents">
                        <input aria-label={`Réponse ${k + 1} en arabe`} dir="rtl" lang="ar" value={o.ar} maxLength={60} onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? { ...x, ar: e.target.value } : x)) })} className={input} placeholder={`${o.fr || `Réponse ${k + 1}`} (ar)`} />
                        <input aria-label={`Réponse ${k + 1} en anglais`} lang="en" value={o.en} maxLength={60} onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? { ...x, en: e.target.value } : x)) })} className={input} placeholder={`${o.fr || `Réponse ${k + 1}`} (en)`} />
                      </div>
                    ))}
                  </div>
                </details>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" aria-label={`Monter la question ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-cream disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
                <button type="button" aria-label={`Descendre la question ${i + 1}`} disabled={i === value.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-cream disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
                <button type="button" aria-label={`Supprimer la question ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-full text-red-700 hover:bg-red-50"><Trash2 className="size-4" aria-hidden /></button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" disabled={value.length >= QUESTIONNAIRE_MAX} onClick={() => onChange([...value, nextQuestionDraft(value)])} className="inline-flex items-center gap-1.5 rounded-full border border-brand-900 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-40">
        <Plus className="size-4" aria-hidden /> Ajouter une question ({value.length}/{QUESTIONNAIRE_MAX})
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
