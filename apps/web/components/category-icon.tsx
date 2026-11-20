import {
  BookOpen,
  Camera,
  Coffee,
  Dumbbell,
  Flower2,
  Gamepad2,
  LayoutGrid,
  Map,
  Mountain,
  Music,
  Palette,
  Sparkles,
  Ticket,
  Users,
  UtensilsCrossed,
  type LucideProps,
} from "lucide-react";
import type { CATEGORY_ICONS } from "@thecommunity/shared";

/** Pictogrammes proposés aux catégories (liste fermée, voir CATEGORY_ICONS). */
const BY_NAME: Record<(typeof CATEGORY_ICONS)[number] | "all", typeof Sparkles> = {
  utensils: UtensilsCrossed,
  flower: Flower2,
  gamepad: Gamepad2,
  palette: Palette,
  sparkles: Sparkles,
  users: Users,
  book: BookOpen,
  mountain: Mountain,
  music: Music,
  dumbbell: Dumbbell,
  coffee: Coffee,
  map: Map,
  ticket: Ticket,
  camera: Camera,
  all: LayoutGrid,
};

/** Pictogramme par défaut des cinq univers historiques (quand aucun n'est choisi). */
const DEFAULT_BY_CATEGORY: Record<string, keyof typeof BY_NAME> = {
  eat: "utensils",
  move: "flower",
  play: "gamepad",
  create: "palette",
  discover: "sparkles",
  all: "all",
};

/** `icon` : pictogramme choisi dans le back-office (étape 19) ; sinon celui de l'univers historique, sinon ✦. */
export function CategoryIcon({ category, icon, ...props }: { category: string; icon?: string | null } & LucideProps) {
  const name = (icon && icon in BY_NAME ? icon : DEFAULT_BY_CATEGORY[category]) as keyof typeof BY_NAME | undefined;
  const Icon = (name && BY_NAME[name]) || Sparkles;
  return <Icon aria-hidden strokeWidth={1.6} {...props} />;
}
