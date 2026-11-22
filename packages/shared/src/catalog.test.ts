import { describe, expect, it } from "vitest";
import { activeFilterCount, applyCatalog, catalogParams, experienceBadge, parseCatalogParams, perSeatPrice, EMPTY_CATALOG_FILTERS, type CatalogFilters } from "./catalog";
import { DEFAULT_HOME_SETTINGS, homeSettingsFromInput, homeSettingsInputSchema, normalizeHomeSettings, HOME_SECTIONS } from "./home";
import { levenshtein, normalizeSearch, queryTokens, searchScore } from "./search";
import type { Experience, Session } from "./types";

const exp = (id: string, o: Partial<Experience> = {}): Experience =>
  ({
    id,
    slug: id,
    title: { fr: id },
    summary: { fr: "" },
    description: { fr: "" },
    categoryId: "move",
    district: "Maarif",
    tags: [],
    price: { amount: 15000, currency: "MAD" },
    bookingMode: "open",
    maxSeatsPerBooking: 4,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...o,
  }) as Experience;
const ses = (id: string, e: Experience, startAt: string, o: Partial<Session> = {}) =>
  ({ id, experienceId: e.id, startAt, price: e.price, capacity: 10, seatsConfirmed: 2, seatsHeld: 0, status: "published", isFeatured: false, experience: e, ...o }) as Session & { experience: Experience };
const F = (o: Partial<CatalogFilters> = {}): CatalogFilters => ({ ...EMPTY_CATALOG_FILTERS, ...o });

describe("recherche tolérante (23)", () => {
  it("normalise accents, ponctuation et arabe", () => {
    expect(normalizeSearch("Céramique à l'Atelier !")).toBe("ceramique a l atelier");
    expect(normalizeSearch("أمسية كناوة")).toBe(normalizeSearch("امسيه كناوه"));
    expect(queryTokens("Dîner de la médina")).toEqual(["diner", "medina"]);
  });
  it("une faute de frappe au plus, sur les mots de 4 lettres et plus", () => {
    expect(levenshtein("padle", "padel")).toBe(1);
    expect(levenshtein("pade", "padel")).toBe(1);
    expect(levenshtein("yoga", "padel")).toBe(2);
    const fields = [{ text: "Padel entre inconnus", weight: 3 }];
    expect(searchScore("padel", fields)).toBe(9);
    expect(searchScore("pad", fields)).toBe(6);
    expect(searchScore("paddel", fields)).toBe(3);
    expect(searchScore("padek", fields)).toBe(3);
    expect(searchScore("padle", fields)).toBe(3);
    expect(searchScore("pzz", fields)).toBe(0);
    expect(searchScore("padel yoga", fields)).toBe(0);
  });
});

describe("catalogue : paramètres, filtres, tri (23)", () => {
  it("lit et réécrit les paramètres d'adresse, ignore les valeurs inconnues", () => {
    // docs/22, décision 33 : « prix » et « quartier » ignorés, plus de tri par prix ; « moment » ajouté.
    const f = parseCatalogParams({ q: " padel ", prix: "200", quartier: "Anfa", debutant: "1", format: "seul", dispo: "1", public: "femmes", date: "2026-11-28", gamme: "premium", moment: "soir", tri: "prix-croissant" });
    expect(f).toEqual({ q: "padel", maxPrice: null, district: null, beginner: true, format: "solo", available: true, women: true, date: "2026-11-28", tier: "premium", moment: "evening", sort: "recommended" });
    expect(catalogParams(f)).toEqual([["q", "padel"], ["debutant", "1"], ["format", "seul"], ["dispo", "1"], ["public", "femmes"], ["date", "2026-11-28"], ["gamme", "premium"], ["moment", "soir"]]);
    expect(activeFilterCount(f)).toBe(7);
    expect(parseCatalogParams({ prix: "250", format: "x", date: "2026-13-45", gamme: "luxe", tri: "n'importe" })).toEqual(EMPTY_CATALOG_FILTERS);
  });
  it("prix comparable = en ligne + part fixe sur place", () => {
    const e = exp("a", { price: { amount: 6000, currency: "MAD" }, pricing: { model: "fixed_partner", currency: "MAD", partner: { name: "Club", price: { amount: 14000, currency: "MAD" } } } as Experience["pricing"] });
    expect(perSeatPrice(e)).toBe(20000);
  });
  it("combine les filtres et garde la première date qui correspond", () => {
    const padel = exp("padel", { title: { fr: "Padel entre inconnus" }, level: "beginner", district: "Anfa" });
    const diner = exp("diner", { title: { fr: "Dîner entre inconnus" }, bookingMode: "social_dinner", maxSeatsPerBooking: 1, price: { amount: 35000, currency: "MAD" } });
    const sessions = [
      ses("p1", padel, "2026-11-27T18:00:00Z", { seatsConfirmed: 10 }),
      ses("p2", padel, "2026-11-28T18:00:00Z"),
      ses("d1", diner, "2026-11-27T19:00:00Z"),
    ];
    const undated = [exp("yoga", { title: { fr: "Yoga" }, district: "Anfa" })];
    expect(applyCatalog({ sessions, undated, filters: F({ q: "padle" }) }).dated.map((x) => x.session?.id)).toEqual(["p1"]);
    const avail = applyCatalog({ sessions, undated, filters: F({ available: true, district: "Anfa" }) });
    expect(avail.dated.map((x) => x.session?.id)).toEqual(["p2"]);
    expect(avail.undated).toEqual([]);
    expect(applyCatalog({ sessions, undated, filters: F({ format: "solo" }) }).dated.map((x) => x.experience.id)).toEqual(["diner"]);
    expect(applyCatalog({ sessions, undated, filters: F({ maxPrice: 200 }) }).dated.map((x) => x.experience.id)).toEqual(["padel"]);
    expect(applyCatalog({ sessions, undated, filters: F({ date: "2026-11-28" }) }).dated.map((x) => x.session?.id)).toEqual(["p2"]);
    expect(applyCatalog({ sessions, undated, filters: F({ district: "Anfa" }) }).undated.map((x) => x.experience.id)).toEqual(["yoga"]);
    expect(applyCatalog({ sessions, undated, filters: F({ sort: "price_desc" }) }).dated.map((x) => x.experience.id)).toEqual(["diner", "padel"]);
  });
  it("tri recommandé : coups de cœur d'abord, dates complètes en dernier", () => {
    const a = exp("a");
    const b = exp("b");
    const c = exp("c");
    const sessions = [ses("a1", a, "2026-11-27T10:00:00Z", { seatsConfirmed: 10 }), ses("b1", b, "2026-11-28T10:00:00Z"), ses("c1", c, "2026-11-29T10:00:00Z")];
    expect(applyCatalog({ sessions, undated: [], filters: F(), featuredIds: ["c"] }).dated.map((x) => x.experience.id)).toEqual(["c", "b", "a"]);
  });
});

describe("badges (23)", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("coup de cœur > nouveau > populaire", () => {
    expect(experienceBadge(exp("a", { createdAt: "2026-11-10T00:00:00Z" }), null, now, ["a"])).toBe("featured");
    expect(experienceBadge(exp("a", { createdAt: "2026-11-10T00:00:00Z" }), null, now)).toBe("new");
    expect(experienceBadge(exp("a", { ratingAvg: 4.8, ratingCount: 12 }), null, now)).toBe("popular");
    expect(experienceBadge(exp("a"), { isFeatured: false, capacity: 12, seatsConfirmed: 9, seatsHeld: 0 }, now)).toBe("popular");
    expect(experienceBadge(exp("a"), { isFeatured: false, capacity: 12, seatsConfirmed: 12, seatsHeld: 0 }, now)).toBeNull();
    expect(experienceBadge(exp("a", { ratingAvg: 4.8, ratingCount: 3 }), null, now)).toBeNull();
  });
});

describe("réglages de l'accueil (23)", () => {
  const base = { banner: { enabled: false, textFr: "" }, sections: DEFAULT_HOME_SETTINGS.sections, featuredExperienceIds: [] };
  it("valide la bannière, les sections et les mises en avant", () => {
    expect(homeSettingsInputSchema.safeParse(base).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ ...base, banner: { enabled: true, textFr: "" } }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ ...base, banner: { enabled: true, textFr: "Nouveau : le padel !", href: "javascript:alert(1)", linkFr: "Voir" } }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ ...base, banner: { enabled: true, textFr: "Nouveau : le padel !", href: "/experiences?q=padel" } }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ ...base, featuredExperienceIds: ["a", "a"] }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ ...base, sections: base.sections.slice(1) }).success).toBe(false);
    const ok = homeSettingsInputSchema.parse({ ...base, banner: { enabled: true, textFr: "Nouveau : le padel !", textEn: "New: padel!", href: "/experiences?q=padel", linkFr: "Voir" } });
    expect(homeSettingsFromInput(ok).banner).toEqual({ enabled: true, text: { fr: "Nouveau : le padel !", en: "New: padel!" }, href: "/experiences?q=padel", linkLabel: { fr: "Voir" } });
  });
  it("complète des réglages anciens ou incomplets", () => {
    const n = normalizeHomeSettings({ sections: [{ id: "faq", enabled: true }, { id: "faq", enabled: false }, { id: "inconnu" as "faq", enabled: true }] });
    expect(n.sections[0]).toEqual({ id: "faq", enabled: true });
    expect(n.sections.map((s) => s.id).sort()).toEqual([...HOME_SECTIONS].sort());
    expect(normalizeHomeSettings(null)).toEqual(DEFAULT_HOME_SETTINGS);
  });
});
