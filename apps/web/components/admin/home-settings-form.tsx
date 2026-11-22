"use client";

import { HOME_FEATURED_MAX, HOME_SECTION_LABELS, homeSettingsInputSchema, type HomeSectionId, type HomeSettings } from "@thecommunity/shared";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

const ERRORS: Record<string, string> = {
  required: "Texte de la bannière obligatoire (3 caractères au moins).",
  invalidLink: "Lien : une page du site qui commence par « / » (ex. /abonnement) ou une adresse https://.",
  tooLong: "Texte trop long.",
  tooMany: `${HOME_FEATURED_MAX} activités au plus.`,
  duplicate: "Une activité ou une section est en double.",
};

/** Étape 23 — Back-office → Accueil : bannière, sections (affichées et dans quel ordre), coups de cœur. */
export function HomeSettingsForm({ initial, experiences, live }: { initial: HomeSettings; experiences: { id: string; title: string }[]; live: boolean }) {
  const router = useRouter();
  const b = initial.banner;
  const [banner, setBanner] = useState({
    enabled: b?.enabled ?? false,
    textFr: b?.text.fr ?? "",
    textEn: b?.text.en ?? "",
    textAr: b?.text.ar ?? "",
    href: b?.href ?? "",
    linkFr: b?.linkLabel?.fr ?? "",
    linkEn: b?.linkLabel?.en ?? "",
    linkAr: b?.linkLabel?.ar ?? "",
  });
  const [sections, setSections] = useState(initial.sections);
  const [featured, setFeatured] = useState(initial.featuredExperienceIds.filter((id) => experiences.some((e) => e.id === id)));
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const titleOf = new Map(experiences.map((e) => [e.id, e.title]));

  const move = <T,>(list: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  };

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = homeSettingsInputSchema.safeParse({ banner, sections, featuredExperienceIds: featured });
        if (!r.success) return setMsg({ ok: false, text: ERRORS[r.error.issues[0]?.message ?? ""] ?? "Vérifiez les champs." });
        if (!live) return setMsg({ ok: true, text: "Démonstration : rien n'est enregistré." });
        setBusy(true);
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "adminSaveHomeSettings")(r.data);
          await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
          setMsg({ ok: true, text: "Accueil enregistré : il est déjà à jour sur le site." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as { message?: string }).message ?? "Enregistrement impossible." });
        }
        setBusy(false);
      }}
    >
      <fieldset className="space-y-3" data-testid="home-banner-form">
        <legend className="font-display text-xl font-medium text-brand-900">Bannière d&apos;annonce</legend>
        <p className="text-sm text-muted">Une ligne en haut de l&apos;accueil (nouvelle activité, ouverture d&apos;une ville, offre). 140 caractères au plus.</p>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={banner.enabled} onChange={(e) => setBanner({ ...banner, enabled: e.target.checked })} className="size-4 accent-brand-900" />
          Afficher la bannière
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm"><span className="mb-1 block font-medium">Texte (français)</span><input id="banner-fr" className={input} maxLength={140} value={banner.textFr} onChange={(e) => setBanner({ ...banner, textFr: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Texte (anglais, facultatif)</span><input id="banner-en" className={input} maxLength={140} value={banner.textEn} onChange={(e) => setBanner({ ...banner, textEn: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Texte (arabe, facultatif)</span><input id="banner-ar" dir="rtl" className={input} maxLength={140} value={banner.textAr} onChange={(e) => setBanner({ ...banner, textAr: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Lien (facultatif)</span><input id="banner-href" className={input} value={banner.href} onChange={(e) => setBanner({ ...banner, href: e.target.value })} placeholder="/experiences?q=padel" /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Texte du lien (français)</span><input id="banner-link-fr" className={input} maxLength={40} value={banner.linkFr} onChange={(e) => setBanner({ ...banner, linkFr: e.target.value })} placeholder="Réserver" /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Texte du lien (anglais)</span><input className={input} maxLength={40} value={banner.linkEn} onChange={(e) => setBanner({ ...banner, linkEn: e.target.value })} /></label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-xl font-medium text-brand-900">Sections de l&apos;accueil</legend>
        <p className="text-sm text-muted">Cochez les sections à afficher et rangez-les avec les flèches. L&apos;accroche et la photo du haut ne bougent pas. Une section automatique vide n&apos;apparaît pas.</p>
        <ol className="divide-y divide-line rounded-xl border border-line bg-white" data-testid="home-sections">
          {sections.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm" data-section={s.id}>
              <label className="flex flex-1 items-center gap-2">
                <input type="checkbox" checked={s.enabled} onChange={(e) => setSections(sections.map((x) => (x.id === s.id ? { ...x, enabled: e.target.checked } : x)))} className="size-4 accent-brand-900" aria-label={`Afficher : ${HOME_SECTION_LABELS[s.id as HomeSectionId]}`} />
                <span className={s.enabled ? "text-ink" : "text-muted line-through"}>{HOME_SECTION_LABELS[s.id as HomeSectionId]}</span>
              </label>
              <button type="button" onClick={() => setSections(move(sections, i, -1))} disabled={i === 0} aria-label={`Monter : ${HOME_SECTION_LABELS[s.id]}`} className="grid size-8 place-items-center rounded-full hover:bg-cream disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
              <button type="button" onClick={() => setSections(move(sections, i, 1))} disabled={i === sections.length - 1} aria-label={`Descendre : ${HOME_SECTION_LABELS[s.id]}`} className="grid size-8 place-items-center rounded-full hover:bg-cream disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ol>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-xl font-medium text-brand-900">Coups de cœur de l&apos;équipe</legend>
        <p className="text-sm text-muted">Jusqu&apos;à {HOME_FEATURED_MAX} activités publiées, dans l&apos;ordre choisi : section « Coups de cœur » de l&apos;accueil, badge « Coup de cœur » et première place dans le catalogue (tri « Recommandées »).</p>
        <ol className="space-y-2" data-testid="home-featured">
          {featured.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
              <span className="flex-1">{i + 1}. {titleOf.get(id) ?? id}</span>
              <button type="button" onClick={() => setFeatured(move(featured, i, -1))} disabled={i === 0} aria-label={`Monter : ${titleOf.get(id)}`} className="grid size-8 place-items-center rounded-full hover:bg-cream disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
              <button type="button" onClick={() => setFeatured(move(featured, i, 1))} disabled={i === featured.length - 1} aria-label={`Descendre : ${titleOf.get(id)}`} className="grid size-8 place-items-center rounded-full hover:bg-cream disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
              <button type="button" onClick={() => setFeatured(featured.filter((x) => x !== id))} aria-label={`Retirer : ${titleOf.get(id)}`} className="grid size-8 place-items-center rounded-full text-red-800 hover:bg-red-50"><X className="size-4" aria-hidden /></button>
            </li>
          ))}
          {featured.length === 0 && <li className="text-sm text-muted">Aucune activité choisie : la section « Coups de cœur » n&apos;apparaît pas.</li>}
        </ol>
        {featured.length < HOME_FEATURED_MAX && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm"><span className="mb-1 block font-medium">Ajouter une activité</span>
              <select id="featured-pick" className={`${input} min-w-64`} value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Choisir…</option>
                {experiences.filter((e) => !featured.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </label>
            <button type="button" disabled={!pick} onClick={() => { setFeatured([...featured, pick]); setPick(""); }} className="rounded-full border border-brand-900 px-4 py-2 text-sm font-semibold text-brand-900 disabled:opacity-40">Ajouter</button>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-full bg-brand-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Enregistrer l&apos;accueil</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
