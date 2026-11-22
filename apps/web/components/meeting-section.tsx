import type { MeetingSummary } from "@thecommunity/shared";
import { HeartHandshake, Languages, Repeat, Sparkles, UserRound, Users, UsersRound } from "lucide-react";

type Labels = {
  title: string; principle: string; comeAlone: string; groupSize: string; languages: string; audience: string;
  targetAge: string; crowd: string; crowdAge: string; crowdInterests: string; newPeople: string;
};

/**
 * Étape 29 — « Qui allez-vous rencontrer ? » : rassurer sans identifier personne. Les chiffres sur les inscrits
 * n'apparaissent qu'à partir de 4 personnes, l'âge arrondi à 5 ans, et seulement les centres d'intérêt partagés.
 */
export function MeetingSection({ meeting, t }: { meeting: MeetingSummary; t: Labels }) {
  const items = [
    { icon: UserRound, text: t.comeAlone },
    t.groupSize && { icon: Users, text: t.groupSize },
    meeting.languages.length > 0 && { icon: Languages, text: t.languages },
    { icon: meeting.audience === "women" ? UsersRound : HeartHandshake, text: t.audience },
    t.targetAge && { icon: Sparkles, text: t.targetAge },
    t.newPeople && { icon: Repeat, text: t.newPeople },
  ].filter(Boolean) as { icon: typeof Users; text: string }[];
  return (
    <section aria-labelledby="meeting-title" className="rounded-[var(--radius-card)] bg-brand-50 p-5 sm:p-6" data-testid="meeting">
      <h2 id="meeting-title" className="font-display text-2xl font-medium text-brand-900">{t.title}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[15px] text-ink">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {t.crowd && (
        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink/85" data-testid="meeting-crowd">
          {[t.crowd, t.crowdAge, t.crowdInterests].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="mt-4 text-sm text-muted">{t.principle}</p>
    </section>
  );
}
