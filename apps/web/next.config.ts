import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
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
