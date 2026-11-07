import { Flower2, Gamepad2, LayoutGrid, Palette, Sparkles, UtensilsCrossed, type LucideProps } from "lucide-react";

const ICONS = {
  eat: UtensilsCrossed,
  move: Flower2,
  play: Gamepad2,
  create: Palette,
  discover: Sparkles,
  all: LayoutGrid,
} as const;

export function CategoryIcon({ category, ...props }: { category: keyof typeof ICONS | string } & LucideProps) {
  const Icon = ICONS[category as keyof typeof ICONS] ?? Sparkles;
  return <Icon aria-hidden strokeWidth={1.6} {...props} />;
}
