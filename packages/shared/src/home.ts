import { z } from "zod";
import type { LocalizedText } from "./types";

/**
 * Étape 23 — accueil modifiable par l'équipe (settings/home) : bannière d'annonce, sections affichées
 * et leur ordre, activités mises en avant (« Coups de cœur », aussi en tête du catalogue).
 * Le haut de page (accroche et photo) ne bouge pas : c'est l'identité du site.
 */

export const HOME_SECTIONS = ["manifesto", "featured", "thisWeek", "weekend", "new", "popular", "trust", "how", "universes", "reviews", "price", "app", "cities", "faq"] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  manifesto: "Phrase manifeste (« On compose le groupe… ») et les Babs",
  featured: "Coups de cœur de l'équipe (activités choisies ci-dessous)",
  thisWeek: "Cette semaine à Casablanca",
  weekend: "Ce week-end (automatique)",
  new: "Nouveautés (automatique : publiées depuis moins de 30 jours)",
  popular: "Populaires (automatique : très bien notées ou presque complètes)",
  trust: "Sécurité, bande sombre (3 repères : venir en solo, groupes composés, lieux vérifiés)",
  how: "Comment ça marche",
  universes: "Univers",
  reviews: "Pourquoi venir (avis)",
  price: "Combien ça coûte (35 DH en ligne, le reste sur place)",
  app: "Application (bientôt sur les stores)",
  cities: "Villes",
  faq: "Questions fréquentes",
};

export const HOME_FEATURED_MAX = 8;
export const HOME_BANNER_MAX = 140;

export type HomeBanner = { enabled: boolean; text: LocalizedText; href: string; linkLabel: LocalizedText | null };
export type HomeSettings = {
  banner: HomeBanner | null;
  sections: { id: HomeSectionId; enabled: boolean }[];
  featuredExperienceIds: string[];
};

/** Par défaut : l'accueil tel qu'il était avant l'étape 23 (les nouvelles sections sont à activer). */
export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  banner: null,
  sections: [
    // Audit du 25/11 (étape 3, docs/29) : manifeste, Comment ça marche, Votre semaine, univers, avis, sécurité,
    // prix, application, questions ; la phrase de clôture suit toujours.
    { id: "manifesto", enabled: true },
    { id: "how", enabled: true },
    { id: "thisWeek", enabled: true },
    { id: "featured", enabled: false },
    { id: "weekend", enabled: false },
    { id: "new", enabled: false },
    { id: "popular", enabled: false },
    { id: "universes", enabled: true },
    { id: "reviews", enabled: true },
    { id: "trust", enabled: true },
    { id: "price", enabled: true },
    { id: "app", enabled: true },
    { id: "cities", enabled: false },
    { id: "faq", enabled: true },
  ],
  featuredExperienceIds: [],
};

/** Lien de la bannière : une page du site (« /abonnement ») ou une adresse https. */
const HREF = /^(\/[A-Za-z0-9\-/_?=&.#%]*|https:\/\/[^\s<>"']+)$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export const homeSettingsInputSchema = z
  .object({
    banner: z.object({
      enabled: z.boolean(),
      textFr: z.string().trim().max(HOME_BANNER_MAX, "tooLong"),
      textAr: z.string().trim().max(HOME_BANNER_MAX, "tooLong").optional().or(z.literal("")),
      textEn: z.string().trim().max(HOME_BANNER_MAX, "tooLong").optional().or(z.literal("")),
      href: z.string().trim().max(300, "tooLong").regex(HREF, "invalidLink").optional().or(z.literal("")),
      linkFr: z.string().trim().max(40, "tooLong").optional().or(z.literal("")),
      linkAr: z.string().trim().max(40, "tooLong").optional().or(z.literal("")),
      linkEn: z.string().trim().max(40, "tooLong").optional().or(z.literal("")),
    }),
    sections: z.array(z.object({ id: z.enum(HOME_SECTIONS), enabled: z.boolean() })).length(HOME_SECTIONS.length),
    featuredExperienceIds: z.array(z.string().regex(ID)).max(HOME_FEATURED_MAX, "tooMany"),
  })
  .superRefine((v, ctx) => {
    if (v.banner.enabled && v.banner.textFr.length < 3) ctx.addIssue({ code: "custom", path: ["banner", "textFr"], message: "required" });
    if (v.banner.href && !v.banner.linkFr) ctx.addIssue({ code: "custom", path: ["banner", "linkFr"], message: "required" });
    if (new Set(v.sections.map((s) => s.id)).size !== v.sections.length) ctx.addIssue({ code: "custom", path: ["sections"], message: "duplicate" });
    if (new Set(v.featuredExperienceIds).size !== v.featuredExperienceIds.length) ctx.addIssue({ code: "custom", path: ["featuredExperienceIds"], message: "duplicate" });
  });
export type HomeSettingsInput = z.input<typeof homeSettingsInputSchema>;

/** Données enregistrées (settings/home) à partir de la saisie validée. */
export function homeSettingsFromInput(v: z.output<typeof homeSettingsInputSchema>): HomeSettings {
  const b = v.banner;
  const loc = (fr: string, ar?: string, en?: string): LocalizedText => ({ fr, ...(ar ? { ar } : {}), ...(en ? { en } : {}) });
  return {
    banner: b.textFr ? { enabled: b.enabled, text: loc(b.textFr, b.textAr, b.textEn), href: b.href ?? "", linkLabel: b.linkFr ? loc(b.linkFr, b.linkAr, b.linkEn) : null } : null,
    sections: v.sections,
    featuredExperienceIds: v.featuredExperienceIds,
  };
}

/** Réglages lus (éventuellement incomplets ou anciens) → réglages complets : sections inconnues retirées, manquantes ajoutées. */
export function normalizeHomeSettings(raw: Partial<HomeSettings> | null | undefined): HomeSettings {
  if (!raw) return DEFAULT_HOME_SETTINGS;
  const known = (raw.sections ?? []).filter((s, i, all) => HOME_SECTIONS.includes(s.id) && all.findIndex((x) => x.id === s.id) === i);
  // Une section ajoutée depuis le dernier enregistrement prend une place sensée (et non tout en bas de la page) :
  // le manifeste en tête, le prix et l'application juste avant les questions, les autres à la fin.
  const sections = known.map((s) => ({ id: s.id, enabled: s.enabled === true }));
  for (const d of DEFAULT_HOME_SETTINGS.sections) {
    if (sections.some((s) => s.id === d.id)) continue;
    const faq = sections.findIndex((s) => s.id === "faq");
    const at = d.id === "manifesto" ? 0 : (d.id === "price" || d.id === "app") && faq >= 0 ? faq : sections.length;
    sections.splice(at, 0, { ...d });
  }
  return {
    banner: raw.banner?.text?.fr ? { enabled: raw.banner.enabled === true, text: raw.banner.text, href: raw.banner.href ?? "", linkLabel: raw.banner.linkLabel ?? null } : null,
    sections,
    featuredExperienceIds: (raw.featuredExperienceIds ?? []).filter((id) => ID.test(id)).slice(0, HOME_FEATURED_MAX),
  };
}
