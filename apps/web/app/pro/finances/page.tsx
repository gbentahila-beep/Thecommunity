import { redirect } from "next/navigation";

/** docs/22 § 12 : « Finances » devient « Statistiques » (plus de reversements ni de commissions). */
export default function ProFinancesPage() {
  redirect("/pro/statistiques");
}
