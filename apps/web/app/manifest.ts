import type { MetadataRoute } from "next";

/** Installation sur l'écran d'accueil du téléphone : nom, couleurs et icône « wenzy » (brand book, planche 05). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wenzy",
    short_name: "Wenzy",
    description: "Des expériences en petit groupe pour rencontrer de nouvelles personnes à Casablanca.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1EA",
    theme_color: "#141414",
    icons: [
      { src: "/images/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/images/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
