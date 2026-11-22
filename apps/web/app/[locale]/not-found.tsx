import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/ui";

export default function NotFound() {
  const t = useTranslations("pages");
  const te = useTranslations("emptyStates");
  return (
    <PageShell className="py-16">
      <div className="mx-auto max-w-xl">
      <EmptyState
        bab="scout"
        mood="lost"
        prop="signpost"
        variant="plain"
        titleAs="h1"
        eyebrow={t("notFoundTitle")}
        title={te("notFoundTitle")}
        text={t("notFoundText")}
        action={{ href: "/", label: t("notFoundCta") }}
        secondary={{ href: "/experiences", label: te("browse") }}
      />
      </div>
    </PageShell>
  );
}
