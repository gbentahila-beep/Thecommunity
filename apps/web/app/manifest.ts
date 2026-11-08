import type { MetadataRoute } from "next";

/** Installation sur l'écran d'accueil du téléphone : nom, couleurs et icône « h. » (identité 10f). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Host Club",
    short_name: "The Host Club",
    description: "Des expériences en petit groupe pour rencontrer de nouvelles personnes à Casablanca.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8EFE8",
    theme_color: "#561A29",
    icons: [
      { src: "/images/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/images/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
