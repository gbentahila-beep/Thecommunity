import { useTranslations } from "next-intl";
import { PageShell, PrimaryLink } from "@/components/ui";

export default function NotFound() {
  const t = useTranslations("pages");
  return (
    <PageShell className="py-24 text-center">
      <h1 className="font-display text-4xl text-plum-900">{t("notFoundTitle")}</h1>
      <p className="mt-4 text-muted">{t("notFoundText")}</p>
      <PrimaryLink href="/" className="mt-8">
        {t("notFoundCta")}
      </PrimaryLink>
    </PageShell>
  );
}
