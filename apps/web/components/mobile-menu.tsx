"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/auth/client";
import { useMember } from "@/lib/use-member";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";
import { ProfileCard } from "./profile-card";

type Item = { href: string; label: string; dot?: string; dotStyle?: CSSProperties };
type City = { id: string; name: string; active: boolean };

/** Rubrique du menu : petit titre, puis une carte de lignes. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-sm font-medium text-muted">{title}</h3>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl bg-white shadow-card">{children}</ul>
    </section>
  );
}

function Row({ href, onClick, current = false, children }: { href: string; onClick: () => void; current?: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} onClick={onClick} aria-current={current ? "page" : undefined} className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-[16px] font-medium text-ink transition hover:bg-cream">
        {children}
        <ChevronRight className="ms-auto size-4 shrink-0 text-muted rtl:-scale-x-100" aria-hidden />
      </Link>
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
  const member = useMember();
  const signedIn = Boolean(member);
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
      const items = [...root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input")].filter((el) => el.offsetParent !== null);
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

  return (
    <div className="flex items-center gap-2 lg:hidden">
      {member === null && (
        <Link href="/inscription" className="btn btn-primary btn-sm h-10 shrink-0 whitespace-nowrap max-[379px]:px-3 max-[379px]:text-[13px]">
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
            className="absolute inset-x-3 top-2 max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-3xl border border-line/60 bg-cream px-4 pt-4 pb-6 shadow-float motion-safe:animate-[menu-in_180ms_ease-out]"
          >
            <h2 id={titleId} className="sr-only">{t("menuTitle")}</h2>
            <div className="flex h-12 items-center justify-between px-2">
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
            {member && <ProfileCard member={member} onNavigate={close} className="card mt-3 px-4" />}
            {/* Rubriques en cartes, comme dans une application : l'espace du membre n'apparaît qu'une fois connecté. */}
            <nav aria-label={t("mainNav")} className="mt-4 space-y-5">
              {member && (
                <Group title={t("mySpace")}>
                  {[
                    { href: "/", label: t("home") },
                    { href: "/espace/reservations", label: t("bookings") },
                    { href: "/espace/rencontres", label: t("meet") },
                  ].map((l) => (
                    <Row key={l.href} href={l.href} onClick={close} current={pathname === l.href}>{l.label}</Row>
                  ))}
                </Group>
              )}
              <Group title={t("discover")}>
                {discover.map((it, i) => (
                  <Row key={it.href} href={it.href} onClick={close} current={pathname === it.href}>
                    {it.dot ? <span className={`size-2.5 shrink-0 rounded-full ${it.dot}`} style={it.dotStyle} aria-hidden /> : null}
                    <span className={i === 0 ? "font-semibold text-plum-900" : ""}>{it.label}</span>
                  </Row>
                ))}
              </Group>
              <Group title={t("clubGroup")}>
                {links.filter((l) => l.href !== "/faq").map((l) => (
                  <Row key={l.href} href={l.href} onClick={close} current={pathname === l.href}>{l.label}</Row>
                ))}
              </Group>
              <Group title={t("helpGroup")}>
                {links.filter((l) => l.href === "/faq").map((l) => (
                  <Row key={l.href} href={l.href} onClick={close} current={pathname === l.href}>{l.label}</Row>
                ))}
                <Row href="/aide" onClick={close} current={pathname === "/aide"}>{t("helpCenter")}</Row>
              </Group>
              <Group title={t("cities")}>
                {cities.map((c) =>
                  c.active ? (
                    <Row key={c.id} href={`/${c.id}`} onClick={close}>{c.name}</Row>
                  ) : (
                    <li key={c.id} className="flex min-h-12 items-center justify-between px-4 text-[15px] text-muted">
                      {c.name}
                      <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium">{t("comingSoon")}</span>
                    </li>
                  ),
                )}
              </Group>
            </nav>
            {signedIn ? (
              <button
                type="button"
                onClick={async () => {
                  close();
                  await logout();
                  router.replace("/");
                  router.refresh();
                }}
                className="btn btn-secondary mt-6 w-full"
              >
                {ta("logout")}
              </button>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link href="/connexion" onClick={close} className="btn btn-secondary px-4">
                  {t("login")}
                </Link>
                <Link href="/inscription" onClick={close} className="btn btn-primary px-4">
                  {t("signup")}
                </Link>
              </div>
            )}
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
