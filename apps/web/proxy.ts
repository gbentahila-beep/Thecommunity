import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/** Même nom que SESSION_COOKIE (lib/firebase/config) : seul cookie transmis par App Hosting. */
const SESSION_COOKIE = "__session";

/** Le cookie de session (jeton signé) n'est pas encore expiré ? Lecture seule de sa date : la signature est vérifiée par la page. */
function liveSession(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const payload = JSON.parse(atob(value.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Langues (next-intl) + accueil des membres (docs/16, phase 4) : une personne connectée qui ouvre l'accueil
 * (« / », « /en », « /ar ») voit son tableau de bord, à la même adresse. Le cookie est vérifié ensuite par la page.
 */
export default function proxy(req: NextRequest) {
  const home = req.nextUrl.pathname.match(/^\/(ar|en)?\/?$/);
  if (home && liveSession(req.cookies.get(SESSION_COOKIE)?.value)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${home[1] ?? routing.defaultLocale}/espace`;
    return NextResponse.rewrite(url);
  }
  return intl(req);
}

export const config = {
  // Tout sauf les fichiers statiques, les routes API, le back-office, l'espace organisateur (/pro) et la
  // redirection des billets scannés (/billet/…) : non localisés, en français.
  matcher: "/((?!api|admin|pro/|pro$|billet/|_next|_vercel|.*\\..*).*)",
};
