/**
 * Les Babs : petits personnages de Wenzy (docs/22-babs.md).
 * Dessin vectoriel construit en texte SVG, sans dépendance ni texte traduisible.
 * Repère 120 × 140 : arche (demi-cercle r 38 centré en 60,58), côtés droits, coins bas arrondis.
 */

export type BabName = "wen" | "toast" | "sprint" | "pixel" | "doodle" | "scout" | "memo";
export type BabMood = "happy" | "big" | "party" | "wink" | "surprised" | "sleep" | "lost" | "guard" | "wait";
export type BabProp = "calendar" | "notebook" | "bell" | "receipt" | "hearts" | "map" | "magnifier" | "stars" | "chat" | "signpost" | "ticket" | "pen";

type Accessory = "bow" | "band" | "party" | "beret" | "shades" | "glasses" | null;

/** Un Bab par univers : couleur de l'univers et accessoire qui dit ce qu'on y fait. */
export const BABS: Record<BabName, { color: string | "brand"; accessory: Accessory }> = {
  wen: { color: "brand", accessory: null }, // Rencontres, mascotte principale (dégradé de la marque)
  toast: { color: "#E2553A", accessory: "bow" }, // Dîners
  sprint: { color: "#2F8A5A", accessory: "band" }, // Sport & bien-être
  pixel: { color: "#C07A14", accessory: "party" }, // Jeux
  doodle: { color: "#B04A9A", accessory: "beret" }, // Ateliers
  scout: { color: "#4650C8", accessory: "shades" }, // Sorties
  memo: { color: "#1F7F8C", accessory: "glasses" }, // Culture & apprentissage
};

/** Univers → Bab (les catégories créées plus tard prennent Wen). */
export const BAB_FOR_CATEGORY: Record<string, BabName> = {
  eat: "toast",
  move: "sprint",
  play: "pixel",
  create: "doodle",
  discover: "scout",
  meet: "wen",
  learn: "memo",
};

export const babForCategory = (categoryId?: string | null): BabName => BAB_FOR_CATEGORY[categoryId ?? ""] ?? "wen";

/** Couleur d'ambiance (halo derrière un état vide). */
export const babGlow = (name: BabName) => (BABS[name].color === "brand" ? "#C25BE8" : (BABS[name].color as string));

const INK = "#141414";
const GOLD = "#FFC24D";
const GOLD_D = "#C98A1E";
const L = 48;
const R = 72;
const EY = 66;
export const BAB_BODY = "M22 58 A38 38 0 0 1 98 58 V110 Q98 126 82 126 H38 Q22 126 22 110 Z";

function mix(hex: string, amt: number, to: 0 | 255) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * amt));
  return "#" + ((1 << 24) | (ch[0] << 16) | (ch[1] << 8) | ch[2]).toString(16).slice(1);
}

const spark = (x: number, y: number, r: number, fill: string) => {
  const k = r * 0.18;
  return `<path transform="translate(${x} ${y})" d="M0 ${-r} C${k} ${-k} ${k} ${-k} ${r} 0 C${k} ${k} ${k} ${k} 0 ${r} C${-k} ${k} ${-k} ${k} ${-r} 0 C${-k} ${-k} ${-k} ${-k} 0 ${-r}Z" fill="${fill}"/>`;
};
const eye = (x: number, y: number, k = 1) =>
  `<ellipse cx="${x}" cy="${y}" rx="${4.3 * k}" ry="${5.4 * k}" fill="${INK}"/><circle cx="${x - 1.4 * k}" cy="${y - 2 * k}" r="${1.6 * k}" fill="#fff"/>`;
const line = (d: string, w = 3, extra = "") =>
  `<path d="${d}" stroke="${INK}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const OPEN = `<path d="M51 78 Q60 91 69 78 Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M55 84.5 Q60 88.5 65 84.5 Q60 82.5 55 84.5Z" fill="#FF6A4D"/>`;

function face(mood: BabMood) {
  switch (mood) {
    case "big":
      return eye(L, EY) + eye(R, EY) + line("M42 55 q5 -3 10 -0.5") + line("M68 54.5 q5 -2.5 10 0.5") + OPEN;
    case "party":
      return line("M42.5 67.5 q5.5 -6.5 11 0", 3.2) + line("M66.5 67.5 q5.5 -6.5 11 0", 3.2) + OPEN;
    case "wink":
      return eye(L, EY) + line("M66.5 67 q5.5 4 11 0", 3.2) + line("M53 79 Q61 87 69 78");
    case "surprised":
      return eye(L, EY, 1.12) + eye(R, EY, 1.12) + line("M41 52 q6 -4 11 -1") + line("M68 51 q6 -3 11 1") + `<ellipse cx="60" cy="82" rx="3.6" ry="4.6" fill="${INK}"/>`;
    case "sleep":
      return line("M42.5 66 q5.5 5 11 0") + line("M66.5 66 q5.5 5 11 0") + line("M56 79 q4 2.5 8 0", 2.8);
    case "lost":
      return eye(L, EY + 1, 1.1) + eye(R, EY + 1, 0.8) + line("M41 56 q5 -1 10 -4") + line("M69 53 q5 .5 10 3.5") + line("M51 81 q4.5 -3.5 9 0 t9 0", 2.8);
    case "guard":
      return eye(L, EY + 1) + eye(R, EY + 1) + line("M41 56 l11 3", 3.2) + line("M79 56 l-11 3", 3.2) + line("M52 79 Q60 83 68 79");
    case "wait":
      return eye(L + 3, EY) + eye(R + 3, EY) + line("M44 56 q5 -1.5 10 0") + `<circle cx="63" cy="80" r="3" fill="${INK}"/>`;
    default:
      return eye(L, EY) + eye(R, EY) + line("M52 77.5 Q60 85.5 68 77.5");
  }
}

export type BabOptions = { name?: BabName; mood?: BabMood; jump?: boolean; tilt?: number };

/** Le personnage seul (sans balise <svg>), à placer dans une vue -8 -14 136 156. */
export function babMarkup({ name = "wen", mood = "happy", jump = false, tilt = 0 }: BabOptions, id: string) {
  const { color, accessory } = BABS[name];
  const brand = color === "brand";
  const base = brand ? "#E0629A" : color;
  const feet = brand ? "#9B44C9" : mix(base, 0.32, 0);
  const defs =
    `<clipPath id="${id}c"><path d="${BAB_BODY}"/></clipPath>` +
    `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6A4D"/><stop offset="1" stop-color="#C25BE8"/></linearGradient>` +
    (brand
      ? `<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A5C"/><stop offset="1" stop-color="#C25BE8"/></linearGradient>`
      : `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(base, 0.12, 255)}"/><stop offset="1" stop-color="${base}"/></linearGradient>`);
  let inside = "";
  let over = "";
  let around = "";
  let showSpark = true;
  if (accessory === "bow")
    over += `<g transform="translate(60 101)"><path d="M0 0 L-13 -7 Q-16 0 -13 7 Z M0 0 L13 -7 Q16 0 13 7 Z" fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><rect x="-3.5" y="-3.5" width="7" height="7" rx="2" fill="${INK}"/></g>`;
  if (accessory === "band")
    inside += `<rect x="0" y="36" width="120" height="10" fill="#fff"/><rect x="0" y="39.3" width="120" height="1.6" fill="${base}"/><rect x="0" y="42.2" width="120" height="1.6" fill="${base}"/>`;
  if (accessory === "party") {
    showSpark = false;
    over += `<g transform="translate(46 26) rotate(-16)"><path d="M-12 0 L0 -30 L12 0 Z" fill="#FFD25A" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M-8 -10 L6 -6 M-4 -20 L4 -17" stroke="#FF6A4D" stroke-width="3" stroke-linecap="round"/><circle cy="-31" r="4" fill="#C25BE8" stroke="${INK}" stroke-width="1.4"/></g>`;
  }
  if (accessory === "beret") {
    showSpark = false;
    over += `<g transform="translate(62 22) rotate(-10)"><ellipse rx="26" ry="8" fill="#2A2238"/><path d="M-20 -2 Q0 -16 20 -2 Z" fill="#2A2238"/><path d="M0 -10 v-5" stroke="#2A2238" stroke-width="3" stroke-linecap="round"/></g>`;
    inside += `<circle cx="32" cy="100" r="5" fill="#FFD25A"/><circle cx="38" cy="110" r="2" fill="#FFD25A"/><circle cx="88" cy="88" r="4" fill="#5B8CFF"/><circle cx="84" cy="98" r="1.8" fill="#5B8CFF"/><circle cx="30" cy="70" r="3" fill="#7FE0B0"/>`;
  }
  if (accessory === "shades")
    over += `<rect x="39" y="32" width="18" height="12" rx="6" fill="${INK}"/><rect x="63" y="32" width="18" height="12" rx="6" fill="${INK}"/><path d="M57 37 q3 -2 6 0" stroke="${INK}" stroke-width="2.4" fill="none"/><path d="M43 35 h6 M67 35 h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
  if (accessory === "glasses")
    over += `<circle cx="${L}" cy="${EY}" r="10" fill="#fff" fill-opacity=".22" stroke="${INK}" stroke-width="2.4"/><circle cx="${R}" cy="${EY}" r="10" fill="#fff" fill-opacity=".22" stroke="${INK}" stroke-width="2.4"/><path d="M58 65 q2 -2 4 0" stroke="${INK}" stroke-width="2.4" fill="none"/>`;
  if (mood === "party")
    around += ([[8, 34, "#FF6A4D", 7], [112, 30, "#C25BE8", 6], [4, 72, "#FFD25A", 5], [116, 74, "#5B8CFF", 5], [20, 12, "#7FE0B0", 4]] as const)
      .map(([x, y, c, r]) => spark(x, y, r, c))
      .join("");
  if (mood === "sleep")
    around += `<path d="M93 26 h9 l-9 10 h9" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/><path d="M106 14 h6 l-6 7 h6" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>`;
  if (mood === "lost")
    around += `<path d="M99 22 q0 -7 7 -7 q7 0 7 6 q0 5 -7 7 v4" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="106" cy="40" r="2.3" fill="${INK}"/>`;
  if (mood === "wait")
    around += `<g fill="${INK}"><circle cx="102" cy="30" r="2.6" opacity=".6"/><circle cx="110" cy="30" r="2.6" opacity=".4"/><circle cx="118" cy="30" r="2.6" opacity=".2"/></g>`;
  if (mood === "surprised") around += line("M14 24 l-6 -6 M10 34 h-8 M22 14 l-2 -8", 2.4, ' opacity=".45"');
  return (
    `<defs>${defs}</defs>` +
    `<ellipse cx="60" cy="134" rx="${jump ? 26 : 36}" ry="4.5" fill="#000" opacity="${jump ? 0.07 : 0.12}"/>` +
    `<g transform="translate(0 ${jump ? -10 : 0}) rotate(${tilt} 60 126)">` +
    `<rect x="33" y="119" width="20" height="13" rx="6.5" fill="${feet}"/><rect x="67" y="119" width="20" height="13" rx="6.5" fill="${feet}"/>` +
    `<path d="${BAB_BODY}" fill="url(#${id}b)"/>` +
    `<g clip-path="url(#${id}c)"><ellipse cx="102" cy="92" rx="22" ry="62" fill="#000" opacity=".09"/>${inside}</g>` +
    `<path d="M30 54 A31 31 0 0 1 46 30" stroke="#fff" stroke-opacity=".5" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="41" cy="77" rx="5.2" ry="3.2" fill="#FF6A4D" opacity=".32"/><ellipse cx="79" cy="77" rx="5.2" ry="3.2" fill="#FF6A4D" opacity=".32"/>` +
    face(mood) +
    over +
    (showSpark ? spark(60, 8, 8, `url(#${id}s)`) : "") +
    `</g>` +
    around
  );
}

const sk = `stroke="${INK}"`;
const star5 = (x: number, y: number, fill: string) =>
  `<path transform="translate(${x} ${y})" d="M0 -10 L2.9 -3.1 L9.5 -3.1 L4.2 1.2 L6.2 8.1 L0 4 L-6.2 8.1 L-4.2 1.2 L-9.5 -3.1 L-2.9 -3.1Z" fill="${fill}" stroke="${GOLD_D}" stroke-width="1.5" stroke-linejoin="round"/>`;
const heart = (x: number, y: number, k: number, c: string, dashed = false) =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M0 7 C-11 -1 -9 -11 -3.5 -11 C-1.5 -11 0 -9 0 -8 C0 -9 1.5 -11 3.5 -11 C9 -11 11 -1 0 7Z" ${dashed ? `fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="2.5 2"` : `fill="${c}"`}/>`;

/** Objets posés à côté du Bab dans un état vide. y : hauteur du centre (le sol est vers 130). */
const PROPS: Record<BabProp, (id: string) => { y: number; svg: string }> = {
  calendar: () => ({
    y: 58,
    svg:
      `<rect x="-20" y="-18" width="40" height="38" rx="7" fill="#fff" ${sk} stroke-width="2"/><path d="M-19 -7 V-11 a6 6 0 0 1 6 -6 H13 a6 6 0 0 1 6 6 V-7Z" fill="#FF6A4D"/><path d="M-20 -6 H20" ${sk} stroke-width="2"/><path d="M-9 -23 V-13 M9 -23 V-13" ${sk} stroke-width="2.8" stroke-linecap="round"/>` +
      [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<circle cx="${-12 + c * 8}" cy="${1 + r * 6.5}" r="1.8" fill="#E6DED3"/>`).join("")).join(""),
  }),
  notebook: () => ({
    y: 108,
    svg: `<ellipse cy="17" rx="26" ry="3" fill="#000" opacity=".1"/><path d="M0 -8 Q-12 -15 -26 -10 V12 Q-12 7 0 14 Q12 7 26 12 V-10 Q12 -15 0 -8Z" fill="#fff" ${sk} stroke-width="2" stroke-linejoin="round"/><path d="M0 -8 V14" ${sk} stroke-width="1.6"/>`,
  }),
  bell: () => ({
    y: 52,
    svg: `<circle cy="-19" r="3.4" fill="${GOLD_D}"/><path d="M-14 10 Q-14 -16 0 -16 Q14 -16 14 10 L18 14 H-18 Z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="1.8" stroke-linejoin="round"/><circle cy="18" r="4" fill="${GOLD_D}"/><path d="M-8 -5 Q-8 -11 -3 -12" stroke="#fff" stroke-width="2.2" fill="none" opacity=".8" stroke-linecap="round"/>`,
  }),
  receipt: () => ({
    y: 62,
    svg: `<path d="M-16 -24 H16 V22 l-4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 Z" fill="#fff" ${sk} stroke-width="2" stroke-linejoin="round"/><path d="M-10 -14 H10 M-10 -7 H5 M-10 0 H8" stroke="#E6DED3" stroke-width="2.6" stroke-linecap="round"/><path d="M-10 11 H10" ${sk} stroke-width="2.6" stroke-linecap="round"/>`,
  }),
  hearts: () => ({ y: 48, svg: heart(-8, 4, 1.5, "#FF6A4D") + heart(12, -12, 1, "#C25BE8") + heart(12, 16, 1, "#C25BE8", true) }),
  map: () => ({
    y: 110,
    svg: `<ellipse cy="20" rx="26" ry="3" fill="#000" opacity=".1"/><path d="M-26 -12 L-9 -16 L9 -12 L26 -16 V14 L9 18 L-9 14 L-26 18 Z" fill="#fff" ${sk} stroke-width="1.8" stroke-linejoin="round"/><path d="M-9 -16 V14 M9 -12 V18" ${sk} stroke-width="1" opacity=".3"/><path d="M-20 10 Q-12 -4 -2 4 T14 -5" stroke="#FF6A4D" stroke-width="2" stroke-dasharray="3 3" fill="none"/><path d="M15 -10 l5 5 M20 -10 l-5 5" ${sk} stroke-width="2.2" stroke-linecap="round"/>`,
  }),
  magnifier: () => ({
    y: 64,
    svg: `<circle cx="-4" cy="-4" r="14" fill="#CFE3FF" fill-opacity=".6" ${sk} stroke-width="3.4"/><path d="M6.5 6.5 L18 18" ${sk} stroke-width="6" stroke-linecap="round"/>`,
  }),
  stars: () => ({ y: 52, svg: star5(-21, 2, "none") + star5(0, -6, "none") + star5(21, 2, "none") }),
  chat: (id) => ({
    y: 54,
    svg: `<path d="M-4 -6 H22 a6 6 0 0 1 6 6 V12 a6 6 0 0 1 -6 6 H18 V25 L10 18 H-4 a6 6 0 0 1 -6 -6 V0 a6 6 0 0 1 6 -6Z" fill="url(#${id}s)" ${sk} stroke-width="1.6" stroke-linejoin="round"/><path d="M-22 -24 H4 a6 6 0 0 1 6 6 V-6 a6 6 0 0 1 -6 6 H-12 L-20 7 V0 H-22 a6 6 0 0 1 -6 -6 V-18 a6 6 0 0 1 6 -6Z" fill="#fff" ${sk} stroke-width="1.6" stroke-linejoin="round"/><g fill="${INK}"><circle cx="-17" cy="-12" r="2"/><circle cx="-9" cy="-12" r="2"/><circle cx="-1" cy="-12" r="2"/></g>`,
  }),
  signpost: () => ({
    y: 102,
    svg: `<ellipse cy="30" rx="13" ry="3" fill="#000" opacity=".12"/><path d="M0 -36 V30" stroke="#8C6A4E" stroke-width="4" stroke-linecap="round"/><path d="M-2 -33 H24 L30 -27 L24 -21 H-2Z" fill="#fff" ${sk} stroke-width="1.6" stroke-linejoin="round"/><path d="M4 -27 H20" stroke="#E6DED3" stroke-width="2.4" stroke-linecap="round"/><path d="M2 -15 H-24 L-30 -9 L-24 -3 H2Z" fill="#FF6A4D" ${sk} stroke-width="1.6" stroke-linejoin="round"/><path d="M-20 -9 H-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`,
  }),
  ticket: () => ({
    y: 60,
    svg: `<g transform="rotate(-12)"><path d="M-25 -13 H25 V-5 a5 5 0 0 0 0 10 V13 H-25 V5 a5 5 0 0 0 0 -10 Z" fill="#fff" ${sk} stroke-width="1.8" stroke-linejoin="round"/><path d="M11 -12 V12" ${sk} stroke-width="1.2" stroke-dasharray="2 2"/><path d="M-16 -4 H3 M-16 3 H-2" stroke="#E6DED3" stroke-width="2.6" stroke-linecap="round"/></g>`,
  }),
  pen: () => ({
    y: 70,
    svg: `<rect x="-17" y="-22" width="34" height="42" rx="5" fill="#fff" ${sk} stroke-width="2"/><path d="M-10 -12 H10 M-10 -4 H6 M-10 4 H8" stroke="#E6DED3" stroke-width="2.6" stroke-linecap="round"/><g transform="translate(12 8) rotate(40)"><rect x="-3" y="-18" width="6" height="22" rx="1.5" fill="${GOLD}" ${sk} stroke-width="1.4"/><path d="M-3 4 L0 10 L3 4Z" fill="#F1D6A5" ${sk} stroke-width="1.2" stroke-linejoin="round"/></g>`,
  }),
};

export const BAB_VIEWBOX = "-8 -14 136 156";
export const SCENE_VIEWBOX = "-8 -16 204 158";

/** Bab + objet à sa droite (états vides). */
export function sceneMarkup(opts: BabOptions & { prop?: BabProp }, id: string) {
  const bab = babMarkup(opts, id);
  if (!opts.prop) return bab;
  const p = PROPS[opts.prop](id);
  return `${bab}<g transform="translate(158 ${p.y})">${p.svg}</g>`;
}
