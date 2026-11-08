import { ArrowRight, HeartHandshake, Shapes, Sprout, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ToolsCarousel } from "@/components/about/tools-carousel";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { AYA_INSTAGRAM } from "@/lib/legal-info";

/** Photos fournies par Rita (8 novembre), dimensions réelles pour éviter les sauts de mise en page. */
const GALLERY = [
  { src: "/images/photos/galerie-01.webp", w: 1063, h: 1578 },
  { src: "/images/photos/galerie-02.webp", w: 1110, h: 1567 },
  { src: "/images/photos/galerie-03.webp", w: 1017, h: 1600 },
  { src: "/images/photos/galerie-04.webp", w: 1109, h: 1600 },
  { src: "/images/photos/galerie-05.webp", w: 1284, h: 1453 },
  { src: "/images/photos/galerie-06.webp", w: 1284, h: 809 },
  { src: "/images/photos/galerie-07.webp", w: 1284, h: 818 },
  { src: "/images/photos/galerie-08.webp", w: 1284, h: 1342 },
];

export async function generateMetadata({ params }: PageProps<"/[locale]/a-propos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("aboutTitle"), description: t("aboutText") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/a-propos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th, ta] = await Promise.all([getTranslations("pages"), getTranslations("home"), getTranslations("aboutPage")]);
  const values = [
    { icon: HeartHandshake, title: ta("value1Title"), text: ta("value1") },
    { icon: UsersRound, title: ta("value2Title"), text: ta("value2") },
    { icon: Shapes, title: ta("value3Title"), text: ta("value3") },
    { icon: Sprout, title: ta("value4Title"), text: ta("value4") },
  ];
  const tools = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ title: ta(`tool${i}Title`), text: ta(`tool${i}`) }));
  return (
    <PageShell className="py-8 sm:py-12">
      {/* 1. En-tête : accroche à gauche, grande photo à droite */}
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div className="order-2 lg:order-1">
          <p className="text-sm font-semibold text-ink/80">{ta("heroEyebrow")}</p>
          <h1 className="mt-4 font-display text-[2.6rem] leading-[1.02] font-medium tracking-tight text-plum-900 sm:text-6xl">
            {ta("heroLine1")}
            <span className="block bg-gradient-to-r from-plum-500 to-[#c9705f] bg-clip-text text-transparent italic">{ta("heroLine2")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/80">{t("aboutText")}</p>
          <Link href="/experiences" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-plum-900 px-6 font-semibold text-white shadow-card transition hover:bg-plum-800">
            {th("heroCta")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
        <div className="relative order-1 aspect-[4/3] overflow-hidden rounded-[2rem] shadow-card lg:order-2 lg:aspect-[5/4]">
          <Image src="/images/photos/a-propos-hero.webp" alt={ta("heroPhotoAlt")} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-[50%_35%]" />
        </div>
      </section>

      {/* 2. La créatrice : photo à gauche, texte à droite */}
      <section aria-labelledby="founder" className="mt-20 grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
        {/* Photo tirée de l'article CULTIQ (choix de Rita, 8 nov.) : accord de CULTIQ / original en haute définition à obtenir (docs/16). */}
        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2rem] shadow-card">
          <Image src="/images/aya-snoussi.webp" alt={ta("photoAlt")} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-cover" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-plum-700 uppercase">{ta("founderEyebrow")}</p>
          <h2 id="founder" className="mt-3 font-display text-4xl font-medium text-plum-900 sm:text-5xl">{ta("founderName")}</h2>
          <p className="mt-1 text-muted">{ta("founderRole")}</p>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/85">
            <p>{ta("founderP1")}</p>
            <p>{ta("founderP2")}</p>
            <p>{ta("founderP3")}</p>
          </div>
          <a
            href={AYA_INSTAGRAM.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-plum-900 px-5 text-sm font-semibold text-plum-900 transition hover:bg-plum-900 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
            {ta("followAya")} <span dir="ltr">(@{AYA_INSTAGRAM.handle})</span>
          </a>
        </div>
      </section>

      {/* 3. Ce qui compte pour elle */}
      <section aria-labelledby="values" className="mt-20">
        <h2 id="values" className="font-display text-[2rem] leading-tight font-medium text-plum-900 sm:text-5xl">{ta("valuesTitle")}</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-[var(--radius-card)] bg-white p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-full bg-plum-50 text-plum-900">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-lg font-semibold text-ink">{title}</p>
              <p className="mt-2 leading-relaxed text-ink/75">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Nos outils pour créer du lien (défilant) */}
      <ToolsCarousel tools={tools} eyebrow={ta("toolsEyebrow")} title={ta("toolsTitle")} text={ta("toolsText")} prevLabel={ta("toolsPrev")} nextLabel={ta("toolsNext")} />

      {/* 5. Galerie */}
      <section aria-labelledby="gallery" className="py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="gallery" className="font-display text-[2rem] leading-tight font-medium text-plum-900 sm:text-5xl">{ta("galleryTitle")}</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink/75">{ta("galleryText")}</p>
        </div>
        <ul className="mt-10 columns-2 gap-3 sm:gap-5 md:columns-3">
          {GALLERY.map(({ src, w, h }, i) => (
            <li key={src} className="mb-3 break-inside-avoid overflow-hidden rounded-[1.5rem] shadow-card sm:mb-5 sm:rounded-[2rem]">
              <Image src={src} alt={ta("galleryAlt", { n: i + 1 })} width={w} height={h} sizes="(min-width: 768px) 32vw, 48vw" className="h-auto w-full transition duration-500 hover:scale-[1.03]" />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex justify-center">
        <Link href="/experiences" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-plum-900 px-7 font-semibold text-white shadow-card transition hover:bg-plum-800">
          {th("heroCta")}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
    </PageShell>
  );
}
