"use client";

/**
 * Favoris — phase 2 : stockés dans le navigateur (localStorage).
 * Phase 3 : synchronisés dans users/{uid}/favorites.
 */
import { useSyncExternalStore } from "react";

const KEY = "tc:favorites";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function snapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cache.raw) {
    try {
      const parsed = JSON.parse(raw ?? "[]");
      cache = { raw, ids: Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : EMPTY };
    } catch {
      cache = { raw, ids: EMPTY };
    }
  }
  return cache.ids;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function toggleFavorite(id: string) {
  const ids = snapshot();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible (navigation privée) */
  }
  listeners.forEach((l) => l());
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
