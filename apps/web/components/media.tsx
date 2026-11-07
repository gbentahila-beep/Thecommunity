import Image, { type ImageProps } from "next/image";
import { firebaseConfig, USE_EMULATORS } from "@/lib/firebase/config";

/**
 * URL publique d'une image :
 * - « /demo/... » : fichier du site (photos de démonstration) ;
 * - « experiences/... » : fichier Firebase Storage (lecture publique autorisée par les règles).
 */
export function mediaUrl(path: string) {
  if (!path || path.startsWith("/") || path.startsWith("http")) return path;
  const host = USE_EMULATORS ? "http://127.0.0.1:9199" : "https://firebasestorage.googleapis.com";
  return `${host}/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;
}

/** next/image qui accepte aussi les chemins Storage (servis tels quels, déjà redimensionnés à l'envoi). */
export function MediaImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  const url = mediaUrl(src);
  return <Image src={url} alt={alt} unoptimized={!url.startsWith("/")} {...props} />;
}
