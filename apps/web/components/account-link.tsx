"use client";

import { UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** Icône du compte (en-tête, ordinateur). Étape 32 : la pastille des non-lues est sur la cloche voisine. */
export function AccountLink({ label }: { label: string }) {
  return (
    <Link href="/espace" aria-label={label} className="relative grid size-11 place-items-center rounded-full bg-cream-deep text-plum-900 transition hover:bg-sand">
      <UserRound className="size-5" aria-hidden />
    </Link>
  );
}
