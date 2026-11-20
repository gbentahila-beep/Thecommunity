"use client";

import { ACTIVITY_LEVELS, outingProposalSchema, type ActivityLevel, type CategoryKey } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

type Values = { title: string; categoryId: CategoryKey; description: string; district: string; venueIdea: string; datesIdea: string; capacity: string; priceIdeaDh: string; level: "" | ActivityLevel; willHost: boolean; notes: string };
const EMPTY: Values = { title: "", categoryId: "move", description: "", district: "", venueIdea: "", datesIdea: "", capacity: "8", priceIdeaDh: "", level: "", willHost: true, notes: "" };

/** 18d — Formulaire « Proposer une sortie » (membres de confiance). Relu par l'équipe avant toute publication. */
export function ProposalForm({ live, categories, forGroup }: { live: boolean; /** Étape 19 : catégories visibles (dynamiques). */ categories: { id: string; label: string }[]; /** Étape 31 : sortie proposée à un ancien groupe. */ forGroup?: { id: string; label: string } }) {
  const t = useTranslations("propose");
  const router = useRouter();
  const [v, setV] = useState<Values>(() => ({ ...EMPTY, categoryId: categories.some((c) => c.id === "move") ? "move" : (categories[0]?.id ?? "move") }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const set = <K extends keyof Values>(k: K, value: Values[K]) => { setV((x) => ({ ...x, [k]: value })); setErrors((e) => ({ ...e, [k]: "" })); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...v, priceIdeaDh: v.priceIdeaDh.trim() === "" ? undefined : v.priceIdeaDh, level: v.level || undefined, ...(forGroup ? { forGroupId: forGroup.id } : {}) };
    const parsed = outingProposalSchema.safeParse(data);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= t(`errors.${["tooShort", "tooLong", "required", "min2", "tooMany", "min0"].includes(i.message) ? i.message : "invalid"}`);
      setErrors(next);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (!live) { setState("sent"); return; }
    setState("busy");
    setError("");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, "submitOutingProposal")(JSON.parse(JSON.stringify(parsed.data)));
      setState("sent");
      setV(EMPTY);
      router.refresh();
    } catch (err) {
      const reason = (err as { details?: { reason?: string } }).details?.reason;
      setError(reason === "too_many_proposals" ? t("errors.tooManyProposals") : reason === "not_trusted" ? t("errors.notTrusted") : t("errors.generic"));
      setState("error");
    }
  };

  const input = "w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] focus:border-plum-700 focus:outline-none aria-[invalid=true]:border-red-400";
  const fieldProps = (k: keyof Values) => ({ id: `pr-${k}`, "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `pr-${k}-err` : undefined, className: input });
  const err = (k: keyof Values) => (errors[k] ? <p id={`pr-${k}-err`} className="mt-1 text-sm text-red-800">{errors[k]}</p> : null);
  const label = (k: keyof Values, text: string, hint?: string) => (
    <label htmlFor={`pr-${k}`} className="mb-1.5 block font-medium text-ink">{text}{hint && <span className="block text-sm font-normal text-muted">{hint}</span>}</label>
  );

  if (state === "sent") {
    return (
      <div role="status" className="rounded-[var(--radius-card)] bg-emerald-50 p-5 text-emerald-950" data-testid="proposal-sent">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" aria-hidden /> {t("sentTitle")}</p>
        <p className="mt-1 text-sm">{live ? t("sentText") : t("sentDemo")}</p>
        <button type="button" onClick={() => setState("idle")} className="mt-3 text-sm font-semibold underline">{t("another")}</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="proposal-form">
      {forGroup && <p className="rounded-xl bg-plum-50 px-4 py-3 text-sm text-plum-900" data-testid="proposal-for-group">{t("forGroup", { label: forGroup.label })}</p>}
      <div>{label("title", t("titleLabel"))}<input {...fieldProps("title")} value={v.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder={t("titlePlaceholder")} />{err("title")}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>{label("categoryId", t("categoryLabel"))}
          <select {...fieldProps("categoryId")} value={v.categoryId} onChange={(e) => set("categoryId", e.target.value as CategoryKey)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
        <div>{label("level", t("levelLabel"))}
          <select {...fieldProps("level")} value={v.level} onChange={(e) => set("level", e.target.value as Values["level"])}>
            <option value="">{t("levelNone")}</option>
            {ACTIVITY_LEVELS.map((l) => <option key={l} value={l}>{t(`level_${l}`)}</option>)}
          </select></div>
      </div>
      <div>{label("description", t("descriptionLabel"), t("descriptionHint"))}<textarea {...fieldProps("description")} rows={5} maxLength={1500} value={v.description} onChange={(e) => set("description", e.target.value)} />{err("description")}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>{label("district", t("districtLabel"))}<input {...fieldProps("district")} value={v.district} maxLength={60} onChange={(e) => set("district", e.target.value)} />{err("district")}</div>
        <div>{label("venueIdea", t("venueLabel"))}<input {...fieldProps("venueIdea")} value={v.venueIdea} maxLength={150} onChange={(e) => set("venueIdea", e.target.value)} />{err("venueIdea")}</div>
      </div>
      <div>{label("datesIdea", t("datesLabel"), t("datesHint"))}<input {...fieldProps("datesIdea")} value={v.datesIdea} maxLength={200} onChange={(e) => set("datesIdea", e.target.value)} />{err("datesIdea")}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>{label("capacity", t("capacityLabel"))}<input {...fieldProps("capacity")} inputMode="numeric" value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />{err("capacity")}</div>
        <div>{label("priceIdeaDh", t("priceLabel"), t("priceHint"))}<input {...fieldProps("priceIdeaDh")} inputMode="decimal" value={v.priceIdeaDh} onChange={(e) => set("priceIdeaDh", e.target.value)} />{err("priceIdeaDh")}</div>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={v.willHost} onChange={(e) => set("willHost", e.target.checked)} className="mt-0.5 size-5 accent-plum-900" />
        <span>{t("willHost")}</span>
      </label>
      <div>{label("notes", t("notesLabel"))}<textarea {...fieldProps("notes")} rows={2} maxLength={500} value={v.notes} onChange={(e) => set("notes", e.target.value)} />{err("notes")}</div>
      <p className="rounded-xl bg-plum-50 p-3 text-sm text-plum-900">{t("reviewNote")}</p>
      <button type="submit" disabled={state === "busy"} className="w-full rounded-full bg-plum-900 px-6 py-4 font-semibold text-white hover:bg-plum-800 disabled:opacity-60">
        {state === "busy" ? t("sending") : t("submit")}
      </button>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </form>
  );
}
