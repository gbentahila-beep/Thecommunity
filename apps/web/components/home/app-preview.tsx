import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Typewriter } from "./typewriter";

/** Écrans de l'application, en trois téléphones qui s'entrecroisent (façon fiche App Store), sous l'accroche de l'accueil. */
const SCREENS = [
  { src: "/images/app/ecran-decouvrir-2026-11c.webp", key: "appScreenDiscover", pos: "z-10 -rotate-[8deg] translate-y-6 -me-14 sm:-me-20" },
  { src: "/images/app/ecran-accueil-2026-11c.webp", key: "appScreenHome", pos: "z-20" },
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

export async function AppPreview() {
  const t = await getTranslations("home");
  const phrases = t.raw("typewriter") as string[];
  return (
    <section aria-labelledby="app-preview-title" className="mx-auto max-w-5xl px-4 pt-14 text-center sm:px-6 lg:pt-20" data-testid="home-app">
      <h2 id="app-preview-title" className="section-title">{t("appTitle")}</h2>
      <p className="lead mx-auto mt-3 max-w-xl">{t("appText")}</p>
      <div className="mt-10 flex items-start justify-center" aria-hidden={false}>
        {SCREENS.map((s) => (
          <Phone key={s.src} src={s.src} alt={t(s.key)} className={s.pos} />
        ))}
      </div>
      <Link href="/inscription" className="btn btn-primary mt-14 px-10">{t("appCta")}</Link>
      <Typewriter phrases={phrases} label={t("typewriterLabel")} />
    </section>
  );
}
