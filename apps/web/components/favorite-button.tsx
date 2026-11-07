"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

/**
 * Favoris — en phase 2, enregistrés dans le navigateur (localStorage).
 * En phase 3, ils seront synchronisés dans users/{uid}/favorites.
 */
const KEY = "tc:favorites";
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* stockage indisponible (navigation privée) : on ignore */
  }
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function FavoriteButton({ experienceId, className = "" }: { experienceId: string; className?: string }) {
  const t = useTranslations("card");
  const isFavorite = useSyncExternalStore(
    subscribe,
    () => read().includes(experienceId),
    () => false,
  );
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const ids = read();
        write(isFavorite ? ids.filter((id) => id !== experienceId) : [...ids, experienceId]);
      }}
      className={`grid size-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur-sm transition hover:bg-black/30 active:scale-90 ${className}`}
    >
      <Heart className={`size-5 transition ${isFavorite ? "fill-white" : ""}`} strokeWidth={2} aria-hidden />
    </button>
  );
}
