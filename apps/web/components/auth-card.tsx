import { Info } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Mise en page des écrans de connexion / inscription.
 * PHASE 2 : formulaires visuels ; le bouton est désactivé tant que Firebase Authentication
 * n'est pas branché (phase 3) — aucun faux succès n'est simulé.
 */
export function AuthCard({
  title,
  subtitle,
  notice,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  notice?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-16">
      <div className="relative hidden h-[560px] overflow-hidden rounded-[2rem] lg:block">
        <Image src="/demo/diner-inconnus.webp" alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-plum-900/60 to-transparent" />
      </div>
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-4xl font-medium text-plum-900">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
        <div className="mt-8 space-y-4">{children}</div>
        {notice && (
          <p role="note" className="mt-5 flex gap-2.5 rounded-2xl bg-plum-50 p-3.5 text-sm text-plum-900">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
        <div className="mt-6 text-center text-sm text-muted">{footer}</div>
      </div>
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-[16px] text-ink outline-none transition placeholder:text-muted/60 focus:border-plum-700 focus:ring-2 focus:ring-plum-100"
      />
    </label>
  );
}

export function DisabledSubmit({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled
      className="w-full cursor-not-allowed rounded-full bg-plum-900/40 px-6 py-4 font-semibold text-white"
    >
      {children}
    </button>
  );
}
