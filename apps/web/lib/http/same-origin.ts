import type { NextRequest } from "next/server";

/**
 * Protection CSRF (en plus du cookie SameSite=Lax) : refuse les requêtes envoyées depuis un autre site.
 * Derrière Firebase App Hosting (Cloud Run + proxy Google), le serveur se voit sous une adresse
 * interne : on compare donc l'en-tête Origin à l'hôte PUBLIC transmis par le proxy (x-forwarded-host),
 * à défaut à l'en-tête Host.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // navigation directe ou requête du même site sans Origin
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || req.headers.get("host") || req.nextUrl.host;
  return originHost === host;
}
