import { z } from "zod";

/**
 * Étape 31 — « Mes rencontres » : après une expérience en groupe, chacun peut dire en privé « J'aimerais revoir
 * cette personne ». Rien n'est jamais montré à l'autre tant que ce n'est pas RÉCIPROQUE ; alors les deux sont
 * prévenus et peuvent s'inviter à une prochaine expérience. Pas de messagerie (décision D8). On peut aussi demander
 * à ne plus être réuni avec quelqu'un (pris en compte par la composition des groupes).
 *
 * Données (écrites par le serveur seulement) : meetWishes/{de}_{à} (privé, jamais lu par le navigateur),
 * connections/{paire} (lu par les deux personnes), avoids/{uid} (privé), invitations/{id} (journal, limite).
 */

const ID = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

/** On peut dire « revoir » jusqu'à 60 jours après l'expérience. */
export const MEET_AGAIN_DAYS = 60;
/** Invitations envoyées par jour et par personne (évite les relances insistantes). */
export const INVITES_PER_DAY = 10;
export const INVITE_MAX_PEOPLE = 10;

export const meetAgainSchema = z.object({ groupId: ID, otherUid: ID, wish: z.boolean() });
export const avoidSchema = z.object({ otherUid: ID, avoid: z.boolean() });
export const inviteSchema = z.object({
  sessionId: ID,
  toUids: z.array(ID).min(1, "pickOne").max(INVITE_MAX_PEOPLE, "tooMany"),
});

/** Peut-on encore dire « revoir » pour une expérience terminée le `endAt` ? */
export function meetWindowOpen(endAt: string | Date, now: Date): boolean {
  const end = new Date(endAt).getTime();
  return end <= now.getTime() && now.getTime() - end <= MEET_AGAIN_DAYS * 86_400_000;
}

export type Connection = {
  id: string;
  uids: string[];
  /** Prénoms (jamais le nom) des deux personnes. */
  names: Record<string, string>;
  groupId: string;
  sessionId: string;
  experienceTitle: string;
  metAt: string;
  matchedAt: string;
};

/** Le contact (l'autre personne) d'une connexion, vu par `me`. */
export const otherOf = (c: Pick<Connection, "uids" | "names">, me: string) => {
  const uid = c.uids.find((u) => u !== me) ?? "";
  return { uid, firstName: c.names[uid] ?? "" };
};

/**
 * Signalements (audit du 23/11) : depuis sa réservation, de 1 h avant le début à 30 jours après la fin ;
 * au-delà de 2 personnes différentes en 90 jours, le compte signalé ne peut plus réserver (gel, levé par l'équipe).
 */
export const REPORT_BEFORE_MIN = 60;
export const REPORT_AFTER_DAYS = 30;
export const REPORT_ESCALATION_DAYS = 90;
export const REPORT_ESCALATION_REPORTERS = 2;
export function reportWindowOpen(startAt: string, endAt: string, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(startAt).getTime() - REPORT_BEFORE_MIN * 60_000 && t <= new Date(endAt).getTime() + REPORT_AFTER_DAYS * 86_400_000;
}
