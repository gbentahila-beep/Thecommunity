"use client";

/**
 * Étape 13 — nombre de notifications non lues du membre connecté, en direct (onSnapshot), partagé par
 * la barre du bas (mobile) et l'icône du compte (ordinateur). 0 hors connexion et en mode démonstration.
 * Les 50 plus récentes suffisent : au-delà, la pastille affiche « 50+ » … qui n'arrive pas en pratique.
 */
import { onAuthStateChanged } from "firebase/auth";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { FIREBASE_ENABLED } from "./firebase/config";
import { firebase } from "./firebase/client";

const listeners = new Set<() => void>();
let count = 0;
let started = false;
let stop: (() => void) | null = null;

const emit = () => listeners.forEach((l) => l());

function start() {
  if (started || typeof window === "undefined" || !FIREBASE_ENABLED) return;
  started = true;
  const { auth, db } = firebase();
  onAuthStateChanged(auth, (user) => {
    stop?.();
    stop = null;
    count = 0;
    emit();
    if (!user) return;
    stop = onSnapshot(
      query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(50)),
      (snap) => {
        // « estimate » : une notification marquée lue compte comme lue tout de suite, sans attendre le serveur.
        count = snap.docs.filter((d) => !d.data({ serverTimestamps: "estimate" }).readAt).length;
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

export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, () => count, () => 0);
}
