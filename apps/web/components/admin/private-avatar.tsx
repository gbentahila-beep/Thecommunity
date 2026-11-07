"use client";

import { getDownloadURL, ref } from "firebase/storage";
import { useEffect, useState } from "react";
import { firebase } from "@/lib/firebase/client";

/** Photo de profil (lisible seulement par un compte connecté) : URL obtenue avec la session de l'admin. */
export function PrivateAvatar({ path, name }: { path: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    firebase()
      .auth.authStateReady()
      .then(() => getDownloadURL(ref(firebase().storage, path)))
      .then((u) => alive && setUrl(u), () => undefined);
    return () => {
      alive = false;
    };
  }, [path]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-14 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-plum-100 font-display text-xl text-plum-900" aria-hidden>
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}
