"use client";

import { useEffect, useRef } from "react";

/** Envoie le formulaire signé au CMI dès l'affichage (bouton de secours si le navigateur bloque l'envoi automatique). */
export function CmiAutoSubmit({ action, fields, label }: { action: string; fields: Record<string, string>; label: string }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const id = setTimeout(() => ref.current?.submit(), 600);
    return () => clearTimeout(id);
  }, []);
  return (
    <form ref={ref} method="post" action={action} acceptCharset="UTF-8" className="mt-6" data-testid="cmi-form">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className="btn btn-primary w-full">{label}</button>
    </form>
  );
}
