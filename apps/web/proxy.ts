import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tout sauf les fichiers statiques, les routes API et l'espace admin (à venir, non localisé).
  matcher: "/((?!api|admin|_next|_vercel|.*\\..*).*)",
};
