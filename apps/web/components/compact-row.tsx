import type { Experience, Session } from "@thecommunity/shared";
import { EventCard } from "./event-card";

/** Ligne compacte d'une expérience (accueil, espace membre) : la carte « rendez-vous » unique (docs/29, étape 2). */
export async function CompactRow({ experience, session, priority = false }: { experience: Experience; session?: Session; priority?: boolean }) {
  return EventCard({ experience, session, priority, when: "day", testId: "compact-row" });
}
