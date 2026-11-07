export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const CONTACT_EMAIL = "contact@thehostclub.ma"; // hypothèse : domaine à confirmer
export const DEFAULT_CITY = "casablanca";

export const CATEGORY_STYLES: Record<string, { text: string; bg: string; dot: string }> = {
  eat: { text: "text-cat-eat", bg: "bg-cat-eat/10", dot: "bg-cat-eat" },
  move: { text: "text-cat-move", bg: "bg-cat-move/10", dot: "bg-cat-move" },
  play: { text: "text-cat-play", bg: "bg-cat-play/10", dot: "bg-cat-play" },
  create: { text: "text-cat-create", bg: "bg-cat-create/10", dot: "bg-cat-create" },
  discover: { text: "text-cat-discover", bg: "bg-cat-discover/10", dot: "bg-cat-discover" },
};
