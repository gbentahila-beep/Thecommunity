import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tout sauf les fichiers statiques, les routes API, le back-office, l'espace organisateur (/pro) et la
  // redirection des billets scannés (/billet/…) : non localisés, en français.
  matcher: "/((?!api|admin|pro/|pro$|billet/|_next|_vercel|.*\\..*).*)",
};
