import type { MetadataRoute } from "next";
import { IS_DEMO } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Données de démonstration, ou site d'essai (NEXT_PUBLIC_NOINDEX=true) : on n'invite pas Google à l'indexer.
  if (IS_DEMO || process.env.NEXT_PUBLIC_NOINDEX === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/espace", "/reserver", "/ar/espace", "/ar/reserver"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
