"use client";

import { BOOKING_MODES, categoryInputSchema, cityInputSchema, parseDistricts, type Category, type City } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100 disabled:bg-cream";
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
      <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
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
        if ((await save(r.data)) && !city) setV((x) => ({ ...x, id: "", nameFr: "", nameAr: "", nameEn: "", districts: "" }));
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
      <Field id={`${p}-districts`} label="Quartiers" hint="Un par ligne (ou séparés par des virgules).">
        <textarea id={`${p}-districts`} rows={3} className={input} value={v.districts} disabled={!canEdit} onChange={(e) => set("districts", e.target.value)} />
      </Field>
      <Footer canEdit={canEdit} state={state} label={city ? "Enregistrer la ville" : "Ajouter la ville"} />
    </form>
  );
}

/** Univers : noms et description (fr / ar / en), ordre, visibilité, mode de réservation par défaut. */
export function CategoryForm({ category, canEdit }: { category: Category; canEdit: boolean }) {
  const loc = (t: { fr: string; ar?: string; en?: string } | undefined) => ({ fr: t?.fr ?? "", ar: t?.ar ?? "", en: t?.en ?? "" });
  const [v, setV] = useState({
    id: category.id,
    name: loc(category.name),
    shortName: loc(category.shortName),
    description: loc(category.description),
    order: String(category.order ?? 0),
    isActive: category.isActive !== false,
    defaultBookingMode: category.defaultBookingMode,
  });
  const [invalid, setInvalid] = useState<string[]>([]);
  const { state, setState, save } = useSave("adminSaveCategory");
  const p = `cat-${category.id}`;
  const setLoc = (k: "name" | "shortName" | "description", l: "fr" | "ar" | "en", value: string) => {
    setV((x) => ({ ...x, [k]: { ...x[k], [l]: value } }));
    setState("idle");
  };
  const LANGS = [["fr", "français"], ["ar", "arabe"], ["en", "anglais"]] as const;
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
        await save(r.data);
      }}
    >
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
        <Field id={`${p}-order`} label="Ordre d'affichage">
          <input id={`${p}-order`} type="number" min={0} className={input} value={v.order} disabled={!canEdit} onChange={(e) => { setV((x) => ({ ...x, order: e.target.value })); setState("idle"); }} />
        </Field>
        <Field id={`${p}-mode`} label="Mode de réservation par défaut">
          <select id={`${p}-mode`} className={input} value={v.defaultBookingMode} disabled={!canEdit} onChange={(e) => { setV((x) => ({ ...x, defaultBookingMode: e.target.value as typeof x.defaultBookingMode })); setState("idle"); }}>
            {BOOKING_MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m] ?? m}</option>)}
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={v.isActive} disabled={!canEdit} onChange={(e) => { setV((x) => ({ ...x, isActive: e.target.checked })); setState("idle"); }} /> Visible sur le site</label>
      </div>
      <Footer canEdit={canEdit} state={state} label="Enregistrer l'univers" />
    </form>
  );
}
