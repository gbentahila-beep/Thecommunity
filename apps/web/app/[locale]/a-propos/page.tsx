import { ArrowRight, HeartHandshake, Shapes, Sprout, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClosingCta } from "@/components/audience-cards";
import { WhyWenzy } from "@/components/home/why-wenzy";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/ui";
import { Link } from "@/i18n/navigation";

// Étape 28 : le texte de paiement suit le réglage du site (relu au plus toutes les heures, et à chaque changement dans le back-office).
export const revalidate = 3600;

/** Photos fournies par Rita (8 novembre ; 09 et 10 ajoutées ensuite), dimensions réelles pour éviter les sauts de mise en page. */
const GALLERY = [
  { src: "/images/photos/galerie-01.webp", w: 1063, h: 1578 },
  { src: "/images/photos/galerie-02.webp", w: 1110, h: 1567 },
  { src: "/images/photos/galerie-09.webp", w: 1284, h: 1409 },
  { src: "/images/photos/galerie-04.webp", w: 1109, h: 1600 },
  { src: "/images/photos/galerie-05.webp", w: 1284, h: 1453 },
  { src: "/images/photos/galerie-06.webp", w: 1284, h: 809 },
  { src: "/images/photos/galerie-10.webp", w: 1284, h: 1313 },
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
  return (
    <>
      {/* Étape 7c (docs/29, piste A) : en-tête photo comme l'accueil, puis sections en alternance crème et blanc. */}
      <PageHero
        eyebrow={ta("heroEyebrow")}
        title={ta("heroLine1")}
        accent={ta("heroLine2")}
        intro={t("aboutText")}
        photo="/images/photos/a-propos-hero.webp"
        photoAlt={ta("heroPhotoAlt")}
        position="50% 35%"
      >
        <Link href="/experiences" className="btn btn-primary mt-7">
          {th("heroCta")}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </PageHero>

      {/* 2. Notre histoire : photo à gauche, texte à droite (au nom de l'équipe) */}
      <Section tone="white">
      <section aria-labelledby="story" className="grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden className="bub-peach absolute -inset-1.5 -rotate-2 rounded-[3rem] sm:-inset-5 sm:-rotate-3" />
          <div className="relative aspect-square overflow-hidden rounded-[2.5rem] shadow-card">
            <Image src="/images/photos/comment-groupe-2.webp" alt={ta("storyPhotoAlt")} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-cover" />
          </div>
        </div>
        <div>
          <p className="eyebrow">{ta("storyEyebrow")}</p>
          <h2 id="story" className="section-title mt-2">{ta("storyTitle")}</h2>
          <p className="mt-1 text-muted">{ta("storySubtitle")}</p>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/85">
            <p>{ta("storyP1")}</p>
            <p>{ta("storyP2")}</p>
            <p>{ta("storyP3")}</p>
          </div>
        </div>
      </section>

      </Section>

      {/* 3. Ce qui compte pour nous */}
      <Section>
      <section aria-labelledby="values">
        <div className="section-head text-center">
          <p className="eyebrow">{ta("valuesEyebrow")}</p>
          <h2 id="values" className="section-title mt-3">{ta("valuesTitle")}</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-[1.75rem] bg-white p-6 text-center shadow-card">
              <span className={`${i % 2 ? "bub-lilac" : "bub-peach"} mx-auto grid size-13 place-items-center rounded-full text-ink`}>
                <Icon className="size-6" strokeWidth={1.6} aria-hidden />
              </span>
              <p className="mt-4 font-display text-[1.35rem] leading-tight font-semibold text-brand-900">{title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      </Section>

      {/* 4. Pourquoi on fait ça (le même bloc que sur l'accueil) */}
      <Section tone="white">
        <WhyWenzy className="" />
      </Section>
      {/* Étape 6 : plus de carrousel « Nos outils » (son contenu est dans « Comment ça se passe » et Comment ça marche). */}

      {/* 5. Galerie */}
      <Section>
      <section aria-labelledby="gallery">
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 id="gallery" className="section-title">{ta("galleryTitle")}</h2>
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

      <div className="mt-12 flex justify-center">
        <Link href="/experiences" className="btn btn-primary">
          {th("heroCta")}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
      </Section>
      <Section tone="white" className="!pt-10 sm:!pt-16">
        <ClosingCta />
      </Section>
    </>
  );
}
