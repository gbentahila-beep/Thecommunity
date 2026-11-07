"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

export function FavoriteButton({ experienceId, className = "" }: { experienceId: string; className?: string }) {
  const t = useTranslations("card");
  const isFavorite = useFavorites().includes(experienceId);
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(experienceId);
      }}
      className={`grid size-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur-sm transition hover:bg-black/30 active:scale-90 ${className}`}
    >
      <Heart className={`size-5 transition ${isFavorite ? "fill-white" : ""}`} strokeWidth={2} aria-hidden />
    </button>
  );
}
