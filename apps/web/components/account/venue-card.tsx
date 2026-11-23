"use client";

import { MapPin, Navigation, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { mapsLinks } from "@/lib/maps";

/**
 * Le lieu, une fois connu (docs/22, étape Z, inspiré de Timeleft) : type, nom, adresse exacte, table, carte (chargée
 * seulement quand on la demande) et itinéraire. Sert aux lieux fixes dès la réservation et aux Tables à la révélation.
 */
export function VenueCard({ kind, detail, name, address, table, tableAfter }: { kind: "restaurant" | "venue"; detail?: string; name: string; address: string; table?: string | null; tableAfter?: boolean }) {
  const t = useTranslations("venueCard");
  const [map, setMap] = useState(false);
  const links = mapsLinks(name, address);
  const Icon = kind === "restaurant" ? Utensils : MapPin;
  return (
    <section aria-labelledby="venue-title" className="card overflow-hidden" data-testid="venue-card">
      <div className="relative h-36 bg-[#efe9df]">
        {map ? (
          <iframe title={t("mapLabel", { name })} src={links.embed} className="absolute inset-0 size-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <button type="button" onClick={() => setMap(true)} className="group absolute inset-0 overflow-hidden" data-testid="venue-map-open">
            {/* Plan dessiné (aucune donnée chargée tant qu'on n'appuie pas). */}
            <svg aria-hidden viewBox="0 0 400 144" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
              <rect width="400" height="144" fill="#efe9df" />
              <path d="M0 98 C90 84 150 120 240 96 S360 70 400 82 V144 H0Z" fill="#cfe3ea" />
              <g stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round">
                <path d="M-10 40 L410 58" />
                <path d="M120 -10 L150 150" />
                <path d="M280 -10 L250 150" />
              </g>
              <g stroke="#fff" strokeWidth="4" fill="none" opacity=".8">
                <path d="M0 14 L200 26 L410 10" />
                <path d="M60 -10 L80 100" />
                <path d="M340 -10 L360 90" />
                <path d="M190 30 L210 150" />
              </g>
            </svg>
            <span className="absolute start-1/2 top-[38%] grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-900 text-white shadow-float rtl:translate-x-1/2">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="absolute bottom-3 start-1/2 -translate-x-1/2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-card transition group-hover:ring-1 group-hover:ring-brand-300 rtl:translate-x-1/2">
              {t("showMap")}
            </span>
          </button>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand-700 uppercase">
          {t(kind)}
          {detail ? ` · ${detail}` : ""}
        </p>
        <h2 id="venue-title" className="mt-1 font-display text-[1.6rem] leading-tight font-semibold text-brand-900">{name}</h2>
        <p className="mt-1 text-[15px] text-ink/80">{address}</p>
        {table ? (
          <p className="mt-3 inline-flex rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-900" data-testid="venue-table">
            {t("table")} : {table}
          </p>
        ) : (
          tableAfter && <p className="mt-3 text-sm text-muted">{t("tableAfter")}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <a href={links.directions} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            <Navigation className="size-4" aria-hidden />
            {t("directions")}
          </a>
          <a href={links.search} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">{t("openMaps")}</a>
        </div>
      </div>
    </section>
  );
}
