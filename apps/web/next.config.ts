import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Étape D — en-têtes de sécurité sur toutes les pages : pas d'affichage du site dans un cadre d'un autre site
 * (clic piégé), pas de devinette du type de fichier, adresse d'origine limitée, HTTPS imposé, caméra / micro /
 * position refusés. (Une politique CSP stricte demanderait de recenser chaque script : à faire avant la carte bancaire.)
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Cache Components désactivé pour l'instant : modèle classique (pages statiques + ISR),
  // plus simple à combiner avec next-intl. À réévaluer lors du branchement de Firestore.
  cacheComponents: false,
  partialPrefetching: false,
  transpilePackages: ["@thecommunity/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
