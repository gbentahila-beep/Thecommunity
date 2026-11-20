import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogout } from "@/components/admin/admin-logout";
import { MobileProMenu, ProNav } from "@/components/pro/pro-nav";
import { getOrganizerSpace, getProData } from "@/lib/data/organizer";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Espace organisateur", template: "%s · Espace organisateur The Host Club" },
  robots: { index: false, follow: false },
};

/**
 * Étape 20 — espace organisateur (français uniquement, hors routage par langue, comme le back-office).
 * Mode Firebase : session obligatoire ; chaque page vérifie l'appartenance à l'organisation côté serveur.
 * Mode démonstration : « Club Padel Anfa », données fictives, rien n'est enregistré.
 */
export default async function ProLayout({ children }: { children: ReactNode }) {
  const space = await getOrganizerSpace();
  const approved = space.status === "approved";
  const pending = approved && space.organizer ? (await getProData(space.organizer.id)).requests.filter((r) => r.status === "pending").length : 0;
  return (
    <html lang="fr" className={`${fontVariables} antialiased`}>
      <body className="min-h-dvh bg-cream">
        {space.isDemo ? (
          <div role="note" className="flex items-center justify-center gap-2 bg-plum-900 px-4 py-1.5 text-center text-xs text-plum-50">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
            Espace organisateur de démonstration (Club Padel Anfa) : données fictives, rien n&apos;est enregistré.
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 border-b border-line bg-white/60 px-4 py-1.5 text-xs text-muted">
            <span>
              Connecté : <strong className="text-ink">{space.user?.email}</strong>
              {space.organizer ? <> · {space.organizer.name}</> : null}
            </span>
            <AdminLogout />
          </div>
        )}
        <header className="relative z-30 flex h-16 items-center gap-3 border-b border-line bg-cream/95 px-4 backdrop-blur lg:hidden print:hidden">
          <MobileProMenu approved={approved} pendingRequests={pending} />
          <Link href="/pro" className="flex items-center gap-2" aria-label="The Host Club — espace organisateur">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG statique */}
            <img src="/images/brand/logo-horizontal-prune.svg" alt="" width={150} height={21} className="h-5 w-auto" />
            <span className="text-sm font-medium text-muted">pro</span>
          </Link>
        </header>
        <div className="mx-auto flex max-w-[1400px]">
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-e border-line px-4 py-6 lg:flex print:hidden">
            <Link href="/pro" className="px-3" aria-label="The Host Club — espace organisateur">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG statique */}
              <img src="/images/brand/logo-horizontal-prune.svg" alt="" width={180} height={25} className="h-6 w-auto" />
              <span className="mt-1 block text-xs font-medium uppercase tracking-wider text-muted">Espace organisateur</span>
            </Link>
            <ProNav approved={approved} pendingRequests={pending} />
            <div className="mt-auto space-y-2 px-3 text-sm">
              <Link href="/contrat-organisateur" className="block text-muted hover:text-plum-900">Contrat organisateur</Link>
              <Link href="/aide/partenaires" className="block text-muted hover:text-plum-900">Aide</Link>
              <Link href="/" className="block text-muted hover:text-plum-900">← Voir le site public</Link>
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
