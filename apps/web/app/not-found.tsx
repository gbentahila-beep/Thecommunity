import Link from "next/link";
import "./globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="grid min-h-dvh place-items-center bg-cream p-8 text-center text-ink">
        <div>
          <h1 className="text-3xl font-semibold text-plum-900">Page introuvable</h1>
          <p className="mt-3 text-muted">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-plum-900 px-6 py-3 font-semibold text-white">
            Retour à l&apos;accueil
          </Link>
        </div>
      </body>
    </html>
  );
}
