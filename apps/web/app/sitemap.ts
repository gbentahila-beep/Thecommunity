import type { MetadataRoute } from "next";
import { CATEGORY_KEYS } from "@thecommunity/shared";
import { BLOG_ARTICLES, BLOG_CATEGORIES } from "@/content/blog";
import { HELP_ARTICLES } from "@/content/help";
import { getCities, getPublishedExperiences } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Généré à la demande (jamais pendant la compilation : la base n'y est pas accessible).
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["", "/experiences", "/comment-ca-marche", "/a-propos", "/faq", "/contact", "/aide", "/aide/partenaires", "/blog", "/devenir-partenaire", "/securite", "/cgu", "/cgv", "/confidentialite"];

function entry(path: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path || "/"}`,
    alternates: { languages: { fr: `${SITE_URL}${path || "/"}`, ar: `${SITE_URL}/ar${path}`, en: `${SITE_URL}/en${path}` } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, experiences] = await Promise.all([getCities(), getPublishedExperiences()]);
  const active = cities.filter((c) => c.isActive);
  return [
    ...STATIC_PATHS.map(entry),
    ...active.map((c) => entry(`/${c.id}`)),
    ...active.flatMap((c) => CATEGORY_KEYS.map((k) => entry(`/${c.id}/${k}`))),
    ...experiences.map((e) => entry(`/experiences/${e.slug}`)),
    ...HELP_ARTICLES.map((a) => entry(`/aide/${a.slug}`)),
    ...BLOG_CATEGORIES.map((c) => entry(`/blog/theme/${c.key}`)),
    ...BLOG_ARTICLES.map((a) => entry(`/blog/${a.slug}`)),
  ];
}
