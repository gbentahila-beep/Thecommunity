import type { Experience, Session } from "@thecommunity/shared";
import { EventCard } from "./event-card";

/**
 * Ligne du catalogue (Découvrir, fiche, page organisateur) : la carte « rendez-vous » unique (docs/29, étape 2).
 * `agenda` : ligne d'un jour de Découvrir (l'heure seule sous le titre du jour ; le jour aussi dans la grille d'ordinateur).
 * `anchorId` : ancre du calendrier (« #jour-… »), posée sur la première ligne du jour.
 */
export async function ExperienceRow({ experience, session, showDay = false, priority = false, agenda = false, anchorId }: { experience: Experience; session?: Session; showDay?: boolean; priority?: boolean; agenda?: boolean; anchorId?: string }) {
  return EventCard({ experience, session, priority, anchorId, when: showDay && !agenda ? "short" : "time", testId: "catalog-row" });
}
