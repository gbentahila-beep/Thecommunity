import type { MetadataRoute } from "next";
import { BLOG_ARTICLES, BLOG_CATEGORIES } from "@/content/blog";
import { HELP_ARTICLES } from "@/content/help";
import { getAllCategories, getCities, getPublicOrganizers, getPublishedExperiences } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Généré à la demande (jamais pendant la compilation : la base n'y est pas accessible).
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["", "/experiences", "/comment-ca-marche", "/a-propos", "/faq", "/contact", "/aide", "/aide/partenaires", "/blog", "/devenir-partenaire", "/presse", "/securite", "/cgu", "/cgv", "/confidentialite", "/conditions-activites-physiques", "/conditions-organisateurs", "/contrat-organisateur"];

function entry(path: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path || "/"}`,
    alternates: { languages: { fr: `${SITE_URL}${path || "/"}`, ar: `${SITE_URL}/ar${path}`, en: `${SITE_URL}/en${path}` } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, experiences, categories, organizers] = await Promise.all([getCities(), getPublishedExperiences(), getAllCategories(), getPublicOrganizers()]);
  const active = cities.filter((c) => c.isActive);
  return [
    ...STATIC_PATHS.map(entry),
    ...active.map((c) => entry(`/${c.id}`)),
    ...active.flatMap((c) => categories.map((k) => entry(`/${c.id}/${k.id}`))),
    ...experiences.map((e) => entry(`/experiences/${e.slug}`)),
    ...organizers.map((o) => entry(`/organisateurs/${o.slug}`)),
    ...HELP_ARTICLES.map((a) => entry(`/aide/${a.slug}`)),
    ...BLOG_CATEGORIES.map((c) => entry(`/blog/theme/${c.key}`)),
    ...BLOG_ARTICLES.map((a) => entry(`/blog/${a.slug}`)),
  ];
}
