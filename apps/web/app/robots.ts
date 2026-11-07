import type { MetadataRoute } from "next";
import { IS_DEMO } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Tant que le site affiche des données de démonstration, on n'invite pas Google à l'indexer.
  if (IS_DEMO) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/espace", "/reserver", "/ar/espace", "/ar/reserver"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
