"use client";

import { BOOKING_MODES, CATEGORY_ICONS, categoryInputSchema, cityInputSchema, parseDistricts, type Category, type City } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { mediaUrl } from "@/components/media";
import { firebase } from "@/lib/firebase/client";
import { CATEGORY_STYLES } from "@/lib/site";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 disabled:bg-cream";
const MODE_LABELS: Record<string, string> = {
  individual: "Individuel — chacun réserve sa place",
  group: "Groupe — équipes formées par la plateforme",
  social_dinner: "Dîner social — tables composées par l'équipe",
  open: "Libre — seul ou accompagné",
  private: "Privatisé — groupe déjà constitué",
};

function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </div>
  );
}

const ICON_LABELS: Record<(typeof CATEGORY_ICONS)[number], string> = {
  utensils: "Couverts", flower: "Fleur", gamepad: "Manette", palette: "Palette", sparkles: "Étincelles", users: "Personnes",
  book: "Livre", mountain: "Montagne", music: "Musique", dumbbell: "Haltère", coffee: "Café", map: "Carte", ticket: "Billet", camera: "Appareil photo",
};
/** Pictogramme des cinq univers historiques quand aucun n'a été choisi. */
const HISTORIC_ICON: Record<string, (typeof CATEGORY_ICONS)[number]> = { eat: "utensils", move: "flower", play: "gamepad", create: "palette", discover: "sparkles" };

/**
 * Étape 19 : image d'une ville ou d'une catégorie. Envoyée dans le stockage (dossier public « cities » ou « categories »,
 * écriture réservée à l'équipe), puis enregistrée avec la fiche. Un chemin « /images/… » (photo du site) reste accepté.
 */
function ImageField({ id, folder, value, onChange, disabled }: { id: string; folder: "cities" | "categories"; value: string; onChange: (path: string) => void; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu d'un fichier du stockage (URL dynamique)
        <img src={mediaUrl(value)} alt="" className="h-24 w-36 rounded-lg object-cover" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          className="text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (file.size > 8 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Image JPEG, PNG ou WebP de 8 Mo maximum.");
            setBusy(true);
            try {
              await firebase().auth.authStateReady();
              const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
              const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
              await uploadBytes(ref(firebase().storage, path), file, { contentType: file.type });
              onChange(path);
            } catch {
              setError("Envoi impossible.");
            } finally {
              setBusy(false);
            }
          }}
        />
        {value && !disabled && (
          <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-red-800 underline">Retirer l&apos;image</button>
        )}
        {busy && <span className="text-xs text-muted">Envoi…</span>}
      </div>
      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    </div>
  );
}

/** Enregistre via une Cloud Function (super-admin, journalisé), puis rafraîchit le site public. */
function useSave(fn: "adminSaveCity" | "adminSaveCategory") {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const save = async (data: unknown) => {
    setState("busy");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, fn)(data);
      await fetch("/api/admin/revalidate", { method: "POST" }).catch(() => undefined);
      setState("saved");
      router.refresh();
      return true;
    } catch {
      setState("error");
      return false;
    }
  };
  return { state, setState, save };
}

function Footer({ canEdit, state, label }: { canEdit: boolean; state: string; label: string }) {
  if (!canEdit) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={state === "busy"} className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
        {state === "busy" ? "Enregistrement…" : label}
      </button>
      {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.</p>}
      {state === "error" && <p role="alert" className="text-sm text-red-800">Enregistrement impossible : vérifiez les champs.</p>}
    </div>
  );
}

/** Ville : noms (fr / ar / en), ouverte ou « bientôt », ordre, quartiers. Création si `city` est absente. */
export function CityForm({ city, canEdit, nextOrder = 0 }: { city?: City; canEdit: boolean; nextOrder?: number }) {
  const [v, setV] = useState({
    id: city?.id ?? "",
    nameFr: city?.name.fr ?? "",
    nameAr: city?.name.ar ?? "",
    nameEn: city?.name.en ?? "",
    isActive: city?.isActive ?? false,
    isComingSoon: city?.isComingSoon ?? true,
    order: String(city?.order ?? nextOrder),
    districts: (city?.districts ?? []).join("\n"),
    region: city?.region ?? "",
    country: city?.country ?? "Maroc",
    imagePath: city?.imagePath ?? "",
  });
  const [invalid, setInvalid] = useState<string[]>([]);
  const { state, setState, save } = useSave("adminSaveCity");
  const p = `city-${city?.id ?? "new"}`;
  const set = (k: keyof typeof v, value: string | boolean) => {
    setV((x) => ({ ...x, [k]: value }));
    setState("idle");
  };
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = { ...v, order: Number(v.order), districts: parseDistricts(v.districts) };
        const r = cityInputSchema.safeParse(data);
        if (!r.success) {
          setInvalid(r.error.issues.map((i) => String(i.path[0])));
          setState("error");
          return;
        }
        setInvalid([]);
        if ((await save(r.data)) && !city) setV((x) => ({ ...x, id: "", nameFr: "", nameAr: "", nameEn: "", districts: "", region: "", imagePath: "" }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {!city && (
          <Field id={`${p}-id`} label="Identifiant (adresse web)" hint="Ex. « rabat » : minuscules, chiffres et tirets. Définitif.">
            <input id={`${p}-id`} className={input} value={v.id} disabled={!canEdit} onChange={(e) => set("id", e.target.value.toLowerCase())} aria-invalid={invalid.includes("id") || undefined} />
          </Field>
        )}
        <Field id={`${p}-fr`} label="Nom (français)">
          <input id={`${p}-fr`} className={input} value={v.nameFr} disabled={!canEdit} onChange={(e) => set("nameFr", e.target.value)} aria-invalid={invalid.includes("nameFr") || undefined} />
        </Field>
        <Field id={`${p}-ar`} label="Nom (arabe)">
          <input id={`${p}-ar`} className={input} dir="rtl" lang="ar" value={v.nameAr} disabled={!canEdit} onChange={(e) => set("nameAr", e.target.value)} />
        </Field>
        <Field id={`${p}-en`} label="Nom (anglais)">
          <input id={`${p}-en`} className={input} lang="en" value={v.nameEn} disabled={!canEdit} onChange={(e) => set("nameEn", e.target.value)} />
        </Field>
        <Field id={`${p}-order`} label="Ordre d'affichage">
          <input id={`${p}-order`} type="number" min={0} className={input} value={v.order} disabled={!canEdit} onChange={(e) => set("order", e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.isActive} disabled={!canEdit} onChange={(e) => set("isActive", e.target.checked)} /> Ouverte (visible et réservable)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.isComingSoon && !v.isActive} disabled={!canEdit || v.isActive} onChange={(e) => set("isComingSoon", e.target.checked)} /> Annoncée « bientôt »</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`${p}-region`} label="Région (facultatif)">
          <input id={`${p}-region`} className={input} value={v.region} disabled={!canEdit} onChange={(e) => set("region", e.target.value)} aria-invalid={invalid.includes("region") || undefined} />
        </Field>
        <Field id={`${p}-country`} label="Pays">
          <input id={`${p}-country`} className={input} value={v.country} disabled={!canEdit} onChange={(e) => set("country", e.target.value)} aria-invalid={invalid.includes("country") || undefined} />
        </Field>
        <Field id={`${p}-image`} label="Photo de la ville (facultatif)">
          <ImageField id={`${p}-image`} folder="cities" value={v.imagePath} disabled={!canEdit} onChange={(path) => set("imagePath", path)} />
        </Field>
      </div>
      <Field id={`${p}-districts`} label="Quartiers" hint="Un par ligne (ou séparés par des virgules).">
        <textarea id={`${p}-districts`} rows={3} className={input} value={v.districts} disabled={!canEdit} onChange={(e) => set("districts", e.target.value)} />
      </Field>
      <Footer canEdit={canEdit} state={state} label={city ? "Enregistrer la ville" : "Ajouter la ville"} />
    </form>
  );
}

/**
 * Catégorie : noms et description (fr / ar / en), ordre, visibilité, mode de réservation par défaut ; étape 19 :
 * pictogramme, couleur, image, catégorie parente (sous-catégorie). Création si `category` est absente.
 */
export function CategoryForm({
  category,
  canEdit,
  parents = [],
  hasChildren = false,
  nextOrder = 0,
}: {
  category?: Category;
  canEdit: boolean;
  /** Catégories principales pouvant accueillir une sous-catégorie. */
  parents?: { id: string; label: string }[];
  /** Une catégorie qui a des sous-catégories reste principale. */
  hasChildren?: boolean;
  nextOrder?: number;
}) {
  const loc = (t: { fr: string; ar?: string; en?: string } | undefined) => ({ fr: t?.fr ?? "", ar: t?.ar ?? "", en: t?.en ?? "" });
  const initial = () => ({
    id: category?.id ?? "",
    name: loc(category?.name),
    shortName: loc(category?.shortName),
    description: loc(category?.description),
    order: String(category?.order ?? nextOrder),
    isActive: category ? category.isActive !== false : false,
    defaultBookingMode: category?.defaultBookingMode ?? ("individual" as Category["defaultBookingMode"]),
    icon: ((category?.icon as (typeof CATEGORY_ICONS)[number] | undefined) ?? HISTORIC_ICON[category?.id ?? ""] ?? "sparkles") as (typeof CATEGORY_ICONS)[number],
    color: category?.color ?? "",
    imagePath: category?.imagePath ?? "",
    parentId: category?.parentId ?? "",
  });
  const [v, setV] = useState(initial);
  const [invalid, setInvalid] = useState<string[]>([]);
  const { state, setState, save } = useSave("adminSaveCategory");
  const p = `cat-${category?.id ?? "new"}`;
  const update = (patch: Partial<ReturnType<typeof initial>>) => {
    setV((x) => ({ ...x, ...patch }));
    setState("idle");
  };
  const setLoc = (k: "name" | "shortName" | "description", l: "fr" | "ar" | "en", value: string) => {
    setV((x) => ({ ...x, [k]: { ...x[k], [l]: value } }));
    setState("idle");
  };
  const LANGS = [["fr", "français"], ["ar", "arabe"], ["en", "anglais"]] as const;
  const historic = Boolean(category && CATEGORY_STYLES[category.id]);
  const previewColor = v.color || (historic ? undefined : "#722637");
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = categoryInputSchema.safeParse({ ...v, order: Number(v.order) });
        if (!r.success) {
          setInvalid(r.error.issues.map((i) => i.path.join(".")));
          setState("error");
          return;
        }
        setInvalid([]);
        if ((await save(r.data)) && !category) setV(initial());
      }}
    >
      {!category && (
        <Field id={`${p}-id`} label="Identifiant (adresse web)" hint="Ex. « rencontres » : minuscules, chiffres et tirets, 2 à 24 caractères. Définitif : /casablanca/rencontres.">
          <input id={`${p}-id`} className={input} value={v.id} disabled={!canEdit} onChange={(e) => update({ id: e.target.value.toLowerCase() })} aria-invalid={invalid.includes("id") || undefined} />
        </Field>
      )}
      {(["name", "shortName"] as const).map((k) => (
        <div key={k} className="grid gap-3 sm:grid-cols-3">
          {LANGS.map(([l, label]) => (
            <Field key={l} id={`${p}-${k}-${l}`} label={`${k === "name" ? "Nom" : "Nom court"} (${label})`}>
              <input id={`${p}-${k}-${l}`} className={input} dir={l === "ar" ? "rtl" : undefined} lang={l} value={v[k][l]} disabled={!canEdit} onChange={(e) => setLoc(k, l, e.target.value)} aria-invalid={invalid.includes(`${k}.${l}`) || undefined} />
            </Field>
          ))}
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-3">
        {LANGS.map(([l, label]) => (
          <Field key={l} id={`${p}-desc-${l}`} label={`Description (${label})`}>
            <textarea id={`${p}-desc-${l}`} rows={2} className={input} dir={l === "ar" ? "rtl" : undefined} lang={l} value={v.description[l]} disabled={!canEdit} onChange={(e) => setLoc("description", l, e.target.value)} aria-invalid={invalid.includes(`description.${l}`) || undefined} />
          </Field>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`${p}-icon`} label="Pictogramme">
          <div className="flex items-center gap-2">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${previewColor ? "bg-(--cat)/10 text-(--cat)" : `${CATEGORY_STYLES[category?.id ?? ""]?.bg} ${CATEGORY_STYLES[category?.id ?? ""]?.text}`}`} style={previewColor ? ({ "--cat": previewColor } as React.CSSProperties) : undefined}>
              <CategoryIcon category={v.id} icon={v.icon} className="size-5" />
            </span>
            <select id={`${p}-icon`} className={input} value={v.icon} disabled={!canEdit} onChange={(e) => update({ icon: e.target.value as typeof v.icon })}>
              {CATEGORY_ICONS.map((i) => <option key={i} value={i}>{ICON_LABELS[i]}</option>)}
            </select>
          </div>
        </Field>
        <Field id={`${p}-color`} label="Couleur" hint={historic ? "Vide : couleur d'origine de l'univers." : "Vide : prune du site."}>
          <div className="flex items-center gap-3">
            <input id={`${p}-color`} type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-white" value={v.color || "#722637"} disabled={!canEdit} onChange={(e) => update({ color: e.target.value })} aria-invalid={invalid.includes("color") || undefined} />
            {v.color && canEdit && <button type="button" onClick={() => update({ color: "" })} className="text-xs font-semibold text-brand-900 underline">Couleur par défaut</button>}
          </div>
        </Field>
        <Field id={`${p}-image`} label="Image (facultatif)" hint="Affichée sur l'accueil et « Comment ça marche ».">
          <ImageField id={`${p}-image`} folder="categories" value={v.imagePath} disabled={!canEdit} onChange={(path) => update({ imagePath: path })} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field id={`${p}-parent`} label="Catégorie parente" hint={hasChildren ? "Cette catégorie a des sous-catégories : elle reste principale." : "Vide : catégorie principale (menu, accueil)."}>
          <select id={`${p}-parent`} className={input} value={v.parentId} disabled={!canEdit || hasChildren} onChange={(e) => update({ parentId: e.target.value })} aria-invalid={invalid.includes("parentId") || undefined}>
            <option value="">— Aucune (principale) —</option>
            {parents.filter((x) => x.id !== v.id).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Field>
        <Field id={`${p}-order`} label="Ordre d'affichage">
          <input id={`${p}-order`} type="number" min={0} className={input} value={v.order} disabled={!canEdit} onChange={(e) => update({ order: e.target.value })} />
        </Field>
        <Field id={`${p}-mode`} label="Mode de réservation par défaut">
          <select id={`${p}-mode`} className={input} value={v.defaultBookingMode} disabled={!canEdit} onChange={(e) => update({ defaultBookingMode: e.target.value as typeof v.defaultBookingMode })}>
            {BOOKING_MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m] ?? m}</option>)}
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={v.isActive} disabled={!canEdit} onChange={(e) => update({ isActive: e.target.checked })} /> Visible sur le site</label>
      </div>
      <Footer canEdit={canEdit} state={state} label={category ? "Enregistrer la catégorie" : "Ajouter la catégorie"} />
    </form>
  );
}
