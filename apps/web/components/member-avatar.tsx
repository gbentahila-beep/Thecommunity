import { useId } from "react";
import { AvatarPhoto } from "@/components/avatar-photo";
import { mediaUrl } from "@/components/media";
import { babGlow, babMarkup, type BabMood, type BabName } from "@/components/brand/bab-art";

const NAMES: BabName[] = ["toast", "sprint", "pixel", "doodle", "scout", "memo", "wen"];
const MOODS: BabMood[] = ["happy", "big", "wink"];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/** Bab attribué à un membre sans photo : toujours le même pour une même personne (tiré de son identifiant). */
export function babForMember(uid: string): { name: BabName; mood: BabMood } {
  const h = hash(uid);
  return { name: NAMES[h % NAMES.length]!, mood: MOODS[Math.floor(h / NAMES.length) % MOODS.length]! };
}

/** Adresse de la photo : les photos de profil passent par /api/avatar (jamais publiques), les autres tel quel. */
const photoSrc = (path: string) => (path.startsWith("users/") ? `/api/avatar?path=${encodeURIComponent(path)}` : mediaUrl(path));

/**
 * Avatar d'un membre (docs/22, étape Z) : sa tête de Bab (couleur et humeur fixes pour chaque personne), recouverte
 * par sa photo s'il en a mis une. Si la photo ne se charge pas, le Bab reste visible. Le prénom est écrit à côté :
 * l'avatar est décoratif.
 */
export function MemberAvatar({ uid, photoPath, size = 44, className = "" }: { uid: string; photoPath?: string | null; size?: number; className?: string }) {
  const id = "av" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bab = babForMember(uid);
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`} style={{ width: size, height: size, background: `color-mix(in srgb, ${babGlow(bab.name)} 16%, white)` }} aria-hidden>
      {/* Cadrage sur la tête : l'arche du Bab (cercle centré en 60,58) remplit le rond. */}
      <svg viewBox="6 10 108 108" className="absolute inset-0 size-full translate-y-[8%]" focusable="false" dangerouslySetInnerHTML={{ __html: babMarkup({ name: bab.name, mood: bab.mood }, id) }} />
      {photoPath && <AvatarPhoto src={photoSrc(photoPath)} />}
    </span>
  );
}
