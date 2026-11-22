import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

/** docs/22, décision 30 : les propositions de sorties (membres de confiance) sont supprimées. */
export default async function ProposePage() {
  const locale = await getLocale();
  return redirect({ href: "/espace", locale });
}
