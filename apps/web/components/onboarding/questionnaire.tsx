"use client";

import {
  AGE_PREFERENCES,
  BIO_MAX,
  CONVERSATION_STYLES,
  EXERCISE_FREQUENCIES,
  GROUP_VIBES,
  HUMOR_STYLES,
  INTEREST_GROUPS,
  INTERESTS,
  INTERESTS_MAX,
  LIFE_VALUES,
  LIFE_VALUES_MAX,
  PROFILE_DIETS,
  profileSchema,
  REFERRAL_SOURCES,
  SECTORS,
  SOCIAL_GOALS,
  SPOKEN_LANGUAGES,
  SPORT_LEVELS,
  VENUE_BUDGETS,
  type ProfileInput,
} from "@thecommunity/shared";
import {
  ArrowLeft,
  AtSign,
  Briefcase,
  Cake,
  Camera,
  Check,
  Compass,
  Dumbbell,
  Gem,
  Heart,
  Languages,
  Laugh,
  Map as MapIcon,
  MapPin,
  Megaphone,
  MessagesSquare,
  Phone,
  Smile,
  Sparkles,
  Store,
  Trophy,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { firebase } from "@/lib/firebase/client";
import { Link, useRouter } from "@/i18n/navigation";

export type CityOption = { id: string; name: string; isActive: boolean };
type Values = Omit<ProfileInput, "gender"> & { gender?: ProfileInput["gender"] };
type Errors = Partial<Record<keyof Values, string>>;
type Key = keyof Values;

const DRAFT_PREFIX = "tc:onboarding-draft";
const PHOTO_MAX = 3 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  district: "",
  favoriteCategories: [],
  sportLevel: undefined,
  agePreference: "any",
  groupVibe: undefined,
  conversationStyle: undefined,
  humor: undefined,
  lifeValues: [],
  exerciseFrequency: undefined,
  venueBudget: undefined,
  diets: [],
  sector: undefined,
  referral: undefined,
  whatsapp: false,
  instagram: "",
};

const inputClass =
  "w-full rounded-2xl border bg-white px-4 py-3.5 text-[16px] text-ink outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-100";

type Question = { kind: "question"; id: string; icon: LucideIcon; fields: Key[]; optional?: boolean; auto?: boolean; body: ReactNode };
type Fact = { kind: "fact"; id: string; body: ReactNode };
type Step = Question | Fact;

/**
 * Inscription en questions (docs/16, phase 6) : une question par écran, barre de progression, retour, « Passer » pour
 * les questions facultatives, quelques cartes « Le saviez-vous ? » et une carte finale. Les réponses sont gardées
 * sur l'appareil au fil de l'eau, puis enregistrées par le serveur (completeProfile, même schéma) à la fin.
 * Mode édition (?edition=1&etape=…) : depuis Mon profil, on ouvre directement une question et on enregistre.
 */
export function Questionnaire({
  cities,
  categories = [],
  initial,
  editing,
  uid,
  startAt,
  continueTo,
}: {
  cities: CityOption[];
  categories?: { id: string; name: string }[];
  initial?: Partial<Values>;
  editing: boolean;
  /** Présent en mode Firebase : les réponses sont enregistrées dans le compte. */
  uid?: string;
  /** Mode édition : identifiant de la question à ouvrir. */
  startAt?: string;
  /** Audit 23/11 : événement choisi avant l'inscription (/reserver/…) : la carte finale y ramène. */
  continueTo?: string;
}) {
  const t = useTranslations("onboarding");
  const tl = useTranslations("labels");
  const router = useRouter();
  const [values, setValues] = useState<Values>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<{ url: string; error?: string; file?: File } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [done, setDone] = useState(false);
  const [moreInterests, setMoreInterests] = useState(false);
  /** Choix fait dans une liste à choix unique : on passe à la question suivante juste après (voir l'effet plus bas). */
  const [advance, setAdvance] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const DRAFT_KEY = `${DRAFT_PREFIX}:${uid ?? "demo"}`;

  const set = <K extends Key>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const toggle = (key: "languages" | "interests" | "socialGoals" | "favoriteCategories" | "lifeValues" | "diets", item: string, max?: number) => {
    const list = (values[key] ?? []) as string[];
    if (!list.includes(item) && max && list.length >= max) return;
    set(key, (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]) as never);
  };

  // ——— Briques d'affichage ———
  const err = (key: Key) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-1.5 text-sm text-red-700">
        {t(`errors.${errors[key]}` as "errors.required")}
      </p>
    ) : null;
  const aria = (key: Key) => ({ "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `${key}-error` : undefined });
  const border = (key: Key) => (errors[key] ? "border-red-400" : "border-line");
  const chips = (key: "languages" | "interests" | "socialGoals" | "favoriteCategories" | "lifeValues" | "diets", items: readonly { id: string; label: string }[], max?: number) => (
    <div className="flex flex-wrap gap-2" {...aria(key)}>
      {items.map((i) => (
        <Chip key={i.id} selected={((values[key] ?? []) as string[]).includes(i.id)} onClick={() => toggle(key, i.id, max)}>
          {i.label}
        </Chip>
      ))}
    </div>
  );
  /** Liste à choix unique : choisir passe à la question suivante (comme dans une application). */
  const options = <K extends Key>(key: K, items: readonly { id: Values[K]; label: string; hint?: string; disabled?: boolean; badge?: string }[], cols = 1) => (
    <div className={`grid gap-2.5 ${cols === 2 ? "grid-cols-2" : ""}`} role="radiogroup" {...aria(key)}>
      {items.map((o) => {
        const on = values[key] === o.id;
        return (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => {
              set(key, (on && current.kind === "question" && current.optional ? undefined : o.id) as Values[K]);
              if (!on) setAdvance(String(key));
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-start transition disabled:cursor-not-allowed disabled:opacity-60 ${
              on ? "bg-brand-900 text-white shadow-card" : "bg-white text-ink shadow-card ring-1 ring-line hover:ring-brand-200"
            }`}
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">{o.label}</span>
              {o.hint && <span className={`block text-[13px] ${on ? "text-white/80" : "text-muted"}`}>{o.hint}</span>}
            </span>
            {o.badge && <span className="shrink-0 rounded-full bg-cream-deep px-2 py-0.5 text-[11px] font-semibold text-ink/70">{o.badge}</span>}
            {on && <Check className="size-4 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
  const fact = (id: string, children: ReactNode): Fact => ({
    kind: "fact",
    id,
    body: (
      <div className="rounded-3xl bg-brand-50 p-6 text-ink ring-1 ring-brand-100 sm:p-8">
        {/* Le titre « Le saviez-vous ? » est lu une fois (titre masqué de l'écran) : le surtitre visible est décoratif. */}
        <p aria-hidden className="text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase">{t("facts.eyebrow")}</p>
        {children}
      </div>
    ),
  });

  const steps: Step[] = [
    {
      kind: "question", id: "name", icon: UserRound, fields: ["firstName", "lastName"],
      body: (
        <div className="space-y-4">
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
      ),
    },
    {
      kind: "question", id: "birth", icon: Cake, fields: ["birthDate"],
      body: (
        <div>
          <label htmlFor="f-birthDate" className="mb-1.5 block text-sm font-medium">{t("birthDate")}</label>
          <input type="date" className={`${inputClass} ${border("birthDate")}`} id="f-birthDate" value={values.birthDate} onChange={(e) => set("birthDate", e.target.value)} autoComplete="bday" {...aria("birthDate")} />
          {err("birthDate")}
        </div>
      ),
    },
    {
      kind: "question", id: "gender", icon: Smile, fields: ["gender"], optional: true, auto: true,
      body: options("gender", (["female", "male", "undisclosed"] as const).map((g) => ({ id: g, label: tl(`gender.${g}`) }))),
    },
    {
      kind: "question", id: "city", icon: MapPin, fields: ["cityId"], auto: true,
      body: options("cityId", cities.map((c) => ({ id: c.id, label: c.name, disabled: !c.isActive, badge: c.isActive ? undefined : t("soon") }))),
    },
    {
      kind: "question", id: "district", icon: MapIcon, fields: ["district"], optional: true,
      body: (
        <div>
          <label htmlFor="f-district" className="mb-1.5 block text-sm font-medium">{t("district")}</label>
          <input className={`${inputClass} ${border("district")}`} id="f-district" value={values.district ?? ""} maxLength={60} placeholder={t("districtPlaceholder")} onChange={(e) => set("district", e.target.value)} {...aria("district")} />
          {err("district")}
        </div>
      ),
    },
    {
      kind: "question", id: "languages", icon: Languages, fields: ["languages"],
      body: <>{chips("languages", SPOKEN_LANGUAGES.map((l) => ({ id: l, label: tl(`languages.${l}`) })))}{err("languages")}</>,
    },
    {
      kind: "question", id: "interests", icon: Heart, fields: ["interests"],
      body: (
        <div className="space-y-4">
          <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900" aria-live="polite">{t("chosen", { count: values.interests.length, max: INTERESTS_MAX })}</p>
          {chips("interests", INTERESTS.map((i) => ({ id: i, label: tl(`interests.${i}`) })), INTERESTS_MAX)}
          {moreInterests &&
            INTEREST_GROUPS.map((g) => (
              <div key={g.key}>
                <p className="eyebrow mb-2">{tl(`interestGroups.${g.key}`)}</p>
                {chips("interests", g.items.map((i) => ({ id: i, label: tl(`interests.${i}`) })), INTERESTS_MAX)}
              </div>
            ))}
          <div className="text-center">
            <button type="button" onClick={() => setMoreInterests((m) => !m)} className="btn btn-secondary btn-sm">{moreInterests ? t("showLess") : t("showMore")}</button>
          </div>
          {err("interests")}
        </div>
      ),
    },
    fact(
      "fact-hours",
      <>
        <p className="mt-3 font-display leading-none"><span className="text-6xl">{t("facts.hours.big")}</span> <span className="text-2xl">{t("facts.hours.unit")}</span></p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/85">{t("facts.hours.text")}</p>
        <p className="mt-3 text-xs text-muted">{t("facts.hours.source")}</p>
      </>,
    ),
    {
      kind: "question", id: "goals", icon: Compass, fields: ["socialGoals"],
      body: <>{chips("socialGoals", SOCIAL_GOALS.map((g) => ({ id: g, label: tl(`goals.${g}`) })))}{err("socialGoals")}</>,
    },
    ...(categories.length > 0
      ? [{ kind: "question", id: "universes", icon: Sparkles, fields: ["favoriteCategories"], optional: true, body: <>{chips("favoriteCategories", categories.map((c) => ({ id: c.id, label: c.name })), 5)}{err("favoriteCategories")}</> } satisfies Question]
      : []),
    {
      kind: "question", id: "vibe", icon: Users, fields: ["groupVibe"], optional: true, auto: true,
      body: options("groupVibe", GROUP_VIBES.map((v) => ({ id: v, label: tl(`vibe.${v}`), hint: tl(`vibeHint.${v}`) }))),
    },
    {
      kind: "question", id: "conversation", icon: MessagesSquare, fields: ["conversationStyle"], optional: true, auto: true,
      body: options("conversationStyle", CONVERSATION_STYLES.map((n) => ({ id: n, label: `${n}  ·  ${tl(`conversation.${n}`)}` }))),
    },
    fact(
      "fact-liking",
      <>
        <p className="mt-3 font-display text-[1.7rem] leading-tight">{t("facts.liking.title")}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">{t("facts.liking.text")}</p>
        <p className="mt-3 text-xs text-muted">{t("facts.liking.source")}</p>
      </>,
    ),
    {
      kind: "question", id: "humor", icon: Laugh, fields: ["humor"], optional: true, auto: true,
      body: options("humor", HUMOR_STYLES.map((h) => ({ id: h, label: tl(`humor.${h}`) }))),
    },
    {
      kind: "question", id: "values", icon: Gem, fields: ["lifeValues"], optional: true,
      body: (
        <div className="space-y-3">
          <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900" aria-live="polite">{t("chosen", { count: values.lifeValues.length, max: LIFE_VALUES_MAX })}</p>
          {chips("lifeValues", LIFE_VALUES.map((v) => ({ id: v, label: tl(`values.${v}`) })), LIFE_VALUES_MAX)}
          {err("lifeValues")}
        </div>
      ),
    },
    {
      kind: "question", id: "exercise", icon: Dumbbell, fields: ["exerciseFrequency"], optional: true, auto: true,
      body: options("exerciseFrequency", EXERCISE_FREQUENCIES.map((f) => ({ id: f, label: tl(`exercise.${f}`) }))),
    },
    {
      kind: "question", id: "sport", icon: Trophy, fields: ["sportLevel"], optional: true, auto: true,
      body: options("sportLevel", SPORT_LEVELS.map((l) => ({ id: l, label: t(`sportLevel_${l}`) }))),
    },
    {
      kind: "question", id: "budget", icon: Store, fields: ["venueBudget"], optional: true, auto: true,
      body: options("venueBudget", VENUE_BUDGETS.map((b) => ({ id: b, label: tl(`budget.${b}`), hint: tl(`budgetHint.${b}`) }))),
    },
    {
      kind: "question", id: "diet", icon: UtensilsCrossed, fields: ["diets"], optional: true,
      body: chips("diets", PROFILE_DIETS.map((d) => ({ id: d, label: tl(`profileDiets.${d}`) }))),
    },
    {
      kind: "question", id: "sector", icon: Briefcase, fields: ["sector"], optional: true, auto: true,
      body: options("sector", SECTORS.map((s) => ({ id: s, label: tl(`sector.${s}`) })), 2),
    },
    {
      kind: "question", id: "age", icon: Users, fields: ["agePreference"], optional: true, auto: true,
      body: options("agePreference", AGE_PREFERENCES.map((a) => ({ id: a, label: t(`agePreference_${a}`) }))),
    },
    fact(
      "fact-meals",
      <>
        <p className="mt-3 font-display text-[1.7rem] leading-tight">{t("facts.meals.title")}</p>
        <p className="mt-1 text-ink/85">{t("facts.meals.subtitle")}</p>
        <hr className="my-4 border-brand-100" />
        <p className="text-[15px] leading-relaxed text-ink/85">{t("facts.meals.text")}</p>
        <p className="mt-3 text-xs text-muted">{t("facts.meals.source")}</p>
      </>,
    ),
    {
      kind: "question", id: "referral", icon: Megaphone, fields: ["referral"], optional: true,
      body: (
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {REFERRAL_SOURCES.map((r) => (
            <Chip key={r} selected={values.referral === r} onClick={() => set("referral", values.referral === r ? undefined : r)}>
              {tl(`referral.${r}`)}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      kind: "question", id: "phone", icon: Phone, fields: ["phone", "whatsapp"], optional: true,
      body: (
        <div className="space-y-3">
          <div>
            <label htmlFor="f-phone" className="mb-1.5 block text-sm font-medium">{t("phone")}</label>
            <input type="tel" dir="ltr" className={`${inputClass} ${border("phone")}`} id="f-phone" value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+212 6 …" {...aria("phone")} />
            {err("phone")}
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-[15px] shadow-card ring-1 ring-line">
            <input type="checkbox" checked={values.whatsapp} onChange={(e) => set("whatsapp", e.target.checked)} className="size-5 accent-brand-900" />
            {t("whatsapp")}
          </label>
        </div>
      ),
    },
    {
      kind: "question", id: "instagram", icon: AtSign, fields: ["instagram"], optional: true,
      body: (
        <div>
          <label htmlFor="f-instagram" className="mb-1.5 block text-sm font-medium">{t("instagramLabel")}</label>
          <input dir="ltr" className={`${inputClass} ${border("instagram")}`} id="f-instagram" value={values.instagram ?? ""} maxLength={31} placeholder={t("instagramPlaceholder")} onChange={(e) => set("instagram", e.target.value)} autoCapitalize="none" {...aria("instagram")} />
          {err("instagram")}
        </div>
      ),
    },
    {
      kind: "question", id: "photo", icon: Camera, fields: ["bio"], optional: true,
      body: (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-brand-700">
              {photo?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), non optimisable par next/image
                <img src={photo.url} alt="" className="size-full object-cover" />
              ) : (
                <Camera className="size-7" aria-hidden />
              )}
            </span>
            <div className="space-y-1">
              <label className="btn btn-secondary btn-sm cursor-pointer">
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
                    setPhoto({ url: URL.createObjectURL(file), file });
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
          <div>
            <span className="mb-1.5 flex justify-between text-sm font-medium">
              <label htmlFor="f-bio">{t("bio")}</label>
              <span className="font-normal text-muted" aria-live="polite">{t("bioCount", { count: (values.bio ?? "").length, max: BIO_MAX })}</span>
            </span>
            <textarea id="f-bio" rows={3} maxLength={BIO_MAX} className={`${inputClass} ${border("bio")} resize-none`} value={values.bio ?? ""} onChange={(e) => set("bio", e.target.value)} {...aria("bio")} />
            {err("bio")}
          </div>
        </div>
      ),
    },
  ];

  // En édition, on saute les cartes « Le saviez-vous ? ».
  const flow = editing ? steps.filter((s) => s.kind === "question") : steps;
  const questions = flow.filter((s): s is Question => s.kind === "question");
  const [index, setIndex] = useState(() => {
    const i = startAt ? flow.findIndex((s) => s.id === startAt) : -1;
    return Math.max(i, 0);
  });
  const current = flow[Math.min(index, flow.length - 1)]!;
  const qNumber = current.kind === "question" ? questions.indexOf(current) + 1 : questions.filter((q) => flow.indexOf(q) < index).length;

  // Reprise d'un brouillon enregistré sur l'appareil (pas en mode édition du profil).
  useEffect(() => {
    if (editing) return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { values?: Partial<Values>; step?: string };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration unique du brouillon local
      setValues((v) => ({ ...v, ...draft.values }));
      const i = flow.findIndex((s) => s.id === draft.step);
      if (i > 0) setIndex(i);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, au chargement
  }, [editing, DRAFT_KEY]);

  // Brouillon : enregistré à chaque changement (réponses et question en cours).
  useEffect(() => {
    if (editing || done) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step: current.id }));
    } catch {
      /* ignore */
    }
  }, [values, current.id, editing, done, DRAFT_KEY]);

  useEffect(() => () => { if (photo?.url) URL.revokeObjectURL(photo.url); }, [photo]);

  // Passage automatique après un choix dans une liste (questions marquées « auto ») ; pas en fin de parcours.
  useEffect(() => {
    if (!advance) return;
    const auto = current.kind === "question" && current.auto && current.fields.includes(advance as Key) && index < flow.length - 1;
    const timer = window.setTimeout(() => {
      setAdvance(null);
      if (auto) {
        setIndex((i) => i + 1);
        setErrors({});
        window.scrollTo({ top: 0 });
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [advance, current, index, flow.length]);

  const validate = (q: Step) => {
    if (q.kind !== "question") return true;
    const picked = Object.fromEntries(q.fields.map((f) => [f, true])) as Record<Key, true>;
    const result = profileSchema.pick(picked as never).safeParse(values);
    if (result.success) return true;
    const nextErrors: Errors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as Key;
      if (!nextErrors[field]) nextErrors[field] = issue.message;
    }
    setErrors(nextErrors);
    return false;
  };

  const goTo = (i: number) => {
    setIndex(i);
    setErrors({});
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
    });
  };

  const submit = async () => {
    const all = profileSchema.safeParse(values);
    if (!all.success) {
      // Une réponse obligatoire manque (brouillon ancien) : on y retourne.
      const field = all.error.issues[0]?.path[0] as Key | undefined;
      const back = flow.findIndex((s) => s.kind === "question" && field !== undefined && s.fields.includes(field));
      if (back >= 0) {
        goTo(back);
        validate(flow[back]!);
      }
      return;
    }
    if (!uid) {
      // Mode démonstration : réponses gardées sur l'appareil.
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step: current.id, completed: true }));
      } catch {
        /* ignore */
      }
      if (editing) return router.push("/espace/profil");
      return setDone(true);
    }
    setSaving(true);
    setSaveError("");
    const { functions, storage, db } = firebase();
    try {
      // Le serveur revalide tout avec le même schéma (âge, valeurs autorisées, ville ouverte).
      await httpsCallable(functions, "completeProfile")(values);
    } catch (err) {
      const issues = (err as { details?: { issues?: { path: string; message: string }[] } }).details?.issues ?? [];
      const nextErrors: Errors = {};
      for (const i of issues) nextErrors[i.path as Key] = i.message;
      setErrors(nextErrors);
      setSaveError(t("saveError"));
      setSaving(false);
      return;
    }
    if (photo?.file) {
      try {
        const ext = photo.file.type === "image/png" ? "png" : photo.file.type === "image/webp" ? "webp" : "jpg";
        const path = `users/${uid}/avatar/photo-${Date.now()}.${ext}`;
        await uploadBytes(ref(storage, path), photo.file, { contentType: photo.file.type });
        await updateDoc(doc(db, "users", uid), { photoPath: path, updatedAt: serverTimestamp() });
      } catch {
        setSaveError(t("photoUploadError"));
      }
    }
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setSaving(false);
    if (editing) {
      router.replace("/espace/profil");
      router.refresh();
      return;
    }
    setDone(true);
    router.refresh();
  };

  /** Question suivante ; `skipValidation` : réponse choisie dans une liste (déjà valide) ou « Passer ». */
  function next(skipValidation = false) {
    if (!skipValidation && !validate(current)) return;
    if (index < flow.length - 1) return goTo(index + 1);
    void submit();
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg" data-testid="onboarding-done">
        <div className="rounded-3xl bg-brand-50 p-6 text-ink ring-1 ring-brand-100 sm:p-8">
          <span className="grid size-12 place-items-center rounded-full bg-brand-900 text-white">
            <Check className="size-6" aria-hidden />
          </span>
          <h2 ref={headingRef} tabIndex={-1} className="mt-5 font-display text-[2rem] leading-tight outline-none">
            <span className="text-brand-700">{t("doneTitle1")}</span>
            <br />
            {t("doneTitle2")}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/85">{t("doneText")}</p>
          <hr className="my-5 border-brand-100" />
          <p className="text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase">{t("facts.eyebrow")}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{t("facts.commute.text")}</p>
          <p className="mt-2 text-xs text-muted">{t("facts.commute.source")}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {continueTo ? <Link href={continueTo} className="btn btn-primary" data-testid="onboarding-continue">{t("doneContinue")}</Link> : <Link href="/experiences" className="btn btn-primary">{t("doneCta")}</Link>}
            <Link href="/espace" className="btn btn-secondary">{t("doneHome")}</Link>
          </div>
        </div>
      </div>
    );
  }

  const isQuestion = current.kind === "question";
  const Icon = isQuestion ? current.icon : null;
  return (
    <form
      noValidate
      className="mx-auto max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      data-testid="onboarding"
    >
      {/* Haut : retour, progression, quitter. */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => index > 0 && goTo(index - 1)} disabled={index === 0} aria-label={t("backStep")} className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white transition disabled:opacity-0">
          <ArrowLeft className="size-5 rtl:-scale-x-100" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-brand-800 transition-[width] duration-300" style={{ width: `${(qNumber / questions.length) * 100}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-muted" data-testid="onboarding-progress">
            {isQuestion ? t("progress", { current: qNumber, total: questions.length }) : t("answered", { current: qNumber, total: questions.length })}
          </p>
        </div>
        <Link href={editing ? "/espace/profil" : "/"} aria-label={t("close")} className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white">
          <X className="size-5" aria-hidden />
        </Link>
      </div>

      {isQuestion ? (
        <div className="card mt-6 flex min-h-[28rem] flex-col p-6 sm:p-8" key={current.id}>
          {Icon && (
            <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-900">
              <Icon className="size-5" aria-hidden />
            </span>
          )}
          <h2 ref={headingRef} tabIndex={-1} className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-[1.65rem] leading-tight font-medium text-brand-900 outline-none">
            {t(`q.${current.id}.title` as "q.name.title")}
            {current.optional && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-sans text-xs font-semibold text-brand-800">{t("optional")}</span>}
          </h2>
          <p className="mt-1.5 text-sm text-muted">{t(`q.${current.id}.hint` as "q.name.hint")}</p>
          <div className="mt-5 flex-1">{current.body}</div>
          {saveError && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{saveError}</p>}
          <div className="mt-8 space-y-2">
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? t("saving") : index === flow.length - 1 ? t("finish") : t("continue")}
            </button>
            {editing && index < flow.length - 1 && (
              <button type="button" disabled={saving} onClick={() => validate(current) && void submit()} className="btn btn-secondary w-full">
                {t("saveAndExit")}
              </button>
            )}
            {current.optional && !editing && (
              <button type="button" onClick={() => next(true)} className="btn btn-ghost w-full">
                {t("skip")}
              </button>
            )}
            <p className="pt-1 text-center text-xs text-muted">{t("leaveAnytime")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-10" key={current.id}>
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">{t("facts.eyebrow")}</h2>
          <div>{current.body}</div>
          <button type="submit" className="btn btn-primary mt-6 w-full">{t("continue")}</button>
        </div>
      )}
    </form>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition ${
        selected ? "bg-brand-900 text-white" : "bg-white text-ink shadow-card ring-1 ring-line hover:ring-brand-200"
      }`}
    >
      {children}
      {selected && <Check className="size-3.5" aria-hidden />}
    </button>
  );
}
