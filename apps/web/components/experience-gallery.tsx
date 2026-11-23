"use client";

import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { MediaImage as Image } from "@/components/media";

type Photo = { src: string; alt: string };

/**
 * Étape 23 — galerie de la fiche : grande photo + deux vignettes (ordinateur) ; un clic ouvre la photo en plein
 * écran (fenêtre native : Échap ferme, le focus reste dedans), flèches du clavier ou glissement du doigt pour
 * passer d'une photo à l'autre.
 */
export function ExperienceGallery({ photos, children }: { photos: Photo[]; children?: React.ReactNode }) {
  const t = useTranslations("gallery");
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const total = photos.length;
  const [cover, ...rest] = photos;

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const step = (d: number) => setIndex((i) => (i + d + total) % total);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const rtl = document.documentElement.dir === "rtl";
      const d = (e.key === "ArrowRight") !== rtl ? 1 : -1;
      setIndex((i) => (i + d + total) % total);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [total]);

  if (!cover) return null;
  const current = photos[index] ?? cover;
  const thumb = "relative block w-full overflow-hidden rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200";

  return (
    <>
      <div className={`grid gap-3 ${rest.length ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] sm:aspect-[16/9] lg:aspect-auto lg:h-[460px]">
          <button type="button" onClick={() => open(0)} aria-label={t("open", { n: 1, total })} className={`${thumb} h-full cursor-zoom-in`}>
            <Image src={cover.src} alt={cover.alt} fill priority sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
          </button>
          {children}
          {total > 1 && (
            <button
              type="button"
              onClick={() => open(0)}
              className="absolute bottom-4 end-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-brand-900 shadow-card"
              data-testid="gallery-all"
            >
              <Images className="size-4" aria-hidden />
              {t("seeAll", { count: total })}
            </button>
          )}
        </div>
        {rest.length > 0 && (
          <div className="hidden gap-3 lg:grid lg:grid-rows-2">
            {rest.slice(0, 2).map((img, i) => (
              <button key={img.src} type="button" onClick={() => open(i + 1)} aria-label={t("open", { n: i + 2, total })} className={`${thumb} cursor-zoom-in`}>
                <Image src={img.src} alt={img.alt} fill sizes="33vw" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <dialog
        ref={dialog}
        aria-label={t("title")}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-white backdrop:bg-ink/80"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null || Math.abs(end - start) < 50) return;
          const rtl = document.documentElement.dir === "rtl";
          step((end < start) !== rtl ? 1 : -1);
        }}
        data-testid="gallery-dialog"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-white/80" aria-live="polite">{t("counter", { n: index + 1, total })}</p>
            <button type="button" onClick={() => dialog.current?.close()} aria-label={t("close")} className="grid size-11 place-items-center rounded-full hover:bg-white/10">
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <div className="relative mx-auto w-full max-w-6xl flex-1">
            <Image key={current.src} src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
          </div>
          <p className="px-4 py-2 text-center text-sm text-white/80">{current.alt}</p>
          {total > 1 && (
            <div className="flex justify-center gap-4 pb-6">
              <button type="button" onClick={() => step(-1)} aria-label={t("prev")} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <ChevronLeft className="size-6 rtl:rotate-180" aria-hidden />
              </button>
              <button type="button" onClick={() => step(1)} aria-label={t("next")} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <ChevronRight className="size-6 rtl:rotate-180" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
