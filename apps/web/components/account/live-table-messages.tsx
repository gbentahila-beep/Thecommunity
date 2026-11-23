"use client";

import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { firebase } from "@/lib/firebase/client";
import { formatTime } from "@/lib/format";

export type TableMessage = { id: string; uid: string; firstName: string; text: string; createdAt: string };
export const TABLE_MESSAGES_SHOWN = 300;

/**
 * Audit du 23/11 — messages de la table EN DIRECT : la page arrive avec les 300 derniers messages, puis écoute la
 * conversation (règles : seulement les personnes encore à la table et arrivées). Défile vers le dernier message.
 */
export function LiveTableMessages({ groupId, me, locale, initial, avatars }: { groupId: string; me: string; locale: string; initial: TableMessage[]; avatars: Record<string, ReactNode> }) {
  const t = useTranslations("tableChat");
  const [messages, setMessages] = useState(initial);
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const { auth, db } = firebase();
    void auth.authStateReady().then(() => {
      if (cancelled || !auth.currentUser) return;
      const q = query(collection(db, `groups/${groupId}/messages`), orderBy("createdAt", "desc"), limit(TABLE_MESSAGES_SHOWN));
      stop = onSnapshot(q, (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, uid: String(d.get("uid")), firstName: String(d.get("firstName") ?? ""), text: String(d.get("text") ?? ""), createdAt: ((d.get("createdAt") as Timestamp | null)?.toDate() ?? new Date()).toISOString() }))
          .reverse();
        setMessages(list);
      }, () => undefined); // accès retiré (personne retirée de la table) : on garde ce qui est affiché
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [groupId]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  if (messages.length === 0) return <p className="text-sm text-muted">{t("empty")}</p>;
  return (
    <ul className="max-h-[60vh] space-y-3 overflow-y-auto" aria-live="polite">
      {messages.map((m) => (
        <li key={m.id} className={`flex items-end gap-2 ${m.uid === me ? "flex-row-reverse" : ""}`}>
          {m.uid !== me && avatars[m.uid]}
          <span className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] text-ink ${m.uid === me ? "bg-brand-100" : "bg-cream"}`}>
            <span className="block text-xs font-semibold text-muted">{m.uid === me ? t("you") : m.firstName} · {formatTime(m.createdAt, locale)}</span>
            <span className="whitespace-pre-wrap">{m.text}</span>
          </span>
        </li>
      ))}
      <li ref={end} aria-hidden />
    </ul>
  );
}
