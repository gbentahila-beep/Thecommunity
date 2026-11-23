import { redirect } from "next/navigation";

/** Fonction retirée (docs/22, étape J : plus de commissions, de reversements ni de propositions) : l'ancienne adresse renvoie ailleurs. */
export default function RetiredPage() {
  redirect("/admin/experiences");
}
