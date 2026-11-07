"use client";

/**
 * Favoris.
 * - Visiteur non connecté (ou mode démonstration) : stockés dans le navigateur (localStorage).
 * - Membre connecté (mode Firebase) : users/{uid}/favorites, synchronisés en temps réel entre appareils.
 */
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { FIREBASE_ENABLED } from "./firebase/config";
import { firebase } from "./firebase/client";

const KEY = "tc:favorites";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let ids: string[] = EMPTY;
let uid: string | null = null;
let started = false;
let stopRemote: (() => void) | null = null;

const emit = () => listeners.forEach((l) => l());

function readLocal(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}
function writeLocal(next: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible (navigation privée) */
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  ids = readLocal();
  window.addEventListener("storage", () => {
    if (!uid) {
      ids = readLocal();
      emit();
    }
  });
  if (!FIREBASE_ENABLED) return;
  const { auth, db } = firebase();
  onAuthStateChanged(auth, (user) => {
    stopRemote?.();
    stopRemote = null;
    uid = user?.uid ?? null;
    if (!user) {
      ids = readLocal();
      emit();
      return;
    }
    stopRemote = onSnapshot(
      collection(db, "users", user.uid, "favorites"),
      (snap) => {
        ids = snap.docs.map((d) => d.id);
        emit();
      },
      () => undefined,
    );
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleFavorite(id: string) {
  const isFav = ids.includes(id);
  ids = isFav ? ids.filter((x) => x !== id) : [...ids, id];
  emit();
  if (uid) {
    const ref = doc(firebase().db, "users", uid, "favorites", id);
    void (isFav ? deleteDoc(ref) : setDoc(ref, { createdAt: serverTimestamp() })).catch(() => undefined);
  } else {
    writeLocal(ids);
  }
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, () => ids, () => EMPTY);
}
