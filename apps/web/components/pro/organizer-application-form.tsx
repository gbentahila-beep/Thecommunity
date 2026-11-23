"use client";

import { ORGANIZER_DOCUMENT_MAX_BYTES, ORGANIZER_DOCUMENTS_MAX, organizerApplicationSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { CheckCircle2, FileText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100";
const MESSAGES: Record<string, string> = {
  required: "Champ obligatoire.",
  tooShort: "Trop court (30 caractères minimum).",
  tooLong: "Trop long.",
  email: "Adresse e-mail invalide.",
  phone: "Numéro invalide.",
  pickOne: "Choisissez au moins une catégorie.",
  tooMany: "Trois catégories au maximum.",
  invalidDocument: "Pièce invalide.",
  invalidImage: "Image invalide.",
};

export type ApplicationValues = {
  businessName: string; contactName: string; email: string; phone: string; cityId: string; address: string;
  categoryIds: string[]; description: string; website: string; instagram: string;
  documents: { path: string; name: string }[]; logoPath: string;
};

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

/**
 * Étape 20 — candidature organisateur : structure, contact, catégories, description, pièces justificatives
 * (registre de commerce, assurance…), logo, acceptation du contrat organisateur. Relue par l'équipe.
 */
export function OrganizerApplicationForm({
  initial,
  cities,
  categories,
  uid,
  live,
  emailVerified,
  resubmit = false,
}: {
  initial: ApplicationValues;
  cities: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  uid: string;
  live: boolean;
  emailVerified: boolean;
  resubmit?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");
  const set = <K extends keyof ApplicationValues>(k: K, value: ApplicationValues[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const upload = async (file: File, kind: "documents" | "logo") => {
    const okType = kind === "logo" ? /^image\/(jpeg|png|webp)$/.test(file.type) : /^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type);
    if (!okType || file.size > ORGANIZER_DOCUMENT_MAX_BYTES) {
      setErrors((e) => ({ ...e, [kind === "logo" ? "logoPath" : "documents"]: kind === "logo" ? "Image JPEG, PNG ou WebP, 10 Mo maximum." : "PDF ou image, 10 Mo maximum." }));
      return null;
    }
    const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "-").slice(-80) || "fichier";
    const path = `organizer-uploads/${uid}/${kind}/${Date.now().toString(36)}-${safe}`;
    if (!live) return path; // démonstration : rien n'est envoyé
    setUploading(true);
    try {
      await firebase().auth.authStateReady();
      await uploadBytes(ref(firebase().storage, path), file, { contentType: file.type });
      return path;
    } catch {
      setErrors((e) => ({ ...e, [kind === "logo" ? "logoPath" : "documents"]: "Envoi impossible. Réessayez." }));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const parsed = organizerApplicationSchema.safeParse({ ...v, acceptTerms: accept });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= MESSAGES[i.message] ?? "Champ invalide.";
      setErrors(next);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (!live) return setDone(true);
    setBusy(true);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "applyAsOrganizer")(parsed.data);
      // Retour à l'accueil de l'espace : il affiche le statut « en attente de validation ».
      router.push("/pro");
      router.refresh();
    } catch (err) {
      const reason = (err as { details?: { reason?: string } }).details?.reason;
      setServerError(
        reason === "email_not_verified" ? "Confirmez d'abord votre adresse e-mail (lien reçu à l'inscription)." : reason === "already_organizer" ? "Vous avez déjà un compte organisateur." : "Envoi impossible : vérifiez les champs et réessayez.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950" data-testid="application-sent">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="size-5" aria-hidden /> Demande envoyée</h2>
        <p className="mt-2 text-sm">L&apos;équipe relit votre demande (en général sous 48 h ouvrées) et vous prévient par e-mail. {live ? "" : "Démonstration : rien n'a été enregistré."}</p>
      </section>
    );
  }
  const f = (k: string) => ({ id: `o-${k}`, "aria-invalid": Boolean(errors[k]) || undefined, "aria-describedby": errors[k] ? `o-${k}-error` : undefined, className: `${input} ${errors[k] ? "border-red-400" : ""}` });
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {!emailVerified && live && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">Confirmez votre adresse e-mail (lien reçu à l&apos;inscription) avant d&apos;envoyer la demande.</p>
      )}
      <fieldset className="grid gap-4 rounded-2xl bg-white p-5 shadow-card sm:grid-cols-2">
        <legend className="float-left mb-2 w-full text-base font-semibold text-ink">1. Votre structure</legend>
        <Field id="o-businessName" label="Nom affiché (structure, club, atelier…)" error={errors.businessName}><input {...f("businessName")} value={v.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field>
        <Field id="o-contactName" label="Personne à contacter" error={errors.contactName}><input {...f("contactName")} value={v.contactName} onChange={(e) => set("contactName", e.target.value)} autoComplete="name" /></Field>
        <Field id="o-email" label="E-mail professionnel" error={errors.email}><input {...f("email")} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></Field>
        <Field id="o-phone" label="Téléphone" error={errors.phone}><input {...f("phone")} type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></Field>
        <Field id="o-cityId" label="Ville" error={errors.cityId}>
          <select {...f("cityId")} value={v.cityId} onChange={(e) => set("cityId", e.target.value)}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field id="o-address" label="Adresse du lieu principal" error={errors.address}><input {...f("address")} value={v.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" /></Field>
        <Field id="o-website" label="Site web (facultatif)" error={errors.website}><input {...f("website")} value={v.website} onChange={(e) => set("website", e.target.value)} inputMode="url" /></Field>
        <Field id="o-instagram" label="Instagram (facultatif)" error={errors.instagram}><input {...f("instagram")} value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@votreclub" /></Field>
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
        <legend className="float-left mb-2 w-full text-base font-semibold text-ink">2. Vos activités</legend>
        <div className="clear-both">
          <p className="mb-2 text-sm font-medium text-ink" id="o-categoryIds-label">Catégories (1 à 3)</p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="o-categoryIds-label" aria-describedby={errors.categoryIds ? "o-categoryIds-error" : undefined}>
            {categories.map((c) => {
              const on = v.categoryIds.includes(c.id);
              return (
                <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-brand-900 bg-brand-50" : "border-line bg-white"}`}>
                  <input type="checkbox" className="size-4 accent-brand-900" checked={on} onChange={(e) => set("categoryIds", e.target.checked ? [...v.categoryIds, c.id] : v.categoryIds.filter((x) => x !== c.id))} />
                  {c.label}
                </label>
              );
            })}
          </div>
          {errors.categoryIds && <p id="o-categoryIds-error" role="alert" className="mt-1 text-xs text-red-700">{errors.categoryIds}</p>}
        </div>
        <Field id="o-description" label="Présentation (affichée sur votre page une fois validée)" hint="Ce que vous proposez, pour qui, où, votre expérience. 30 caractères minimum." error={errors.description}>
          <textarea {...f("description")} rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field id="o-logo" label="Logo ou photo (facultatif)" error={errors.logoPath}>
          <input id="o-logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="text-sm" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const p = await upload(file, "logo"); if (p) set("logoPath", p); } e.target.value = ""; }} />
          {v.logoPath && <p className="mt-1 text-xs text-emerald-800">Image ajoutée ✓</p>}
        </Field>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
        <legend className="float-left mb-2 w-full text-base font-semibold text-ink">3. Pièces justificatives</legend>
        <p className="clear-both text-sm text-muted">Registre de commerce ou statut d&apos;auto-entrepreneur, attestation d&apos;assurance responsabilité civile, et pour les activités encadrées un diplôme ou une carte professionnelle. PDF ou image, 10 Mo maximum, {ORGANIZER_DOCUMENTS_MAX} pièces au plus. Visibles uniquement par l&apos;équipe.</p>
        <ul className="space-y-2" data-testid="documents">
          {v.documents.map((d) => (
            <li key={d.path} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-brand-900" aria-hidden />
              <span className="flex-1 truncate">{d.name}</span>
              <button type="button" aria-label={`Retirer ${d.name}`} onClick={() => set("documents", v.documents.filter((x) => x.path !== d.path))} className="grid size-7 place-items-center rounded-full hover:bg-white"><X className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
        {v.documents.length < ORGANIZER_DOCUMENTS_MAX && (
          <div>
            <label htmlFor="o-documents" className="mb-1 block text-sm font-medium text-ink">Ajouter une pièce</label>
            <input id="o-documents" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={uploading} className="text-sm" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const p = await upload(file, "documents"); if (p) set("documents", [...v.documents, { path: p, name: file.name.slice(0, 120) }]); } e.target.value = ""; }} />
          </div>
        )}
        {uploading && <p className="text-xs text-muted" role="status">Envoi en cours…</p>}
        {errors.documents && <p className="text-xs text-red-700">{errors.documents}</p>}
      </fieldset>

      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
        <label className="flex items-start gap-3 text-sm">
          <input id="o-acceptTerms" type="checkbox" className="mt-0.5 size-4 accent-brand-900" checked={accept} onChange={(e) => { setAccept(e.target.checked); setErrors((x) => ({ ...x, acceptTerms: "" })); }} aria-invalid={Boolean(errors.acceptTerms) || undefined} />
          <span>J&apos;ai lu et j&apos;accepte le <Link href="/contrat-organisateur" target="_blank" className="font-semibold text-brand-900 underline">contrat organisateur</Link> (commission, encaissement et reversements, annulations, responsabilités, données personnelles des participants).</span>
        </label>
        {errors.acceptTerms && <p className="text-xs text-red-700">Vous devez accepter le contrat organisateur.</p>}
        <button type="submit" disabled={busy || uploading || (live && !emailVerified)} className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
          {busy ? "Envoi…" : resubmit ? "Renvoyer ma demande" : "Envoyer ma demande"}
        </button>
        {!live && <p className="text-xs text-muted">Démonstration : le formulaire est vérifié mais rien n&apos;est enregistré.</p>}
        {serverError && <p role="alert" className="text-sm text-red-800">{serverError}</p>}
      </div>
    </form>
  );
}
