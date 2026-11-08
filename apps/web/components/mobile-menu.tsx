"use client";

import { onAuthStateChanged } from "firebase/auth";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/auth/client";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";

type Item = { href: string; label: string; dot?: string };
type City = { id: string; name: string; active: boolean };

/** Connexion côté navigateur (Firebase) ; en mode démo, personne n'est connecté. */
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    return onAuthStateChanged(firebase().auth, (u) => setSignedIn(Boolean(u)));
  }, []);
  return signedIn;
}

/** Section dépliable du menu (Découvrir, Villes). */
function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-start text-lg font-semibold text-ink"
      >
        {label}
        <ChevronDown className={`size-5 text-ink/70 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <ul id={id} hidden={!open} className="pb-3">
        {children}
      </ul>
    </li>
  );
}

/**
 * Menu « burger » des petits écrans : la barre flottante s'agrandit en carte (Découvrir, À propos, Comment ça marche,
 * Blog, Villes, connexion). Échap ou la croix ferment ; le focus reste dans le menu ; la page ne défile plus derrière.
 * La barre d'onglets du bas (membres) est conservée.
 */
export function MobileMenu({ discover, links, cities }: { discover: Item[]; links: Item[]; cities: City[] }) {
  const t = useTranslations("nav");
  const ta = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const signedIn = useSignedIn();
  const pathname = usePathname();
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Fermer lors d'un changement de page.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = panel.current;
    const opener = trigger.current;
    root?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);
  const rowLink = "flex min-h-14 items-center py-3 text-lg font-semibold text-ink";
  const subLink = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-ink/85 hover:bg-cream";

  return (
    <div className="flex items-center gap-2 lg:hidden">
      {signedIn ? (
        <Link href="/espace" aria-label={t("account")} className="grid size-10 place-items-center rounded-full bg-cream-deep text-plum-900">
          <UserRound className="size-5" aria-hidden />
        </Link>
      ) : (
        <Link href="/inscription" className="inline-flex h-10 items-center rounded-full bg-plum-900 px-4 text-sm font-semibold text-white shadow-card transition hover:bg-plum-800">
          {t("signup")}
        </Link>
      )}
      <button
        ref={trigger}
        type="button"
        aria-label={t("menuOpen")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-cream-deep"
      >
        <Menu className="size-6" aria-hidden />
      </button>

      {open &&
        createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button type="button" tabIndex={-1} aria-hidden onClick={close} className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[2px]" />
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-x-3 top-2 max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-[2rem] border border-line/60 bg-white px-6 pt-4 pb-6 shadow-float motion-safe:animate-[menu-in_180ms_ease-out]"
          >
            <h2 id={titleId} className="sr-only">{t("menuTitle")}</h2>
            <div className="flex h-12 items-center justify-between">
              <span onClickCapture={close}>
                <Logo />
              </span>
              <button
                type="button"
                data-autofocus
                aria-label={t("menuClose")}
                onClick={close}
                className="-me-2 grid size-11 place-items-center rounded-full text-ink transition hover:bg-cream-deep"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <nav aria-label={t("mainNav")} className="mt-3">
              <ul>
                <Disclosure label={t("discover")}>
                  {discover.map((it, i) => (
                    <li key={it.href}>
                      <Link href={it.href} onClick={close} className={`${subLink} ${i === 0 ? "font-semibold text-plum-900" : ""}`}>
                        {it.dot && <span className={`size-2.5 rounded-full ${it.dot}`} aria-hidden />}
                        {it.label}
                      </Link>
                    </li>
                  ))}
                </Disclosure>
                {links.map((l) => (
                  <li key={l.href} className="border-b border-line">
                    <Link href={l.href} onClick={close} aria-current={pathname === l.href ? "page" : undefined} className={rowLink}>
                      {l.label}
                    </Link>
                  </li>
                ))}
                <Disclosure label={t("cities")}>
                  {cities.map((c) => (
                    <li key={c.id}>
                      {c.active ? (
                        <Link href={`/${c.id}`} onClick={close} className={subLink}>{c.name}</Link>
                      ) : (
                        <span className={`${subLink} justify-between text-muted hover:bg-transparent`}>
                          {c.name}
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium">{t("comingSoon")}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </Disclosure>
              </ul>
            </nav>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {signedIn ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      close();
                      await logout();
                      router.replace("/");
                      router.refresh();
                    }}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-4 font-semibold text-ink transition hover:border-plum-700"
                  >
                    {ta("logout")}
                  </button>
                  <Link href="/espace" onClick={close} className="inline-flex min-h-12 items-center justify-center rounded-full bg-plum-900 px-4 font-semibold text-white transition hover:bg-plum-800">
                    {t("account")}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/connexion" onClick={close} className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-4 font-semibold text-ink transition hover:border-plum-700">
                    {t("login")}
                  </Link>
                  <Link href="/inscription" onClick={close} className="inline-flex min-h-12 items-center justify-center rounded-full bg-plum-900 px-4 font-semibold text-white transition hover:bg-plum-800">
                    {t("signup")}
                  </Link>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-center" onClickCapture={close}>
              <LanguageSwitch />
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
