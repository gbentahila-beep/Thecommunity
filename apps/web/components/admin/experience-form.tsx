"use client";

import {
  experienceInputSchema,
  formatMoney,
  marginPerSeat,
  MOROCCO_TIMEZONE,
  planSessionDates,
  RECURRENCE_MAX_WEEKS,
  SPOKEN_LANGUAGES,
  type ExperienceInput,
} from "@thecommunity/shared";
import { collection, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { CheckCircle2, ImagePlus, Info, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mediaUrl } from "@/components/media";
import { firebase } from "@/lib/firebase/client";

type Option = { id: string; label: string; disabled?: boolean };
export type ExperienceFormValues = Omit<ExperienceInput, "sessions" | "groupMin" | "groupTarget" | "groupMax" | "costPerSeatDh" | "commissionPercent" | "priceDh" | "durationMinutes" | "maxSeatsPerBooking" | "memberPriceDh"> & {
  groupMin: string; groupTarget: string; groupMax: string; costPerSeatDh: string; commissionPercent: string;
  priceDh: string; durationMinutes: string; maxSeatsPerBooking: string; memberPriceDh: string;
  sessions: { firstDate: string; time: string; weeks: string; capacity: string };
};

const MESSAGES: Record<string, string> = {
  required: "Champ obligatoire.", tooShort: "Trop court.", tooLong: "Trop long.", tooMany: "Valeur trop élevée.",
  min0: "Doit être positif.", min1: "Au moins 1.", min2: "Au moins 2.", min15: "Au moins 15 minutes.", max100: "100 % maximum.",
  pickOne: "Choisissez au moins une langue.", groupOrder: "Il faut min ≤ cible ≤ max.", capacityBelowGroup: "La capacité doit permettre au moins un groupe complet.",
  seatsPerBookingMode: "Plus de 2 places par réservation : seulement en mode libre ou privatisé.", partnerRequired: "Le modèle commission nécessite un partenaire.",
  revealNeedsGroups: "La révélation différée n'est possible qu'avec des groupes (dîner social ou groupe).",
  inPast: "La première date est déjà passée.", memberAbovePublic: "Le prix membre doit être inférieur ou égal au prix public.", invalidImagePath: "Photo invalide.",
};
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

const input = "w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100";

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
}) {
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

  const grouped = v.bookingMode === "group" || v.bookingMode === "social_dinner";
  const opt = (s: string) => (s === "" ? undefined : s);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(null);
    setServerError("");
    const parsed = experienceInputSchema.safeParse({
      ...v,
      groupMin: grouped ? opt(v.groupMin) : undefined,
      groupTarget: grouped ? opt(v.groupTarget) : undefined,
      groupMax: grouped ? opt(v.groupMax) : undefined,
      costPerSeatDh: v.economicsModel === "own" ? opt(v.costPerSeatDh) : undefined,
      commissionPercent: v.economicsModel === "commission" ? opt(v.commissionPercent) : undefined,
      memberPriceDh: opt(v.memberPriceDh),
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
      const { db, storage, functions } = firebase();
      const id = experienceId ?? doc(collection(db, "experiences")).id;
      const uploaded: { path: string; alt: string }[] = [];
      for (const [i, img] of images.entries()) {
        const ext = img.file.type === "image/png" ? "png" : img.file.type === "image/webp" ? "webp" : "jpg";
        const path = `experiences/${id}/${Date.now()}-${i}.${ext}`;
        await uploadBytes(ref(storage, path), img.file, { contentType: img.file.type });
        uploaded.push({ path, alt: parsed.data.titleFr });
      }
      const res = await httpsCallable(functions, "adminSaveExperience")({
        ...(experienceId ? { experienceId } : { newId: id }),
        data: JSON.parse(JSON.stringify(parsed.data)), // retire les champs vides (undefined)
        addSessions,
        images: uploaded,
      });
      setSaved({ ...(res.data as { experienceId: string; slug: string; sessionsCreated: number }), status: parsed.data.status });
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
    const price = Math.round(result.priceDh * 100);
    const margin = marginPerSeat(price, result.economicsModel, Math.round((result.costPerSeatDh ?? 0) * 100), result.commissionPercent ?? 0);
    return { dates, price, margin };
  }, [result, addSessions]);

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
        <div className="sm:col-span-2"><Label k="titleAr" hint="Facultatif : sinon le titre français s'affiche sur la version arabe.">Titre (arabe)</Label><input {...field("titleAr")} dir="rtl" lang="ar" value={v.titleAr ?? ""} onChange={(e) => set("titleAr", e.target.value)} />{err("titleAr")}</div>
        <div className="sm:col-span-2"><Label k="summaryFr" hint="Une phrase, affichée sur les cartes.">Accroche</Label><input {...field("summaryFr")} value={v.summaryFr} onChange={(e) => set("summaryFr", e.target.value)} />{err("summaryFr")}</div>
        <div className="sm:col-span-2"><Label k="descriptionFr">Description</Label><textarea {...field("descriptionFr")} rows={5} value={v.descriptionFr} onChange={(e) => set("descriptionFr", e.target.value)} />{err("descriptionFr")}</div>
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
          <select {...field("categoryId")} value={v.categoryId} onChange={(e) => set("categoryId", e.target.value as ExperienceFormValues["categoryId"])}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>{err("categoryId")}</div>
        <div><Label k="status">Statut</Label>
          <select {...field("status")} value={v.status} onChange={(e) => set("status", e.target.value as "draft" | "published")}>
            <option value="draft">Brouillon (non visible)</option>
            <option value="published">Publiée</option>
          </select></div>
      </Section>

      <Section title="2. Lieu">
        <div><Label k="cityId">Ville</Label>
          <select {...field("cityId")} value={v.cityId} onChange={(e) => set("cityId", e.target.value)}>
            {cities.map((c) => <option key={c.id} value={c.id} disabled={c.disabled}>{c.label}</option>)}
          </select>{err("cityId")}</div>
        <div><Label k="district">Quartier</Label><input {...field("district")} value={v.district} onChange={(e) => set("district", e.target.value)} />{err("district")}</div>
        <div><Label k="venueName">Nom du lieu</Label><input {...field("venueName")} value={v.venueName} onChange={(e) => set("venueName", e.target.value)} />{err("venueName")}</div>
        <div><Label k="address">Adresse</Label><input {...field("address")} value={v.address} onChange={(e) => set("address", e.target.value)} />{err("address")}</div>
        <div className="sm:col-span-2"><Label k="revealPolicy">Révélation du lieu</Label>
          <select {...field("revealPolicy")} value={v.revealPolicy} onChange={(e) => set("revealPolicy", e.target.value as "immediate" | "on_group_reveal")}>
            <option value="immediate">Visible dès la réservation</option>
            <option value="on_group_reveal">Révélé la veille avec le groupe</option>
          </select>{err("revealPolicy")}</div>
      </Section>

      <Section title="3. Format et prix">
        <div className="sm:col-span-2"><Label k="bookingMode">Mode de réservation</Label>
          <select {...field("bookingMode")} value={v.bookingMode} onChange={(e) => set("bookingMode", e.target.value as ExperienceFormValues["bookingMode"])}>
            {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select></div>
        <div className="sm:col-span-2"><Label k="admission" hint="Sur demande : chaque personne envoie une demande (message, Instagram facultatif) ; l'équipe accepte ou refuse dans « Demandes de participation », puis la personne acceptée a 24 h pour payer.">Inscription</Label>
          <select {...field("admission")} value={v.admission} onChange={(e) => set("admission", e.target.value as ExperienceFormValues["admission"])}>
            <option value="direct">Réservation directe — on réserve et on paie tout de suite</option>
            <option value="on_request">Sur demande — l&apos;équipe valide chaque participant</option>
          </select></div>
        {v.admission === "on_request" && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={v.requestMessageRequired} onChange={(e) => set("requestMessageRequired", e.target.checked)} className="size-4 accent-plum-900" />
            Message de motivation obligatoire (« Pourquoi souhaitez-vous participer ? »)
          </label>
        )}
        {grouped && (
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <div><Label k="groupMin">Taille min</Label><input {...field("groupMin")} inputMode="numeric" value={v.groupMin} onChange={(e) => set("groupMin", e.target.value)} />{err("groupMin")}</div>
            <div><Label k="groupTarget">Cible</Label><input {...field("groupTarget")} inputMode="numeric" value={v.groupTarget} onChange={(e) => set("groupTarget", e.target.value)} />{err("groupTarget")}</div>
            <div><Label k="groupMax">Taille max</Label><input {...field("groupMax")} inputMode="numeric" value={v.groupMax} onChange={(e) => set("groupMax", e.target.value)} />{err("groupMax")}</div>
          </div>
        )}
        <div><Label k="priceDh">Prix par place (DH)</Label><input {...field("priceDh")} inputMode="decimal" value={v.priceDh} onChange={(e) => set("priceDh", e.target.value)} />{err("priceDh")}</div>
        <div><Label k="memberPriceDh" hint="Facultatif. Vide = réduction de l'abonnement (réglée dans « Abonnement »).">Prix membre (DH)</Label><input {...field("memberPriceDh")} inputMode="decimal" value={v.memberPriceDh} onChange={(e) => set("memberPriceDh", e.target.value)} />{err("memberPriceDh")}</div>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" checked={v.membersOnly} onChange={(e) => set("membersOnly", e.target.checked)} className="size-4 accent-plum-900" />
          Réservée aux membres abonnés
        </label>
        <div><Label k="durationMinutes">Durée (minutes)</Label><input {...field("durationMinutes")} inputMode="numeric" value={v.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />{err("durationMinutes")}</div>
        <div><Label k="maxSeatsPerBooking" hint="1 pour une réservation individuelle.">Places max par réservation</Label><input {...field("maxSeatsPerBooking")} inputMode="numeric" value={v.maxSeatsPerBooking} onChange={(e) => set("maxSeatsPerBooking", e.target.value)} />{err("maxSeatsPerBooking")}</div>
        <div><Label k="cancellationPolicyId">Conditions d&apos;annulation</Label>
          <select {...field("cancellationPolicyId")} value={v.cancellationPolicyId} onChange={(e) => set("cancellationPolicyId", e.target.value)}>
            {policies.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-medium text-ink">Langues de l&apos;expérience</legend>
          <div className="flex flex-wrap gap-2" aria-invalid={Boolean(errors.languages)}>
            {SPOKEN_LANGUAGES.map((l) => {
              const on = v.languages.includes(l);
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => set("languages", on ? v.languages.filter((x) => x !== l) : [...v.languages, l])}
                  className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-plum-900 bg-plum-900 text-white" : "border-line bg-white"}`}>
                  {LANG_LABELS[l]}
                </button>
              );
            })}
          </div>
          {err("languages")}
        </fieldset>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={v.alcoholServed} onChange={(e) => set("alcoholServed", e.target.checked)} className="size-4 accent-plum-900" />
          De l&apos;alcool est servi pendant l&apos;expérience
        </label>
        <div className="sm:col-span-2"><Label k="included" hint="Un élément par ligne.">Ce qui est inclus</Label><textarea {...field("included")} rows={3} value={v.included ?? ""} onChange={(e) => set("included", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label k="practicalInfo">Infos pratiques</Label><textarea {...field("practicalInfo")} rows={2} value={v.practicalInfo ?? ""} onChange={(e) => set("practicalInfo", e.target.value)} /></div>
      </Section>

      <Section title="4. Partenaire et économie (visible uniquement par l'équipe)">
        <div><Label k="partnerId">Partenaire</Label>
          <select {...field("partnerId")} value={v.partnerId ?? ""} onChange={(e) => set("partnerId", e.target.value)}>
            <option value="">— Aucun (organisé par The Host Club)</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>{err("partnerId")}</div>
        <div><Label k="economicsModel">Modèle</Label>
          <select {...field("economicsModel")} value={v.economicsModel} onChange={(e) => set("economicsModel", e.target.value as "own" | "commission")}>
            <option value="own">Organisée par nous (marge = prix − coût)</option>
            <option value="commission">Commission sur un partenaire</option>
          </select></div>
        {v.economicsModel === "own" ? (
          <div><Label k="costPerSeatDh">Coût par place (DH)</Label><input {...field("costPerSeatDh")} inputMode="decimal" value={v.costPerSeatDh} onChange={(e) => set("costPerSeatDh", e.target.value)} />{err("costPerSeatDh")}</div>
        ) : (
          <div><Label k="commissionPercent">Commission (%)</Label><input {...field("commissionPercent")} inputMode="decimal" value={v.commissionPercent} onChange={(e) => set("commissionPercent", e.target.value)} />{err("commissionPercent")}</div>
        )}
      </Section>

      <Section id="dates" title={mode === "create" ? "5. Dates" : "5. Ajouter des dates (ou reproposer l'expérience)"}>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={addSessions} onChange={(e) => setAddSessions(e.target.checked)} className="size-4 accent-plum-900" />
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
          {existingImages.length > 0 && images.length === 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {existingImages.map((img) => (
                <div key={img.path} className="relative size-24 overflow-hidden rounded-xl ring-2 ring-plum-100">
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
            <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted hover:border-plum-200 hover:text-plum-900">
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
        <button type="submit" disabled={saving} className="rounded-full bg-plum-900 px-6 py-3 font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
          {live ? (saving ? "Enregistrement…" : "Enregistrer") : "Vérifier le formulaire"}
        </button>
        {!live && <span className="text-xs text-muted">Mode démonstration : rien n&apos;est enregistré.</span>}
      </div>

      {live && saved && (
        <section id="form-result" role="status" className="scroll-mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
          <h2 className="flex items-center gap-2 text-base font-semibold"><CheckCircle2 className="size-5" aria-hidden /> Expérience enregistrée</h2>
          <p className="mt-2">
            {saved.sessionsCreated > 0 ? `${saved.sessionsCreated} date${saved.sessionsCreated > 1 ? "s" : ""} créée${saved.sessionsCreated > 1 ? "s" : ""}. ` : ""}
            {saved.status === "published" ? "Elle est visible sur le site." : "Elle reste en brouillon (invisible du public)."}
          </p>
          <p className="mt-3 flex flex-wrap gap-4 font-medium">
            {saved.status === "published" && <Link href={`/experiences/${saved.slug}`} className="underline">Voir sur le site</Link>}
            <Link href="/admin/experiences" className="underline">Retour aux expériences</Link>
            {mode === "create" && <Link href={`/admin/experiences/${saved.experienceId}`} className="underline">Continuer à modifier</Link>}
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
            <li>Prix {formatMoney({ amount: preview.price, currency: "MAD" })} · marge estimée {formatMoney({ amount: preview.margin, currency: "MAD" })} par place</li>
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
