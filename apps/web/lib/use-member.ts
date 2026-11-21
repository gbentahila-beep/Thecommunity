"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export type MemberCard = { firstName: string; lastName: string; cityId: string; since: string | null };

/**
 * Personne connectée, côté navigateur : `undefined` tant qu'on ne sait pas, `null` si personne n'est connecté,
 * sinon le prénom, le nom, la ville et la date d'inscription (pour la carte « Votre profil »). Démo : personne.
 */
export function useMember(): MemberCard | null | undefined {
  const [member, setMember] = useState<MemberCard | null | undefined>(FIREBASE_ENABLED ? undefined : null);
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    const { auth, db } = firebase();
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return setMember(null);
      const snap = await getDoc(doc(db, "users", u.uid)).catch(() => null);
      const d = snap?.data() ?? {};
      const created = d.createdAt?.toDate?.() as Date | undefined;
      setMember({
        firstName: String(d.firstName ?? u.displayName?.split(" ")[0] ?? ""),
        lastName: String(d.lastName ?? ""),
        cityId: String(d.cityId ?? ""),
        since: created ? created.toISOString() : u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : null,
      });
    });
  }, []);
  return member;
}

export const initialsOf = (m: Pick<MemberCard, "firstName" | "lastName">) => `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase() || "•";
