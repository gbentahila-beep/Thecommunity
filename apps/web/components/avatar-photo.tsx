"use client";

import { useState } from "react";

/** Photo d'un avatar ; si elle ne se charge pas, elle disparaît et laisse voir la tête de Bab dessous. */
export function AvatarPhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />;
}
