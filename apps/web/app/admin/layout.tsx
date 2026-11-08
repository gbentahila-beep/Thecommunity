import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogout } from "@/components/admin/admin-logout";
import { AdminNav } from "@/components/admin/admin-nav";
import { MobileAdminMenu } from "@/components/admin/mobile-admin-menu";
import { requireAdmin } from "@/lib/auth/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s · Back-office The Host Club" },
  robots: { index: false, follow: false },
};

/**
 * Back-office (français uniquement, hors routage par langue).
 * Mode Firebase : accès réservé aux rôles admin / superadmin (custom claims vérifiés côté serveur).
 * Mode démonstration : données fictives, rien n'est enregistré.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Mode Firebase : réservé aux rôles admin / superadmin (vérifié côté serveur à chaque page).
  const admin = FIREBASE_ENABLED ? await requireAdmin() : null;
  return (
    <html lang="fr" className={`${fontVariables} antialiased`}>
      <body className="min-h-dvh bg-cream">
        {admin ? (
          <div className="flex items-center justify-end gap-3 border-b border-line bg-white/60 px-4 py-1.5 text-xs text-muted">
            <span>
              Connecté : <strong className="text-ink">{admin.email}</strong> · {admin.role === "superadmin" ? "super-admin" : "admin"}
            </span>
            <AdminLogout />
          </div>
        ) : (
          <div role="note" className="flex items-center justify-center gap-2 bg-plum-900 px-4 py-1.5 text-center text-xs text-plum-50">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
            Back-office de démonstration : données fictives, rien n&apos;est enregistré.
          </div>
        )}
        <header className="relative z-30 flex h-16 items-center gap-3 border-b border-line bg-cream/95 px-4 backdrop-blur lg:hidden print:hidden">
          <MobileAdminMenu />
          <Link href="/admin" className="font-display text-xl font-semibold text-plum-900">
            The Host Club<span className="text-plum-500">.</span> <span className="font-sans text-sm font-medium text-muted">admin</span>
          </Link>
        </header>
        <div className="mx-auto flex max-w-[1500px]">
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-e border-line px-4 py-6 lg:flex print:hidden">
            <Link href="/admin" className="px-3 font-display text-2xl font-semibold text-plum-900">
              The Host Club<span className="text-plum-500">.</span>
              <span className="mt-0.5 block font-sans text-xs font-medium uppercase tracking-wider text-muted">Back-office</span>
            </Link>
            <AdminNav />
            <Link href="/" className="mt-auto px-3 text-sm text-muted hover:text-plum-900">← Voir le site public</Link>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
