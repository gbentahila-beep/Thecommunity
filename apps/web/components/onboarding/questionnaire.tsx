"use client";

import {
  BIO_MAX,
  INTERESTS,
  profileAboutSchema,
  profileGoalsSchema,
  profileIdentitySchema,
  profileInterestsSchema,
  SOCIAL_GOALS,
  SPOKEN_LANGUAGES,
  type ProfileInput,
} from "@thecommunity/shared";
import { Camera, Check, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ZodType } from "zod";
import { useRouter } from "@/i18n/navigation";

export type CityOption = { id: string; name: string; isActive: boolean };
type Values = Omit<ProfileInput, "gender"> & { gender?: ProfileInput["gender"] };
type Errors = Partial<Record<keyof Values, string>>;

const DRAFT_KEY = "tc:onboarding-draft";
const PHOTO_MAX = 3 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const STEPS: ZodType[] = [profileIdentitySchema, profileInterestsSchema, profileGoalsSchema, profileAboutSchema];

const EMPTY: Values = {
  firstName: "",
  lastName: "",
  phone: "",
  birthDate: "",
  cityId: "casablanca",
  gender: undefined,
  languages: [],
  interests: [],
  socialGoals: [],
  profession: "",
  bio: "",
};

const inputClass =
  "w-full rounded-2xl border bg-white px-4 py-3.5 text-[16px] text-ink outline-none transition focus:border-plum-700 focus:ring-2 focus:ring-plum-100";

export function Questionnaire({ cities, initial, editing }: { cities: CityOption[]; initial?: Partial<Values>; editing: boolean }) {
  const t = useTranslations("onboarding");
  const tl = useTranslations("labels");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<{ url: string; error?: string } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Reprise d'un brouillon enregistré sur l'appareil (pas en mode édition du profil).
  useEffect(() => {
    if (editing) return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { values?: Partial<Values>; step?: number };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration unique du brouillon local
        setValues((v) => ({ ...v, ...draft.values }));
        setStep(Math.min(Math.max(draft.step ?? 0, 0), STEPS.length - 1));
        setDraftRestored(true);
      }
    } catch {
      /* ignore */
    }
  }, [editing]);

  useEffect(() => () => { if (photo?.url) URL.revokeObjectURL(photo.url); }, [photo]);

  const save = (next: Values, nextStep: number) => {
    if (editing) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: next, step: nextStep }));
    } catch {
      /* ignore */
    }
  };

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    setErrors((e) => ({ ...e, [key]: undefined }));
    save(next, step);
  };

  const toggle = (key: "languages" | "interests" | "socialGoals", item: string) => {
    const list = values[key] as string[];
    set(key, (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]) as never);
  };

  const validate = () => {
    const result = STEPS[step]!.safeParse(values);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Errors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof Values;
      if (!next[field]) next[field] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const go = (target: number) => {
    setStep(target);
    save(values, target);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (step < STEPS.length - 1) return go(step + 1);
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step, completed: true }));
    } catch {
      /* ignore */
    }
    router.push("/espace");
  };

  const err = (key: keyof Values) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-1.5 text-sm text-red-700">
        {t(`errors.${errors[key]}` as "errors.required")}
      </p>
    ) : null;
  const aria = (key: keyof Values) => ({ "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `${key}-error` : undefined });
  const border = (key: keyof Values) => (errors[key] ? "border-red-400" : "border-line");

  const titles = [t("step1"), t("step2"), t("step3"), t("step4")];

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-muted">{t("step", { current: step + 1, total: STEPS.length })}</p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-plum-900" : "bg-line"}`} />
          ))}
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-6 font-display text-3xl font-medium text-plum-900 outline-none">
          {titles[step]}
        </h2>
        {draftRestored && step > 0 && <p className="mt-2 text-sm text-muted">{t("draftSaved")}</p>}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="f-firstName" className="mb-1.5 block text-sm font-medium">{t("firstName")}</label>
              <input className={`${inputClass} ${border("firstName")}`} id="f-firstName" value={values.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" {...aria("firstName")} />
              {err("firstName")}
            </div>
            <div>
              <label htmlFor="f-lastName" className="mb-1.5 block text-sm font-medium">{t("lastName")}</label>
              <input className={`${inputClass} ${border("lastName")}`} id="f-lastName" value={values.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" {...aria("lastName")} />
              {err("lastName")}
            </div>
          </div>
          <div>
            <label htmlFor="f-birthDate" className="mb-1.5 block text-sm font-medium">{t("birthDate")}</label>
            <input type="date" className={`${inputClass} ${border("birthDate")}`} id="f-birthDate" value={values.birthDate} onChange={(e) => set("birthDate", e.target.value)} autoComplete="bday" {...aria("birthDate")} />
            <span className="mt-1.5 block text-xs text-muted">{t("birthDateHint")}</span>
            {err("birthDate")}
          </div>
          <div>
            <label htmlFor="f-phone" className="mb-1.5 block text-sm font-medium">{t("phone")}</label>
            <input type="tel" dir="ltr" className={`${inputClass} ${border("phone")}`} id="f-phone" value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+212 6 …" {...aria("phone")} />
            {err("phone")}
          </div>
          <div>
            <label htmlFor="f-cityId" className="mb-1.5 block text-sm font-medium">{t("city")}</label>
            <select id="f-cityId" className={`${inputClass} ${border("cityId")}`} value={values.cityId} onChange={(e) => set("cityId", e.target.value)}>
              {cities.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.isActive}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t("gender")}</legend>
            <div className="flex flex-wrap gap-2">
              {(["female", "male", "undisclosed"] as const).map((g) => (
                <Chip key={g} selected={values.gender === g} onClick={() => set("gender", values.gender === g ? undefined : g)}>
                  {tl(`gender.${g}`)}
                </Chip>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t("genderHint")}</p>
          </fieldset>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-7">
          <fieldset {...aria("languages")}>
            <legend className="mb-2 text-sm font-medium">{t("languages")}</legend>
            <div className="flex flex-wrap gap-2">
              {SPOKEN_LANGUAGES.map((l) => (
                <Chip key={l} selected={values.languages.includes(l)} onClick={() => toggle("languages", l)}>
                  {tl(`languages.${l}`)}
                </Chip>
              ))}
            </div>
            {err("languages")}
          </fieldset>
          <fieldset {...aria("interests")}>
            <legend className="mb-2 text-sm font-medium">{t("interests")}</legend>
            <p className="-mt-1 mb-2 text-xs text-muted">{t("interestsHint")}</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip key={i} selected={values.interests.includes(i)} onClick={() => toggle("interests", i)}>
                  {tl(`interests.${i}`)}
                </Chip>
              ))}
            </div>
            {err("interests")}
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <fieldset {...aria("socialGoals")}>
          <legend className="mb-2 text-sm font-medium">{t("goals")}</legend>
          <p className="-mt-1 mb-3 text-xs text-muted">{t("goalsHint")}</p>
          <div className="grid gap-2.5">
            {SOCIAL_GOALS.map((g) => (
              <Chip key={g} selected={values.socialGoals.includes(g)} onClick={() => toggle("socialGoals", g)} block>
                {tl(`goals.${g}`)}
              </Chip>
            ))}
          </div>
          {err("socialGoals")}
        </fieldset>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <span className="mb-2 block text-sm font-medium">{t("photo")}</span>
            <div className="flex items-center gap-4">
              <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-plum-50 text-plum-700">
                {photo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), non optimisable par next/image
                  <img src={photo.url} alt="" className="size-full object-cover" />
                ) : (
                  <Camera className="size-7" aria-hidden />
                )}
              </span>
              <div className="space-y-1">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-plum-900 px-4 py-2 text-sm font-semibold text-plum-900 hover:bg-plum-50">
                  {t("choosePhoto")}
                  <input
                    type="file"
                    accept={PHOTO_TYPES.join(",")}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!PHOTO_TYPES.includes(file.type)) return setPhoto({ url: "", error: t("photoType") });
                      if (file.size > PHOTO_MAX) return setPhoto({ url: "", error: t("photoTooBig") });
                      setPhoto({ url: URL.createObjectURL(file) });
                    }}
                  />
                </label>
                {photo?.url && (
                  <button type="button" onClick={() => setPhoto(null)} className="ms-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                    <X className="size-4" aria-hidden />
                    {t("removePhoto")}
                  </button>
                )}
                <p className="text-xs text-muted">{t("photoHint")}</p>
                {photo?.error && <p className="text-sm text-red-700">{photo.error}</p>}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="f-profession" className="mb-1.5 block text-sm font-medium">{t("profession")}</label>
            <input className={`${inputClass} ${border("profession")}`} id="f-profession" value={values.profession ?? ""} onChange={(e) => set("profession", e.target.value)} autoComplete="organization-title" {...aria("profession")} />
            {err("profession")}
          </div>
          <div>
            <span className="mb-1.5 flex justify-between text-sm font-medium">
              <label htmlFor="f-bio">{t("bio")}</label>
              <span className="font-normal text-muted" aria-live="polite">{t("bioCount", { count: (values.bio ?? "").length, max: BIO_MAX })}</span>
            </span>
            <textarea
              id="f-bio"
              rows={4}
              maxLength={BIO_MAX}
              className={`${inputClass} ${border("bio")} resize-none`}
              value={values.bio ?? ""}
              onChange={(e) => set("bio", e.target.value)}
              {...aria("bio")}
            />
            {err("bio")}
          </div>
          <p className="flex items-start gap-2 rounded-2xl bg-plum-50 p-3.5 text-sm text-plum-900">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("finishNote")}
          </p>
        </div>
      )}

      <div className="mt-10 flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="rounded-full px-5 py-3.5 font-semibold text-plum-900 hover:bg-white">
            {t("back")}
          </button>
        )}
        <button type="submit" className="ms-auto rounded-full bg-plum-900 px-8 py-3.5 font-semibold text-white shadow-float transition hover:bg-plum-800 active:scale-[0.98]">
          {step < STEPS.length - 1 ? t("next") : t("finish")}
        </button>
      </div>
    </form>
  );
}

function Chip({ selected, onClick, children, block = false }: { selected: boolean; onClick: () => void; children: React.ReactNode; block?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${block ? "w-full justify-between rounded-2xl px-5 py-4 text-start text-[15px]" : ""} ${
        selected ? "border-plum-900 bg-plum-900 text-white" : "border-line bg-white text-ink hover:border-plum-200"
      }`}
    >
      {children}
      {selected && <Check className="size-4" aria-hidden />}
    </button>
  );
}
