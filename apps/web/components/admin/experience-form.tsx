"use client";

import {
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_WENZY_PRICE,
  templateSlug,
  tierRange,
  type EventTemplate,
  DEPOSIT_MAX,
  DEPOSIT_MIN,
  experienceInputSchema,
  formatMoney,
  PAYMENT_MODEL_LABELS,
  PAYMENT_MODELS,
  splitForModel,
  type PaymentModel,
  MOROCCO_TIMEZONE,
  planSessionDates,
  RECURRENCE_MAX_WEEKS,
  SPOKEN_LANGUAGES,
  type ActivityLevel,
  type ExperienceInput,
} from "@thecommunity/shared";
import { collection, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { AlertTriangle, CheckCircle2, ImagePlus, Info, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mediaUrl } from "@/components/media";
import { QuestionnaireEditor } from "@/components/admin/questionnaire-editor";
import type { QuestionDraft } from "@/lib/questionnaire-draft";
import { valuesToTemplate } from "@/lib/admin-forms";
import { firebase } from "@/lib/firebase/client";

type Option = { id: string; label: string; disabled?: boolean; /** 18c : état de l'assurance du lieu partenaire. */ insurance?: "valid" | "expiring" | "expired" | "missing"; /** Étape 19 : sous-catégorie de… */ parentId?: string };
export type ExperienceFormValues = Omit<ExperienceInput, "sessions" | "groupMin" | "groupTarget" | "groupMax" | "costPerSeatDh" | "commissionPercent" | "priceDh" | "durationMinutes" | "maxSeatsPerBooking" | "memberPriceDh" | "partnerPriceDh" | "budgetMinDh" | "budgetMaxDh" | "onSiteCommissionPercent" | "minAge" | "targetAgeMin" | "targetAgeMax" | "level" | "questionnaire" | "proposalId" | "depositPercent" | "earlyAccessDays" | "templateId"> & {
  /** docs/22 : abonnés d'abord pendant X jours (« 0 » = ouvert à tous). */
  earlyAccessDays: string;
  /** Étape 22 : acompte en % (mode B). */
  depositPercent: string;
  /** 18b : âge minimum (vide = 18 ans), niveau attendu (vide = non précisé) ; 18a : questionnaire ; 18d : proposition d'origine. */
  minAge: string; targetAgeMin: string; targetAgeMax: string; level: "" | ActivityLevel; questionnaire: QuestionDraft[]; proposalId?: string;
  groupMin: string; groupTarget: string; groupMax: string; costPerSeatDh: string; commissionPercent: string;
  priceDh: string; durationMinutes: string; maxSeatsPerBooking: string; memberPriceDh: string; partnerPriceDh: string; budgetMinDh: string; budgetMaxDh: string; onSiteCommissionPercent: string;
  sessions: { firstDate: string; time: string; weeks: string; capacity: string };
};

const MESSAGES: Record<string, string> = {
  required: "Champ obligatoire.", tooShort: "Trop court.", tooLong: "Trop long.", tooMany: "Valeur trop élevée.",
  depositRange: "Acompte entre 10 et 90 %.", ageOrder: "L'âge minimum visé doit être inférieur au maximum.", invalidCoords: "Coordonnées illisibles : deux nombres séparés par une virgule (ex. 33.5951, -7.6187).", paymentModelDisabled: "Ce mode de paiement n'est pas proposé pour l'instant.",
  min0: "Doit être positif.", min1: "Au moins 1.", min2: "Au moins 2.", min15: "Au moins 15 minutes.", max100: "100 % maximum.",
  pickOne: "Choisissez au moins une langue.", groupOrder: "Le minimum doit être inférieur ou égal au maximum.", capacityBelowGroup: "La capacité doit permettre au moins un groupe complet.",
  seatsPerBookingMode: "Plus de 2 places par réservation : seulement en mode libre ou privatisé.", partnerRequired: "Le modèle commission nécessite un partenaire.",
  revealNeedsGroups: "La révélation différée n'est possible qu'avec des groupes (dîner social ou groupe).",
  inPast: "La première date est déjà passée.", memberAbovePublic: "Le prix membre doit être inférieur ou égal au prix public.", invalidImagePath: "Photo invalide.",
  budgetOrder: "Le budget minimum doit être inférieur ou égal au maximum.",
  budgetNeeded: "Consommation libre : indiquez le budget estimé par personne ou, à défaut, la gamme du restaurant.",
  pricingNeedsPartner: "Choisissez d'abord le partenaire : la part sur place lui est réglée directement.",
  onSiteNoCommission: "Avec une part sur place, utilisez « Nos coûts » ; une commission sur la part sur place se saisit dans son propre champ.",
  minAge: "18 ans minimum (règle du site).", optionsMin: "Au moins 2 réponses par question.", optionsMax: "6 réponses au plus par question.",
  questionnaireMax: "10 questions au plus.", duplicate: "Question en double.", proposalUnavailable: "Cette proposition a déjà été utilisée ou n'existe plus.",
};
const LEVEL_LABELS: Record<ActivityLevel, string> = { all: "Tous niveaux", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Confirmé" };
/** docs/22 : en ligne, toujours le prix Wenzy ; sur place, rien, un prix fixe, ou la consommation. */
const PRICING_CHOICES: { id: ExperienceFormValues["pricingModel"]; title: string; text: string }[] = [
  { id: "online_only", title: "Rien à payer sur place", text: "Balade, quiz offert… Le participant ne paie que Wenzy." },
  { id: "fixed_partner", title: "Prix fixe sur place", text: "Un montant connu par personne : menu, cours, session, guide." },
  { id: "variable_consumption", title: "Consommation sur place", text: "Chacun règle ce qu'il consomme ; un budget indicatif est affiché." },
];
/** Convertit une saisie en dirhams (« 250 », « 99,5 ») en centimes ; null si vide ou invalide. */
function dhToCents(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
const LANG_LABELS: Record<string, string> = { fr: "Français", ar: "Arabe", darija: "Darija", en: "Anglais", es: "Espagnol" };
const MODES: Option[] = [
  { id: "individual", label: "Individuel — chacun réserve sa place (ex. Pilates)" },
  { id: "group", label: "Groupe — la plateforme forme des équipes (ex. escape game)" },
  { id: "social_dinner", label: "Dîner social — tables composées par l'équipe" },
  { id: "open", label: "Libre — seul ou accompagné (ex. soirée)" },
  { id: "private", label: "Privatisé — un groupe déjà constitué" },
];

function Label({ k, children, hint }: { k: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={`f-${k}`} className="mb-1 block text-sm font-medium text-ink">
      {children}
      {hint && <span className="block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <fieldset id={id} className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-card sm:p-5">
      <legend className="float-left mb-4 w-full text-base font-semibold text-ink">{title}</legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const input = "w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100";

/**
 * Formulaire de création / modification d'une expérience et de ses dates.
 * Validation complète avec le schéma partagé (identique côté serveur en phase 3).
 * Phase 2 : rien n'est enregistré — le récapitulatif montre ce qui sera créé.
 */
export function ExperienceForm({
  initial,
  categories,
  cities,
  partners,
  policies,
  mode,
  experienceId,
  existingImages = [],
  live = false,
  bookedSeats = 0,
  organizer,
  wenzyPrice = DEFAULT_WENZY_PRICE,
  template,
}: {
  initial: ExperienceFormValues;
  categories: Option[];
  cities: Option[];
  partners: Option[];
  policies: Option[];
  mode: "create" | "edit";
  experienceId?: string;
  existingImages?: { path: string }[];
  /** Mode Firebase : l'expérience est réellement enregistrée (Cloud Function adminSaveExperience). */
  live?: boolean;
  /** Places déjà confirmées sur les dates à venir : leur prix est figé, on prévient l'équipe. */
  bookedSeats?: number;
  /** Prix Wenzy en vigueur (centimes), réglé dans Paramètres (docs/22). */
  wenzyPrice?: number;
  /** docs/22 : modèle d'origine (photo par défaut, « Mettre à jour le modèle »). */
  template?: Omit<EventTemplate, "values">;
  /**
   * Étape 20 : formulaire de l'espace organisateur. Mêmes champs, sans le modèle économique, les lieux partenaires
   * ni les avantages membres ; photos dans le dossier public de l'organisateur ; « Envoyer pour validation ».
   */
  organizer?: {
    orgId: string;
    currentStatus?: string;
    /** L'équipe modifie l'activité d'un organisateur (back-office). */
    asTeam?: boolean;
    /** Étape 22 : modes de paiement activés par l'équipe, taux de commission en vigueur (aperçu). */
    models?: PaymentModel[];
    ratePercent?: number;
    fixedPerSeat?: number;
  };
}) {
  const pro = Boolean(organizer);
  const proSelf = Boolean(organizer && !organizer.asTeam);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExperienceInput | null>(null);
  const [images, setImages] = useState<{ url: string; name: string; file: File }[]>([]);
  const [addSessions, setAddSessions] = useState(mode === "create");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ experienceId: string; slug: string; sessionsCreated: number; status: string } | null>(null);
  const [serverError, setServerError] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.url)), [images]);

  const set = <K extends keyof ExperienceFormValues>(key: K, value: ExperienceFormValues[K]) => {
    setV((x) => ({ ...x, [key]: value }));
    setResult(null);
  };
  const setSession = (key: keyof ExperienceFormValues["sessions"], value: string) => {
    setV((x) => ({ ...x, sessions: { ...x.sessions, [key]: value } }));
    setResult(null);
  };

  const isTables = v.categoryId === "eat";
  const secret = v.revealPolicy === "on_group_reveal";
  const grouped = isTables || v.bookingMode === "group" || v.bookingMode === "social_dinner";
  const opt = (s: string) => (s === "" ? undefined : s);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(null);
    setServerError("");
    const parsed = experienceInputSchema.safeParse({
      ...v,
      // docs/22 : Tables → toujours des tables composées ; plus de « taille cible » (la composition vise le maximum).
      bookingMode: isTables ? "social_dinner" : v.bookingMode,
      groupMin: grouped ? opt(v.groupMin) : undefined,
      groupTarget: grouped ? opt(v.groupMax) : undefined,
      groupMax: grouped ? opt(v.groupMax) : undefined,
      venueTier: isTables ? v.venueTier : "",
      earlyAccessDays: v.membersOnly ? "0" : v.earlyAccessDays || "0",
      templateId: template?.id,
      // Activité d'un organisateur : modèle économique géré par le contrat (commission), jamais saisi ici.
      ...(pro ? { economicsModel: "own" as const, partnerId: "", pricingModel: "online_only" as const } : { paymentModel: "full_online" as const, economicsModel: "own" as const }),
      depositPercent: pro && v.paymentModel === "deposit" ? opt(v.depositPercent) : undefined,
      // docs/22 : plus de marge ni de commission saisies par événement ; prix Wenzy global (sauf activité d'organisateur).
      costPerSeatDh: pro ? 0 : undefined,
      commissionPercent: undefined,
      onSiteCommissionPercent: undefined,
      priceDh: pro ? opt(v.priceDh) : undefined,
      free: pro ? false : v.free,
      minAge: opt(v.minAge),
      targetAgeMin: opt(v.targetAgeMin),
      targetAgeMax: opt(v.targetAgeMax),
      level: v.level || undefined,
      proposalId: v.proposalId || undefined,
      memberPriceDh: undefined,
      partnerPriceDh: !pro && v.pricingModel === "fixed_partner" ? opt(v.partnerPriceDh) : undefined,
      budgetMinDh: !pro && v.pricingModel === "variable_consumption" ? opt(v.budgetMinDh) : undefined,
      budgetMaxDh: !pro && v.pricingModel === "variable_consumption" ? opt(v.budgetMaxDh) : undefined,
      partnerDescription: "",
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!next[key]) next[key] = MESSAGES[issue.message] ?? issue.message;
      }
      setErrors(next);
      setResult(null);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setErrors({});
    setResult(parsed.data);
    if (!live) {
      requestAnimationFrame(() => document.getElementById("form-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    // Enregistrement réel : photos d'abord (dans le dossier de l'expérience), puis la fonction serveur.
    setSaving(true);
    try {
      const { db, storage, functions, auth } = firebase();
      const id = experienceId ?? doc(collection(db, "experiences")).id;
      // Organisateur : jeton rafraîchi (droits posés à la validation du compte) avant l'envoi des photos.
      await auth.authStateReady();
      if (proSelf && images.length > 0) await auth.currentUser?.getIdToken(true);
      const uploaded: { path: string; alt: string }[] = [];
      for (const [i, img] of images.entries()) {
        const ext = img.file.type === "image/png" ? "png" : img.file.type === "image/webp" ? "webp" : "jpg";
        const path = organizer ? `organizers/${organizer.orgId}/public/${id}-${Date.now()}-${i}.${ext}` : `experiences/${id}/${Date.now()}-${i}.${ext}`;
        await uploadBytes(ref(storage, path), img.file, { contentType: img.file.type });
        uploaded.push({ path, alt: parsed.data.titleFr });
      }
      // docs/22 : sans photo envoyée, une nouvelle fiche prend la photo du modèle.
      const photos = uploaded.length === 0 && mode === "create" && template ? [{ path: template.image, alt: parsed.data.titleFr }] : uploaded;
      const res = await httpsCallable(functions, proSelf ? "organizerSaveExperience" : "adminSaveExperience")({
        ...(experienceId ? { experienceId } : { newId: id }),
        data: JSON.parse(JSON.stringify(parsed.data)), // retire les champs vides (undefined)
        addSessions,
        images: photos,
      });
      const data = res.data as { experienceId: string; slug: string; sessionsCreated: number; status?: string };
      setSaved({ ...data, status: data.status ?? parsed.data.status });
      setImages([]);
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
    } catch (err) {
      const issues = (err as { details?: { issues?: { path: string; message: string }[] } }).details?.issues ?? [];
      const next: Record<string, string> = {};
      for (const i of issues) next[i.path] = MESSAGES[i.message] ?? i.message;
      setErrors(next);
      setServerError((err as { message?: string }).message ?? "Enregistrement impossible.");
    } finally {
      setSaving(false);
      requestAnimationFrame(() => document.getElementById("form-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const preview = useMemo(() => {
    if (!result) return null;
    const dates = addSessions ? planSessionDates(result.sessions, result.durationMinutes, MOROCCO_TIMEZONE) : [];
    const price = pro ? Math.round((result.priceDh ?? 0) * 100) : result.free ? 0 : wenzyPrice;
    return { dates, price };
  }, [result, addSessions, pro, wenzyPrice]);

  const insurance = partners.find((p) => p.id === v.partnerId)?.insurance ?? "missing";
  /** Ce que voit le participant, sur place (docs/22) : montant fixe, budget saisi, ou budget de la gamme. */
  const onSitePreview = useMemo(() => {
    if (v.pricingModel === "fixed_partner") {
      const n = dhToCents(v.partnerPriceDh);
      return n == null ? null : formatMoney({ amount: n, currency: "MAD" });
    }
    if (v.pricingModel === "variable_consumption") {
      const min = dhToCents(v.budgetMinDh);
      const max = dhToCents(v.budgetMaxDh);
      if (min != null && max != null) return `votre consommation, ≈ ${Math.round(min / 100)}–${formatMoney({ amount: max, currency: "MAD" })}`;
      if (v.venueTier) {
        const r = tierRange(v.venueTier, v.subcategoryId);
        return `votre consommation, ≈ ${r.min}–${r.max} DH (budget de la gamme)`;
      }
      return "votre consommation";
    }
    return null;
  }, [v.pricingModel, v.partnerPriceDh, v.budgetMinDh, v.budgetMaxDh, v.venueTier, v.subcategoryId]);
  /** Étape 22 : aperçu de la part en ligne / sur place selon le mode choisi (activités d'organisateurs). */
  const proSplit = useMemo(() => {
    const total = dhToCents(v.priceDh);
    if (!pro || total == null) return null;
    return splitForModel(v.paymentModel ?? "full_online", total, { depositPercent: Number(v.depositPercent) || undefined, ratePercent: organizer?.ratePercent ?? DEFAULT_COMMISSION_PERCENT, fixedPerSeat: organizer?.fixedPerSeat ?? 0 });
  }, [pro, v.priceDh, v.paymentModel, v.depositPercent, organizer?.ratePercent, organizer?.fixedPerSeat]);
  const choosePricing = (id: ExperienceFormValues["pricingModel"]) => set("pricingModel", id);
  const choosePartner = (id: string) => set("partnerId", id);

  const field = (key: string) => ({
    id: `f-${key}`,
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `e-${key}` : undefined,
    className: `${input} ${errors[key] ? "border-red-400" : "border-line"}`,
  });
  const err = (k: string) => (errors[k] ? <p id={`e-${k}`} className="mt-1 text-xs text-red-700">{errors[k]}</p> : null);
  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {errorCount > 0 && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
          {errorCount} champ{errorCount > 1 ? "s" : ""} à corriger.
        </p>
      )}

      <Section title="1. Informations">
        <div className="sm:col-span-2"><Label k="titleFr">Titre (français)</Label><input {...field("titleFr")} value={v.titleFr} onChange={(e) => set("titleFr", e.target.value)} />{err("titleFr")}</div>
        <div className="sm:col-span-2"><Label k="summaryFr" hint="Une phrase, affichée sur les cartes.">Accroche</Label><input {...field("summaryFr")} value={v.summaryFr} onChange={(e) => set("summaryFr", e.target.value)} />{err("summaryFr")}</div>
        <div className="sm:col-span-2"><Label k="descriptionFr">Description</Label><textarea {...field("descriptionFr")} rows={5} value={v.descriptionFr} onChange={(e) => set("descriptionFr", e.target.value)} />{err("descriptionFr")}</div>
        <details className="sm:col-span-2 rounded-xl border border-line p-4" open>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Version arabe (recommandé)</summary>
          <p className="mt-1 text-xs text-muted">Affichée sur la version arabe du site. Champ laissé vide : le texte français s&apos;affiche à sa place.</p>
          <div className="mt-4 grid gap-4">
            <div><Label k="titleAr">Titre (arabe)</Label><input {...field("titleAr")} dir="rtl" lang="ar" value={v.titleAr ?? ""} onChange={(e) => set("titleAr", e.target.value)} />{err("titleAr")}</div>
            <div><Label k="summaryAr" hint="Une phrase, affichée sur les cartes.">Accroche (arabe)</Label><input {...field("summaryAr")} dir="rtl" lang="ar" value={v.summaryAr ?? ""} onChange={(e) => set("summaryAr", e.target.value)} />{err("summaryAr")}</div>
            <div><Label k="descriptionAr">Description (arabe)</Label><textarea {...field("descriptionAr")} dir="rtl" lang="ar" rows={4} value={v.descriptionAr ?? ""} onChange={(e) => set("descriptionAr", e.target.value)} />{err("descriptionAr")}</div>
          </div>
        </details>
        <details className="sm:col-span-2 rounded-xl border border-line p-4" open={Boolean(v.titleEn || v.summaryEn || v.descriptionEn)}>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Version anglaise (facultatif)</summary>
          <p className="mt-1 text-xs text-muted">Sinon le texte français s&apos;affiche sur la version anglaise du site.</p>
          <div className="mt-4 grid gap-4">
            <div><Label k="titleEn">Title (English)</Label><input {...field("titleEn")} lang="en" value={v.titleEn ?? ""} onChange={(e) => set("titleEn", e.target.value)} />{err("titleEn")}</div>
            <div><Label k="summaryEn">Summary (English)</Label><input {...field("summaryEn")} lang="en" value={v.summaryEn ?? ""} onChange={(e) => set("summaryEn", e.target.value)} />{err("summaryEn")}</div>
            <div><Label k="descriptionEn">Description (English)</Label><textarea {...field("descriptionEn")} lang="en" rows={4} value={v.descriptionEn ?? ""} onChange={(e) => set("descriptionEn", e.target.value)} />{err("descriptionEn")}</div>
          </div>
        </details>
        <div><Label k="categoryId">Univers</Label>
          <select {...field("categoryId")} value={v.categoryId} onChange={(e) => {
            const id = e.target.value as ExperienceFormValues["categoryId"];
            // 18c : une activité sportive est en principe une activité physique (modifiable juste après).
            setV((x) => ({ ...x, categoryId: id, subcategoryId: "", ...(mode === "create" && id === "move" ? { physicalActivity: true } : {}) }));
            setResult(null);
          }}>
            {categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>{err("categoryId")}</div>
        {/* Étape 19 : sous-catégorie facultative (créée dans Paramètres → Catégories). */}
        {categories.some((c) => c.parentId === v.categoryId) && (
          <div><Label k="subcategoryId">Sous-catégorie (facultatif)</Label>
            <select {...field("subcategoryId")} value={v.subcategoryId ?? ""} onChange={(e) => set("subcategoryId", e.target.value)}>
              <option value="">— Aucune —</option>
              {categories.filter((c) => c.parentId === v.categoryId).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>{err("subcategoryId")}</div>
        )}
        <div><Label k="status">Statut</Label>
          <select {...field("status")} value={v.status} onChange={(e) => set("status", e.target.value as "draft" | "published")}>
            <option value="draft">Brouillon (non visible)</option>
            <option value="published">{proSelf ? (organizer?.currentStatus === "published" ? "Publiée (reste en ligne)" : "Envoyer pour validation") : "Publiée"}</option>
          </select>
          {proSelf && <p className="mt-1 text-xs text-muted">L&apos;équipe Wenzy relit chaque nouvelle activité avant sa publication. Une activité déjà en ligne le reste quand vous la modifiez.</p>}</div>
      </Section>

      <Section title="2. Lieu">
        <div className="sm:col-span-2"><Label k="revealPolicy" hint={secret ? "Nom, adresse et cuisine restent cachés jusqu'à 5 h avant. Le lieu peut être choisi plus tard, quand vous connaissez le nombre d'inscrits (au plus tard 5 h avant)." : "Nom, adresse et carte visibles dès la fiche."}>Lieu</Label>
          <select {...field("revealPolicy")} value={v.revealPolicy} onChange={(e) => set("revealPolicy", e.target.value as "immediate" | "on_group_reveal")}>
            <option value="on_group_reveal">Secret, révélé 5 h avant</option>
            <option value="immediate">Affiché dès la fiche</option>
          </select>{err("revealPolicy")}</div>
        <div><Label k="cityId">Ville</Label>
          <select {...field("cityId")} value={v.cityId} onChange={(e) => set("cityId", e.target.value)}>
            {cities.map((c) => <option key={c.id} value={c.id} disabled={c.disabled}>{c.label}</option>)}
          </select>{err("cityId")}</div>
        <div><Label k="district" hint={secret ? "Facultatif pour l'instant ; jamais affiché." : undefined}>Quartier</Label><input {...field("district")} value={v.district} onChange={(e) => set("district", e.target.value)} />{err("district")}</div>
        <div><Label k="venueName" hint={secret ? "Facultatif pour l'instant." : undefined}>Nom du lieu</Label><input {...field("venueName")} value={v.venueName} onChange={(e) => set("venueName", e.target.value)} />{err("venueName")}</div>
        <div><Label k="address" hint={secret ? "Facultatif pour l'instant." : undefined}>Adresse</Label><input {...field("address")} value={v.address} onChange={(e) => set("address", e.target.value)} />{err("address")}</div>
        <div className="sm:col-span-2"><Label k="venueCoords" hint="Facultatif. Dans Google Maps, clic droit sur le lieu puis cliquez sur les chiffres pour les copier (ex. 33.5951, -7.6187). La carte s'affiche quand le lieu est visible.">Coordonnées GPS du lieu</Label><input {...field("venueCoords")} value={v.venueCoords ?? ""} onChange={(e) => set("venueCoords", e.target.value)} placeholder="33.5951, -7.6187" inputMode="decimal" />{err("venueCoords")}</div>
        {isTables && (<>
          <div><Label k="venueTier" hint="Fixe le budget sur place selon le format (ex. Dîner : Casual 150–250 DH, Premium 250–400 DH, Exclusive 400–600 DH par personne).">Gamme</Label>
            <select {...field("venueTier")} value={v.venueTier ?? ""} onChange={(e) => set("venueTier", e.target.value as ExperienceFormValues["venueTier"])}>
              <option value="">Non précisée</option>
              <option value="casual">Casual</option>
              <option value="premium">Premium</option>
              <option value="exclusive">Exclusive</option>
            </select>{err("venueTier")}</div>
          <div><Label k="ambiance" hint="Affichée sur la fiche.">Ambiance</Label><input {...field("ambiance")} maxLength={60} value={v.ambiance ?? ""} onChange={(e) => set("ambiance", e.target.value)} />{err("ambiance")}</div>
          <div className="sm:col-span-2"><Label k="cuisine" hint={secret ? "Affichée seulement avec le lieu, 5 h avant." : "Affichée sur la fiche."}>Cuisine</Label><input {...field("cuisine")} maxLength={60} value={v.cuisine ?? ""} onChange={(e) => set("cuisine", e.target.value)} />{err("cuisine")}</div>
        </>)}
      </Section>

      <Section title="3. Format et règles">
        {isTables ? (
          <p className="text-sm text-muted sm:col-span-2">Tables composées par Wenzy, heure de début seulement (chacun reste aussi longtemps qu&apos;il le souhaite).</p>
        ) : (
          <div className="sm:col-span-2"><Label k="bookingMode">Format</Label>
            <select {...field("bookingMode")} value={v.bookingMode} onChange={(e) => set("bookingMode", e.target.value as ExperienceFormValues["bookingMode"])}>
              {MODES.filter((m) => m.id !== "social_dinner").map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select></div>
        )}
        {grouped && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div><Label k="groupMin">{isTables ? "Personnes par table, minimum" : "Taille d'un groupe, minimum"}</Label><input {...field("groupMin")} inputMode="numeric" value={v.groupMin} onChange={(e) => set("groupMin", e.target.value)} />{err("groupMin")}</div>
            <div><Label k="groupMax">{isTables ? "Personnes par table, maximum" : "Taille d'un groupe, maximum"}</Label><input {...field("groupMax")} inputMode="numeric" value={v.groupMax} onChange={(e) => set("groupMax", e.target.value)} />{err("groupMax")}{err("groupTarget")}</div>
          </div>
        )}
        <div><Label k="maxSeatsPerBooking" hint="2 = « Moi + 1 » : la personne réserve aussi pour quelqu'un, chaque place est payée.">Places par réservation</Label>
          <select {...field("maxSeatsPerBooking")} value={Number(v.maxSeatsPerBooking) >= 2 ? "2" : "1"} onChange={(e) => set("maxSeatsPerBooking", e.target.value)}>
            <option value="1">1 place</option>
            <option value="2">2 places au plus</option>
          </select>{err("maxSeatsPerBooking")}</div>
        {!isTables && <div><Label k="durationMinutes">Durée (minutes)</Label><input {...field("durationMinutes")} inputMode="numeric" value={v.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />{err("durationMinutes")}</div>}
        <div><Label k="cancellationPolicyId" hint="Les frais Wenzy sont remboursés selon ces conditions.">Conditions d&apos;annulation</Label>
          <select {...field("cancellationPolicyId")} value={v.cancellationPolicyId} onChange={(e) => set("cancellationPolicyId", e.target.value)}>
            {policies.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-medium text-ink">Langues de l&apos;événement</legend>
          <div className="flex flex-wrap gap-2" aria-invalid={Boolean(errors.languages)}>
            {SPOKEN_LANGUAGES.map((l) => {
              const on = v.languages.includes(l);
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => set("languages", on ? v.languages.filter((x) => x !== l) : [...v.languages, l])}
                  className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-brand-900 bg-brand-900 text-white" : "border-line bg-white"}`}>
                  {LANG_LABELS[l]}
                </button>
              );
            })}
          </div>
          {err("languages")}
        </fieldset>
        {!pro && (
          <fieldset className="text-sm sm:col-span-2" data-testid="access">
            <legend className="mb-1.5 font-medium">Accès</legend>
            <label className="flex items-center gap-2 py-1">
              <input type="radio" name="access" checked={!v.membersOnly && Number(v.earlyAccessDays || 0) === 0} onChange={() => setV((x) => ({ ...x, membersOnly: false, earlyAccessDays: "0" }))} className="size-4 accent-brand-900" />
              Ouvert à tous
            </label>
            <label className="flex flex-wrap items-center gap-2 py-1">
              <input type="radio" name="access" checked={!v.membersOnly && Number(v.earlyAccessDays || 0) > 0} onChange={() => setV((x) => ({ ...x, membersOnly: false, earlyAccessDays: Number(x.earlyAccessDays || 0) > 0 ? x.earlyAccessDays : "3" }))} className="size-4 accent-brand-900" />
              Abonnés d&apos;abord pendant
              <input id="f-earlyAccessDays" aria-label="Nombre de jours réservés aux abonnés" inputMode="numeric" className="w-16 rounded-xl border border-line bg-white px-2 py-1 text-[15px]" value={v.earlyAccessDays} onChange={(e) => setV((x) => ({ ...x, membersOnly: false, earlyAccessDays: e.target.value }))} />
              jours, puis ouvert à tous
            </label>
            <label className="flex items-center gap-2 py-1">
              <input type="radio" name="access" checked={v.membersOnly} onChange={() => setV((x) => ({ ...x, membersOnly: true, earlyAccessDays: "0" }))} className="size-4 accent-brand-900" />
              Abonnés uniquement
            </label>
            {err("earlyAccessDays")}
          </fieldset>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.audience === "women"} onChange={(e) => set("audience", e.target.checked ? "women" : "all")} className="size-4 accent-brand-900" />
          Réservé aux femmes
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.alcoholServed} onChange={(e) => set("alcoholServed", e.target.checked)} className="size-4 accent-brand-900" />
          De l&apos;alcool est servi
        </label>
        {!isTables && (
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={Boolean(v.foodServed)} onChange={(e) => set("foodServed", e.target.checked)} className="mt-0.5 size-4 accent-brand-900" />
            <span>Des plats ou boissons sont servis<span className="block text-xs text-muted">Régime et allergies demandés à la réservation (toujours le cas pour les Tables).</span></span>
          </label>
        )}
        <div className="sm:col-span-2"><Label k="included" hint="Un élément par ligne. Ce qui se paie sur place est déjà dit dans « Ce que vous payez » : pas besoin de le répéter.">Ce qui est inclus</Label><textarea {...field("included")} rows={3} value={v.included ?? ""} onChange={(e) => set("included", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label k="practicalInfo" hint="Seulement l'indispensable (ex. « Tenue soignée »). Jamais l'heure de révélation du lieu, déjà indiquée.">Infos pratiques</Label><textarea {...field("practicalInfo")} rows={2} value={v.practicalInfo ?? ""} onChange={(e) => set("practicalInfo", e.target.value)} /></div>
        <details className="rounded-xl border border-line p-4 sm:col-span-2" data-testid="advanced-options">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Options avancées</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label k="admission" hint="Sur demande : chaque personne envoie une demande ; l'équipe accepte ou refuse, puis la personne acceptée a 24 h pour payer.">Inscription</Label>
              <select {...field("admission")} value={v.admission} onChange={(e) => set("admission", e.target.value as ExperienceFormValues["admission"])}>
                <option value="direct">Réservation directe</option>
                <option value="on_request">Sur demande : l&apos;équipe valide chaque participant</option>
              </select></div>
            {v.admission === "on_request" && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={v.requestMessageRequired} onChange={(e) => set("requestMessageRequired", e.target.checked)} className="size-4 accent-brand-900" />
                Message de motivation obligatoire
              </label>
            )}
            {v.admission === "on_request" && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={v.requestInstagramRequired} onChange={(e) => set("requestInstagramRequired", e.target.checked)} className="size-4 accent-brand-900" />
                Compte Instagram obligatoire
              </label>
            )}
            <label className="flex items-start gap-2 text-sm sm:col-span-2" data-testid="arrival-mode">
              <input type="checkbox" checked={Boolean(v.onSiteHost)} onChange={(e) => set("onSiteHost", e.target.checked)} className="mt-0.5 size-4 accent-brand-900" />
              <span>Hôtesse sur place<span className="block text-xs text-muted">Chaque participant reçoit un billet à QR code, scanné à l&apos;entrée. Sinon (par défaut), chacun indique son arrivée dans l&apos;appli.</span></span>
            </label>
            <div><Label k="minAge" hint="Vide = 18 ans (règle du site).">Âge minimum</Label><input {...field("minAge")} inputMode="numeric" value={v.minAge} onChange={(e) => set("minAge", e.target.value)} />{err("minAge")}</div>
            <div><Label k="targetAgeMin" hint="Indicatif, ne bloque personne.">Tranche d&apos;âge visée</Label>
              <span className="flex items-center gap-2"><input {...field("targetAgeMin")} inputMode="numeric" placeholder="25" value={v.targetAgeMin} onChange={(e) => set("targetAgeMin", e.target.value)} className="w-20 rounded-xl border border-line bg-white px-3 py-2.5" /> à <input id="f-targetAgeMax" aria-label="Tranche d'âge visée : maximum" inputMode="numeric" placeholder="35" value={v.targetAgeMax} onChange={(e) => set("targetAgeMax", e.target.value)} className="w-20 rounded-xl border border-line bg-white px-3 py-2.5" /> ans</span>{err("targetAgeMin")}{err("targetAgeMax")}</div>
            <div className="sm:col-span-2"><Label k="notIncluded" hint="Rarement utile : l'encadré « Ce que vous payez » dit déjà ce qui se règle sur place.">Ce qui n&apos;est pas inclus</Label><textarea {...field("notIncluded")} rows={2} value={v.notIncluded ?? ""} onChange={(e) => set("notIncluded", e.target.value)} /></div>
          </div>
        </details>
      </Section>

      <Section id="activite" title={isTables ? "4. Questionnaire" : "4. Activité et questionnaire"}>
        {!isTables && (<>
          <div><Label k="level" hint="Affiché sur la fiche.">Niveau attendu</Label>
            <select {...field("level")} value={v.level} onChange={(e) => set("level", e.target.value as ExperienceFormValues["level"])}>
              <option value="">Non précisé</option>
              {(Object.keys(LEVEL_LABELS) as ActivityLevel[]).map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select></div>
          <div><Label k="dressCode" hint="Ex. tenue de sport.">Tenue conseillée</Label><input {...field("dressCode")} value={v.dressCode ?? ""} onChange={(e) => set("dressCode", e.target.value)} />{err("dressCode")}</div>
          <div><Label k="equipmentProvided" hint="Ex. raquettes et balles, tapis.">Matériel fourni</Label><textarea {...field("equipmentProvided")} rows={2} value={v.equipmentProvided ?? ""} onChange={(e) => set("equipmentProvided", e.target.value)} />{err("equipmentProvided")}</div>
          <div><Label k="whatToBring" hint="Ex. baskets propres, bouteille d'eau.">À apporter</Label><textarea {...field("whatToBring")} rows={2} value={v.whatToBring ?? ""} onChange={(e) => set("whatToBring", e.target.value)} />{err("whatToBring")}</div>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={v.outdoor} onChange={(e) => set("outdoor", e.target.checked)} className="mt-0.5 size-4 accent-brand-900" />
            <span>En plein air<span className="block text-xs text-muted">Si la météo ne permet pas l&apos;activité, elle est reportée ou annulée et remboursée.</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={v.physicalActivity} onChange={(e) => set("physicalActivity", e.target.checked)} className="mt-0.5 size-4 accent-brand-900" />
            <span>Activité physique<span className="block text-xs text-muted">Chaque participant accepte les <Link href="/conditions-activites-physiques" target="_blank" className="underline">conditions de participation aux activités physiques</Link> en réservant.</span></span>
          </label>
          {v.physicalActivity && v.partnerId && insurance !== "valid" && (
            <p role="status" data-testid="insurance-warning" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 sm:col-span-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {insurance === "expired" ? "L'assurance du lieu partenaire a expiré." : insurance === "expiring" ? "L'assurance du lieu partenaire expire dans moins de 30 jours." : "L'assurance du lieu partenaire n'a pas encore été vérifiée."}{" "}
                Demandez son attestation de responsabilité civile et mettez à jour la <Link href={`/admin/partenaires/${v.partnerId}`} className="underline">fiche du partenaire</Link>.
              </span>
            </p>
          )}
        </>)}
        {isTables && <p className="text-sm text-muted sm:col-span-2">Les Tables n&apos;ont pas de questionnaire : le profil d&apos;inscription suffit pour composer les tables.</p>}
        <QuestionnaireEditor value={v.questionnaire} onChange={(q) => set("questionnaire", q)} error={Object.entries(errors).find(([k]) => k.startsWith("questionnaire"))?.[1]} />
      </Section>

      <Section id="tarification" title={pro ? "5. Prix" : "5. Ce que paie le participant"}>
        {!pro && (<>
        <div className="rounded-xl border border-line p-4 sm:col-span-2" data-testid="part-online">
          <p className="text-sm font-semibold text-ink">En ligne, à la réservation</p>
          <p className="mt-1 text-sm text-ink">
            {v.free ? "Gratuit" : `${formatMoney({ amount: wenzyPrice, currency: "MAD" })} par place`}
            <span className="block text-xs text-muted">Prix Wenzy, le même pour tous les événements (réglé dans Paramètres). Avec un pass ou un carnet, le participant ne paie rien en ligne.</span>
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.free} onChange={(e) => set("free", e.target.checked)} className="size-4 accent-brand-900" />
            Événement gratuit (aucun frais Wenzy)
          </label>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-ink">Sur place</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-invalid={Boolean(errors.pricingModel)} aria-describedby={errors.pricingModel ? "e-pricingModel" : undefined}>
            {PRICING_CHOICES.map((c) => {
              const on = v.pricingModel === c.id;
              return (
                <label key={c.id} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${on ? "border-brand-900 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white"}`}>
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <input type="radio" name="pricingModel" value={c.id} checked={on} onChange={() => choosePricing(c.id)} className="size-4 accent-brand-900" />
                    {c.title}
                  </span>
                  <span className="text-xs text-muted">{c.text}</span>
                </label>
              );
            })}
          </div>
          {err("pricingModel")}
        </fieldset>
        {v.pricingModel === "fixed_partner" && (
          <div><Label k="partnerPriceDh" hint="Par personne, réglé directement au lieu.">Montant sur place (DH)</Label><input {...field("partnerPriceDh")} inputMode="decimal" value={v.partnerPriceDh} onChange={(e) => set("partnerPriceDh", e.target.value)} />{err("partnerPriceDh")}</div>
        )}
        {v.pricingModel === "variable_consumption" && (
          <>
            <p className="text-sm text-muted sm:col-span-2">Laissez vide pour afficher le budget de la gamme choisie (section 2) ; remplissez pour un budget précis.</p>
            <div><Label k="budgetMinDh">Budget estimé, minimum (DH / pers.)</Label><input {...field("budgetMinDh")} inputMode="decimal" value={v.budgetMinDh} onChange={(e) => set("budgetMinDh", e.target.value)} />{err("budgetMinDh")}</div>
            <div><Label k="budgetMaxDh">Budget estimé, maximum (DH / pers.)</Label><input {...field("budgetMaxDh")} inputMode="decimal" value={v.budgetMaxDh} onChange={(e) => set("budgetMaxDh", e.target.value)} />{err("budgetMaxDh")}</div>
          </>
        )}
        <div className="sm:col-span-2"><Label k="partnerId" hint="Facultatif : le lieu de vos fiches partenaires. Jamais affiché quand le lieu est secret.">Lieu partenaire</Label>
          <select {...field("partnerId")} value={v.partnerId ?? ""} onChange={(e) => choosePartner(e.target.value)}>
            <option value="">— Aucun ou pas encore choisi</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>{err("partnerId")}</div>
        <div className="rounded-xl bg-cream p-4 sm:col-span-2" aria-live="polite" data-testid="preview-client">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ce que voit le participant</p>
          <p className="mt-1 text-lg font-semibold text-ink">{v.free ? "Gratuit" : formatMoney({ amount: wenzyPrice, currency: "MAD" })}</p>
          <p className="text-sm text-ink">{onSitePreview ? `Sur place : ${onSitePreview}` : "Rien à régler sur place."}</p>
        </div>
        </>)}

        {pro && (
          <fieldset className="sm:col-span-2" data-testid="payment-model">
            <legend className="mb-2 text-sm font-medium text-ink">Comment vos participants paient-ils ?</legend>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
              {(organizer?.models ?? PAYMENT_MODELS).map((m) => {
                const on = v.paymentModel === m;
                return (
                  <label key={m} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${on ? "border-brand-900 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white"}`}>
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <input type="radio" name="paymentModel" value={m} checked={on} onChange={() => set("paymentModel", m)} className="size-4 accent-brand-900" />
                      {PAYMENT_MODEL_LABELS[m].title}
                    </span>
                    <span className="text-xs text-muted">{PAYMENT_MODEL_LABELS[m].text}</span>
                  </label>
                );
              })}
            </div>
            {err("paymentModel")}
          </fieldset>
        )}
        {pro && v.paymentModel === "deposit" && (
          <div><Label k="depositPercent" hint={`Entre ${DEPOSIT_MIN} et ${DEPOSIT_MAX} % du prix ; jamais moins que la commission.`}>Acompte payé en ligne (%)</Label><input {...field("depositPercent")} inputMode="numeric" value={v.depositPercent} onChange={(e) => set("depositPercent", e.target.value)} />{err("depositPercent")}</div>
        )}
        {pro && proSplit && (
          <p className="rounded-xl bg-cream px-4 py-3 text-sm text-ink sm:col-span-2" data-testid="payment-preview">
            {v.paymentModel === "full_online"
              ? `Le participant paie ${formatMoney({ amount: proSplit.onlineUnit, currency: "MAD" })} en ligne.`
              : `Le participant paie ${formatMoney({ amount: proSplit.onlineUnit, currency: "MAD" })} en ligne, puis ${formatMoney({ amount: proSplit.onSiteUnit, currency: "MAD" })} sur place${organizer?.asTeam ? " à l'organisateur" : ", directement à vous"}.`}{" "}
            <span className="text-muted">(commission actuelle : {organizer?.ratePercent ?? DEFAULT_COMMISSION_PERCENT} %)</span>
          </p>
        )}
        {pro && (
          <div className="grid gap-4 rounded-xl border border-line p-4 sm:col-span-2 sm:grid-cols-2" data-testid="part-online">
            <p className="text-sm font-semibold text-ink sm:col-span-2">Prix de l&apos;activité</p>
            <div><Label k="priceDh" hint="Prix total de l'activité pour une place (en ligne et sur place compris).">Prix total par place (DH)</Label><input {...field("priceDh")} inputMode="decimal" value={v.priceDh} onChange={(e) => set("priceDh", e.target.value)} />{err("priceDh")}</div>
            {proSelf && <p className="text-xs text-muted sm:col-span-2">La commission de Wenzy et le calendrier de reversement figurent dans votre contrat organisateur et dans « Finances ».</p>}
          </div>
        )}
        {mode === "edit" && bookedSeats > 0 && (
          <p role="note" className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:col-span-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {bookedSeats} place{bookedSeats > 1 ? "s" : ""} déjà réservée{bookedSeats > 1 ? "s" : ""} : leur prix est figé. Un changement ne s&apos;applique qu&apos;aux nouvelles réservations.
          </p>
        )}
      </Section>

      <Section id="dates" title={mode === "create" ? "6. Dates" : "6. Ajouter des dates (ou reproposer l'expérience)"}>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={addSessions} onChange={(e) => setAddSessions(e.target.checked)} className="size-4 accent-brand-900" />
          {mode === "create" ? "Programmer des dates maintenant" : "Créer ces nouvelles dates à l'enregistrement"}
        </label>
        {!addSessions && (
          <p className="text-sm text-muted sm:col-span-2">
            {mode === "create"
              ? "Sans date, la fiche est publiée avec « Prochaines dates bientôt » ; les visiteurs peuvent demander à être prévenus. Vous ajouterez des dates plus tard depuis cette fiche."
              : "Cochez pour ajouter une ou plusieurs dates : les personnes qui ont demandé à être prévenues recevront une notification."}
          </p>
        )}
        <div><Label k="sessions.firstDate">Première date</Label><input type="date" {...field("sessions.firstDate")} value={v.sessions.firstDate} onChange={(e) => setSession("firstDate", e.target.value)} />{err("sessions.firstDate")}</div>
        <div><Label k="sessions.time" hint="Heure de Casablanca.">Heure</Label><input type="time" {...field("sessions.time")} value={v.sessions.time} onChange={(e) => setSession("time", e.target.value)} />{err("sessions.time")}</div>
        <div><Label k="sessions.weeks" hint={`1 = date unique ; jusqu'à ${RECURRENCE_MAX_WEEKS} semaines.`}>Répéter chaque semaine pendant</Label><input {...field("sessions.weeks")} inputMode="numeric" value={v.sessions.weeks} onChange={(e) => setSession("weeks", e.target.value)} />{err("sessions.weeks")}</div>
        <div><Label k="sessions.capacity">Capacité par date</Label><input {...field("sessions.capacity")} inputMode="numeric" value={v.sessions.capacity} onChange={(e) => setSession("capacity", e.target.value)} />{err("sessions.capacity")}</div>
      </Section>

      <fieldset className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
        <legend className="float-left mb-3 w-full text-base font-semibold text-ink">6. Photos</legend>
        <div className="clear-both">
          {existingImages.length === 0 && images.length === 0 && template && (
            <div className="mb-3 flex flex-wrap items-center gap-3" data-testid="template-photo">
              <div className="relative size-24 overflow-hidden rounded-xl ring-2 ring-brand-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- photo du modèle (fichier du site) */}
                <img src={mediaUrl(template.image)} alt="" className="size-full object-cover" />
              </div>
              <p className="text-xs text-muted">Photo du modèle « {template.name} ». Ajoutez une photo pour la remplacer.</p>
            </div>
          )}
          {existingImages.length > 0 && images.length === 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {existingImages.map((img) => (
                <div key={img.path} className="relative size-24 overflow-hidden rounded-xl ring-2 ring-brand-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniature d'une photo existante */}
                  <img src={mediaUrl(img.path)} alt="" className="size-full object-cover" />
                </div>
              ))}
              <p className="basis-full text-xs text-muted">Photos actuelles. En ajouter de nouvelles les remplacera.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.url} className="relative size-24 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
                <img src={img.url} alt={img.name} className="size-full object-cover" />
                <button type="button" aria-label={`Retirer ${img.name}`} onClick={() => setImages((xs) => xs.filter((x) => x.url !== img.url))} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-black/50 text-white">
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
            <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted hover:border-brand-200 hover:text-brand-900">
              <ImagePlus className="size-6" aria-hidden />
              <span className="sr-only">Ajouter des photos</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                const ok = files.filter((f) => f.size <= 8 * 1024 * 1024 && /image\/(jpeg|png|webp)/.test(f.type));
                setImageError(ok.length < files.length ? "Certaines images ont été ignorées (8 Mo max, JPG/PNG/WebP)." : "");
                setImages((xs) => [...xs, ...ok.map((f) => ({ url: URL.createObjectURL(f), name: f.name, file: f }))]);
                e.target.value = "";
              }} />
            </label>
          </div>
          {imageError && <p className="mt-2 text-xs text-red-700">{imageError}</p>}
          <p className="mt-2 text-xs text-muted">La première photo sert de couverture. Format paysage conseillé, 8 Mo maximum par photo.</p>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
          {live ? (saving ? "Enregistrement…" : "Enregistrer") : "Vérifier le formulaire"}
        </button>
        {!live && <span className="text-xs text-muted">Mode démonstration : rien n&apos;est enregistré.</span>}
      </div>

      {!pro && <SaveAsTemplate values={v} template={template} existingImages={existingImages} live={live} />}

      {live && saved && (
        <section id="form-result" role="status" className="scroll-mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
          <h2 className="flex items-center gap-2 text-base font-semibold"><CheckCircle2 className="size-5" aria-hidden /> {pro ? "Activité enregistrée" : "Expérience enregistrée"}</h2>
          <p className="mt-2">
            {saved.sessionsCreated > 0 ? `${saved.sessionsCreated} date${saved.sessionsCreated > 1 ? "s" : ""} créée${saved.sessionsCreated > 1 ? "s" : ""}. ` : ""}
            {saved.status === "published" ? "Elle est visible sur le site." : saved.status === "pending_review" ? "Elle est envoyée à l'équipe pour validation : vous serez prévenu(e) dès sa publication." : "Elle reste en brouillon (invisible du public)."}
          </p>
          <p className="mt-3 flex flex-wrap gap-4 font-medium">
            {saved.status === "published" && <Link href={`/experiences/${saved.slug}`} className="underline">Voir sur le site</Link>}
            <Link href={proSelf ? "/pro/activites" : "/admin/experiences"} className="underline">{proSelf ? "Retour à mes activités" : "Retour aux expériences"}</Link>
            {mode === "create" && <Link href={proSelf ? `/pro/activites/${saved.experienceId}` : `/admin/experiences/${saved.experienceId}`} className="underline">Continuer à modifier</Link>}
          </p>
        </section>
      )}
      {live && serverError && (
        <section id="form-result" role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          {serverError}
        </section>
      )}
      {!live && result && preview && (
        <section id="form-result" className="scroll-mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
          <h2 className="flex items-center gap-2 text-base font-semibold"><CheckCircle2 className="size-5" aria-hidden /> Formulaire valide — voici ce qui serait créé</h2>
          <ul className="mt-3 space-y-1">
            <li><strong>{result.titleFr}</strong> · {result.district} · statut « {result.status === "published" ? "publiée" : "brouillon"} »</li>
            <li>Payé en ligne : {preview.price === 0 ? "gratuit" : `${formatMoney({ amount: preview.price, currency: "MAD" })} par place`}</li>
            <li>{preview.dates.length === 0 ? "Aucune nouvelle date (« Prochaines dates bientôt »)" : `${preview.dates.length} date${preview.dates.length > 1 ? "s" : ""} de ${result.sessions.capacity} places :`}</li>
          </ul>
          <ul className="mt-1 grid gap-1 ps-4 sm:grid-cols-2">
            {preview.dates.map((d) => (
              <li key={d.startAt} className="list-disc">
                {new Intl.DateTimeFormat("fr-FR", { timeZone: MOROCCO_TIMEZONE, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(d.startAt))}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-1.5 text-xs"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />Démonstration : rien n&apos;a été enregistré. Sur le site en ligne, l&apos;expérience est créée et l&apos;action journalisée.</p>
        </section>
      )}
    </form>
  );
}

/**
 * docs/22, décision 21 : « Enregistrer comme modèle » (nouveau modèle) ou « Mettre à jour le modèle » (celui d'origine).
 * Le modèle garde ses gammes ; le lieu, la date et la gamme choisie n'en font pas partie.
 */
function SaveAsTemplate({ values, template, existingImages, live }: { values: ExperienceFormValues; template?: Omit<EventTemplate, "values">; existingImages: { path: string }[]; live: boolean }) {
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [done, setDone] = useState("");
  const save = async (asNew: boolean) => {
    const label = asNew ? name.trim() : template!.name;
    if (label.length < 2) return setState("error");
    const photo = template?.image ?? existingImages.find((i) => i.path.startsWith("experiences/") || i.path.startsWith("/images/modeles/"))?.path ?? "/images/modeles/diner.webp";
    const weekday = values.sessions.firstDate ? new Date(`${values.sessions.firstDate}T12:00:00Z`).getUTCDay() : 6;
    setState("busy");
    setDone("");
    try {
      await firebase().auth.authStateReady();
      const res = await httpsCallable(firebase().functions, "adminSaveTemplate")({
        id: asNew ? templateSlug(label) : template!.id,
        name: label,
        image: photo,
        order: template?.order ?? 50,
        isActive: true,
        ...(template?.tiers ? { tiers: template.tiers } : {}),
        values: JSON.parse(JSON.stringify(valuesToTemplate(values, weekday))),
      });
      setDone(`Modèle « ${label} » enregistré.`);
      setState("idle");
      void res;
    } catch {
      setState("error");
    }
  };
  return (
    <section className="rounded-2xl border border-dashed border-line bg-white p-4 text-sm" data-testid="save-as-template">
      <p className="font-semibold text-ink">Modèle</p>
      <p className="mt-1 text-xs text-muted">Réutilisez ces réglages pour les prochains événements : textes, format, prix sur place, règles et questionnaire (sans le lieu ni la date).</p>
      {!live ? (
        <p className="mt-2 text-xs text-muted">Démonstration : les modèles s&apos;enregistrent sur le site en ligne.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {template && <button type="button" disabled={state === "busy"} onClick={() => save(false)} className="rounded-full border border-brand-900 px-4 py-2 font-semibold text-brand-900 disabled:opacity-60">Mettre à jour le modèle « {template.name} »</button>}
          <input aria-label="Nom du nouveau modèle" placeholder="Nom du nouveau modèle" value={name} onChange={(e) => { setName(e.target.value); setState("idle"); }} className="w-56 rounded-xl border border-line bg-white px-3 py-2" />
          <button type="button" disabled={state === "busy"} onClick={() => save(true)} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-60">Enregistrer comme nouveau modèle</button>
          {done && <span role="status" className="text-emerald-800">{done}</span>}
          {state === "error" && <span role="alert" className="text-red-800">Nom manquant ou enregistrement impossible.</span>}
        </div>
      )}
    </section>
  );
}

