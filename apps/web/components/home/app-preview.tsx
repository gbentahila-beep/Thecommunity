import Image from "next/image";
import { getTranslations } from "next-intl/server";

/** Écrans de l'application, en trois téléphones qui s'entrecroisent (façon fiche App Store), sous l'accroche de l'accueil. */
const SCREENS = [
  { src: "/images/app/ecran-decouvrir-2026-11d.webp", key: "appScreenDiscover", pos: "z-10 -rotate-[8deg] translate-y-6 -me-14 sm:-me-20" },
  { src: "/images/app/ecran-accueil-2026-11d.webp", key: "appScreenHome", pos: "z-20" },
  { src: "/images/app/ecran-jour-j-2026-11b.webp", key: "appScreenBooking", pos: "z-10 rotate-[8deg] translate-y-6 -ms-14 sm:-ms-20" },
] as const;

function Phone({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`w-[38%] max-w-[230px] shrink-0 rounded-[2.1rem] bg-ink p-[5px] shadow-[0_30px_60px_-30px_rgb(20_20_20/0.55)] sm:rounded-[2.5rem] sm:p-1.5 ${className}`}>
      <div className="relative aspect-[300/620] overflow-hidden rounded-[1.8rem] bg-cream sm:rounded-[2.1rem]">
        <Image src={src} alt={alt} fill sizes="(min-width: 640px) 230px, 38vw" className="object-cover" />
      </div>
    </div>
  );
}

const STORES = [
  {
    name: "App Store",
    logo: (
      <svg viewBox="0 0 24 24" className="size-6 fill-white sm:size-7" aria-hidden>
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
    ),
  },
  {
    name: "Google Play",
    logo: (
      <svg viewBox="0 0 24 24" className="size-6 sm:size-7" aria-hidden>
        <path fill="#00C3FF" d="M3.6 1.8c-.3.3-.5.8-.5 1.4v17.6c0 .6.2 1.1.5 1.4l.1.1 9.9-9.9v-.2L3.7 1.7z" />
        <path fill="#FFC400" d="M16.9 15.6l-3.3-3.3v-.2l3.3-3.3.1.1 3.9 2.2c1.1.6 1.1 1.7 0 2.3l-3.9 2.2z" />
        <path fill="#FF3A44" d="M17 15.5L13.6 12 3.6 22c.4.4 1 .4 1.7.1L17 15.5" />
        <path fill="#00D865" d="M17 8.5L5.3 1.9c-.7-.4-1.3-.3-1.7.1L13.6 12 17 8.5" />
      </svg>
    ),
  },
] as const;

export async function AppPreview() {
  const t = await getTranslations("home");
  return (
    <section aria-labelledby="app-preview-title" className="mx-auto max-w-5xl text-center" data-testid="home-app">
      <div className="section-head container-text mx-auto">
        <h2 id="app-preview-title" className="section-title">{t("appTitle")}</h2>
        <p className="lead mt-3">{t("appText")}</p>
      </div>
      <div className="flex items-start justify-center" aria-hidden={false}>
        {SCREENS.map((s) => (
          <Phone key={s.src} src={s.src} alt={t(s.key)} className={s.pos} />
        ))}
      </div>
      {/* Pas encore d'application dans les stores : on l'annonce, sans lien. */}
      <p className="mt-12 text-sm font-semibold text-ink" data-testid="app-soon">{t("appSoon")}</p>
      {/* 28/11 : badges au dessin des stores (logo + nom), sans lien tant que l'application n'est pas publiée. */}
      <ul className="mt-4 flex flex-wrap justify-center gap-2.5 sm:gap-3" aria-label={t("appSoon")}>
        {STORES.map(({ name, logo }) => (
          <li key={name} className="inline-flex h-12 items-center gap-2 rounded-[0.8rem] bg-black ps-3 pe-4 text-start text-white ring-1 ring-white/20 sm:h-14 sm:gap-3 sm:rounded-[0.9rem] sm:ps-4 sm:pe-5">
            {logo}
            <span className="leading-none">
              <span className="block text-[10px] font-medium tracking-wide text-white/80 sm:text-[11px]">{t("appSoonOn")}</span>
              <span className="mt-0.5 block text-[1.1rem] font-semibold tracking-[-0.01em] sm:mt-1 sm:text-[1.35rem]">{name}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
