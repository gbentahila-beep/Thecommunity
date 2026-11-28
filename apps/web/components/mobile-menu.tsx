"use client";

import { Award, CalendarDays, CalendarHeart, CalendarRange, ChevronRight, CircleHelp, HandHeart, HeartHandshake, House, Info, MapPin, Menu, MessageCircle, Newspaper, Sparkles, Star, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/auth/client";
import { useMember } from "@/lib/use-member";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";
import { CategoryIcon } from "./category-icon";
import { ProfileCard } from "./profile-card";

/** `sub` : un univers, affiché en retrait sous « Toutes les expériences » (pas de pastille de couleur). */
type Item = { href: string; label: string; sub?: boolean; category?: string; icon?: string | null };

/** Icône de chaque ligne (même style que l'onglet Menu : rond lilas). */
const ICONS: Record<string, LucideIcon> = {
  "/": House,
  "/espace/reservations": CalendarDays,
  "/espace/rencontres": HeartHandshake,
  "/experiences": CalendarRange,
  "/a-propos": Info,
  "/comment-ca-marche": Sparkles,
  "/blog": Newspaper,
  "/abonnement": Award,
  "/avis": Star,
  "/devenir-partenaire": HandHeart,
  "/devenir-organisateur": CalendarHeart,
  "/faq": CircleHelp,
  "/aide": MessageCircle,
};
const bubble = (node: React.ReactNode) => <span className="bub-lilac grid size-9 shrink-0 place-items-center rounded-full text-ink">{node}</span>;
const iconFor = (href: string) => {
  const Icon = ICONS[href];
  return Icon ? bubble(<Icon className="size-[18px]" strokeWidth={1.7} aria-hidden />) : null;
};
type City = { id: string; name: string; active: boolean };

/** Rubrique du menu : petit titre, puis une carte de lignes. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-sm font-medium text-muted">{title}</h3>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-[1.5rem] bg-white shadow-card">{children}</ul>
    </section>
  );
}

function Row({ href, onClick, current = false, icon, children }: { href: string; onClick: () => void; current?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} onClick={onClick} aria-current={current ? "page" : undefined} className="flex min-h-14 items-center gap-3 px-4 py-2.5 text-[16px] font-medium text-ink transition hover:bg-cream">
        {icon ?? iconFor(href)}
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
            className="halo-top absolute inset-x-3 top-2 max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-line/60 bg-cream-light px-4 pt-4 pb-6 shadow-float motion-safe:animate-[menu-in_180ms_ease-out]"
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
                  <Row key={it.href} href={it.href} onClick={close} current={pathname === it.href} icon={it.category ? bubble(<CategoryIcon category={it.category} icon={it.icon} className="size-[18px]" />) : undefined}>
                    <span className={i === 0 ? "font-semibold text-brand-900" : ""}>{it.label}</span>
                  </Row>
                ))}
              </Group>
              <Group title={t("clubGroup")}>
                {links.filter((l) => l.href !== "/faq").map((l) => (
                  <Row key={l.href} href={l.href} onClick={close} current={pathname === l.href}>{l.label}</Row>
                ))}
              </Group>
              <Group title={t("workWithUs")}>
                <Row href="/devenir-partenaire" onClick={close} current={pathname === "/devenir-partenaire"}>{t("partnersLink")}</Row>
                <Row href="/devenir-organisateur" onClick={close} current={pathname === "/devenir-organisateur"}>{t("organizersLink")}</Row>
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
                    <Row key={c.id} href={`/${c.id}`} onClick={close} icon={bubble(<MapPin className="size-[18px]" strokeWidth={1.7} aria-hidden />)}>{c.name}</Row>
                  ) : (
                    <li key={c.id} className="flex min-h-14 items-center gap-3 px-4 text-[15px] text-muted">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream"><MapPin className="size-[18px]" strokeWidth={1.7} aria-hidden /></span>
                      <span className="me-auto">{c.name}</span>
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
