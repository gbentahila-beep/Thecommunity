import { useId, type CSSProperties } from "react";
import { BAB_VIEWBOX, SCENE_VIEWBOX, babMarkup, sceneMarkup, type BabMood, type BabName, type BabProp } from "./bab-art";

export type { BabMood, BabName, BabProp } from "./bab-art";

type Props = {
  name?: BabName;
  mood?: BabMood;
  /** Objet posé à côté (états vides) : le dessin s'élargit pour lui faire de la place. */
  prop?: BabProp;
  jump?: boolean;
  tilt?: number;
  className?: string;
  style?: CSSProperties;
  /** Texte alternatif ; sans lui, le dessin est décoratif (ignoré par les lecteurs d'écran). */
  label?: string;
};

/**
 * Un Bab (docs/22-babs.md). Dessin statique, sans JavaScript côté navigateur ; utilisable dans les composants
 * serveur comme client. Le contenu SVG est entièrement généré par bab-art.ts (aucune donnée extérieure).
 */
export function Bab({ name = "wen", mood = "happy", prop, jump, tilt, className = "", style, label }: Props) {
  const id = "bab" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const markup = prop ? sceneMarkup({ name, mood, jump, tilt, prop }, id) : babMarkup({ name, mood, jump, tilt }, id);
  return (
    <svg
      viewBox={prop ? SCENE_VIEWBOX : BAB_VIEWBOX}
      className={`h-auto max-w-full ${className}`}
      style={style}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: false })}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
