"use client";

import { MapPinned, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Étape 23 — carte d'un lieu PUBLIC (jamais pour un lieu révélé plus tard). OpenStreetMap n'est chargé qu'après un
 * clic : aucune requête vers un service tiers tant que la personne ne l'a pas demandé. « Itinéraire » ouvre
 * Google Maps dans un nouvel onglet.
 */
export function VenueMap({ lat, lng, place }: { lat: number; lng: number; place: string }) {
  const t = useTranslations("map");
  const [shown, setShown] = useState(false);
  const bbox = [lng - 0.006, lat - 0.004, lng + 0.006, lat + 0.004].map((n) => n.toFixed(6)).join(",");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return (
    <div className="mt-4 space-y-3" data-testid="venue-map">
      {shown ? (
        <iframe
          title={t("title", { place })}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
          className="h-72 w-full rounded-2xl border border-line"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-line bg-cream/60 px-4 text-center">
          <div>
            <button type="button" onClick={() => setShown(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-card">
              <MapPinned className="size-4" aria-hidden />
              {t("show")}
            </button>
            <p className="mt-2 text-xs text-muted">{t("privacy")}</p>
          </div>
        </div>
      )}
      <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-900 underline underline-offset-4">
        <Navigation className="size-4" aria-hidden />
        {t("directions")}
      </a>
    </div>
  );
}
