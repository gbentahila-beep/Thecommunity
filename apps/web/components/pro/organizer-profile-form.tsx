"use client";

import { organizerProfileSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mediaUrl } from "@/components/media";
import { firebase } from "@/lib/firebase/client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100";
type Values = { description: string; descriptionAr: string; descriptionEn: string; website: string; instagram: string; phone: string; address: string; logoPath: string };

/** Étape 20 — profil public (page organisateur) et coordonnées ; logo dans le dossier public de l'organisateur. */
export function OrganizerProfileForm({ orgId, initial, live }: { orgId: string; initial: Values; live: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [invalid, setInvalid] = useState<string[]>([]);
  const set = (k: keyof Values, value: string) => { setV((x) => ({ ...x, [k]: value })); setState("idle"); };
  const field = (k: keyof Values) => ({ id: `p-${k}`, className: input, value: v[k], "aria-invalid": invalid.includes(k) || undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value) });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = organizerProfileSchema.safeParse(v);
        if (!r.success) { setInvalid(r.error.issues.map((i) => String(i.path[0]))); setState("error"); return; }
        setInvalid([]);
        if (!live) return setState("saved");
        setState("busy");
        try {
          await firebase().auth.authStateReady();
          await httpsCallable(firebase().functions, "organizerUpdateProfile")(r.data);
          setState("saved");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <div>
        <label htmlFor="p-logo" className="mb-1 block text-sm font-medium">Logo ou photo</label>
        {/* eslint-disable-next-line @next/next/no-img-element -- aperçu d'un fichier du stockage */}
        {v.logoPath && <img src={mediaUrl(v.logoPath)} alt="" className="mb-2 size-20 rounded-2xl object-cover" />}
        <input id="p-logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) return setState("error");
          const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
          const path = `organizers/${orgId}/public/logo-${Date.now().toString(36)}.${ext}`;
          if (live) {
            try {
              await firebase().auth.authStateReady();
              await firebase().auth.currentUser?.getIdToken(true); // droits d'organisateur à jour
              await uploadBytes(ref(firebase().storage, path), file, { contentType: file.type });
            } catch { return setState("error"); }
          }
          set("logoPath", path);
        }} />
      </div>
      <div><label htmlFor="p-description" className="mb-1 block text-sm font-medium">Présentation (français)</label><textarea {...field("description")} rows={5} /></div>
      <details className="rounded-xl border border-line p-3" open={Boolean(v.descriptionAr || v.descriptionEn)}>
        <summary className="cursor-pointer text-sm font-semibold">Traductions (facultatif)</summary>
        <div className="mt-3 space-y-3">
          <div><label htmlFor="p-descriptionAr" className="mb-1 block text-sm font-medium">Présentation (arabe)</label><textarea {...field("descriptionAr")} rows={4} dir="rtl" lang="ar" /></div>
          <div><label htmlFor="p-descriptionEn" className="mb-1 block text-sm font-medium">Présentation (anglais)</label><textarea {...field("descriptionEn")} rows={4} lang="en" /></div>
        </div>
      </details>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="p-website" className="mb-1 block text-sm font-medium">Site web</label><input {...field("website")} inputMode="url" /></div>
        <div><label htmlFor="p-instagram" className="mb-1 block text-sm font-medium">Instagram</label><input {...field("instagram")} /></div>
        <div><label htmlFor="p-phone" className="mb-1 block text-sm font-medium">Téléphone (équipe seulement)</label><input {...field("phone")} type="tel" /></div>
        <div><label htmlFor="p-address" className="mb-1 block text-sm font-medium">Adresse (équipe seulement)</label><input {...field("address")} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === "busy"} className="rounded-full bg-plum-900 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{state === "busy" ? "Enregistrement…" : "Enregistrer le profil"}</button>
        {state === "saved" && <p role="status" className="text-sm text-emerald-800">Enregistré.{live ? "" : " (démonstration : rien n'est enregistré)"}</p>}
        {state === "error" && <p role="alert" className="text-sm text-red-800">Enregistrement impossible : vérifiez les champs (présentation : 30 caractères minimum).</p>}
      </div>
    </form>
  );
}
