import { connection } from "next/server";
import { DemoReset } from "@/components/admin/demo-reset";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Site de démo" };

/** 25/11 : réglages du site de démonstration (comptes invités, remise à zéro). Absent en production. */
export default async function DemoPage() {
  await connection();
  let trial = false;
  let guestEmails: string[] = [];
  let last: { at: string; reservations?: number; guests?: { email: string; booked: string[]; problem?: string }[] } | null = null;
  let superadmin = false;
  if (FIREBASE_ENABLED) {
    const me = await requireAdmin();
    superadmin = me.role === "superadmin";
    const [show, demo] = await Promise.all([adminDb().doc("settings/showcase").get(), adminDb().doc("settings/demo").get()]);
    trial = show.get("trial") === true;
    guestEmails = (demo.get("guestEmails") ?? []) as string[];
    const at = demo.get("lastResetAt") as { toDate(): Date } | undefined;
    if (at) last = { at: new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(at.toDate()), reservations: demo.get("lastResult.crowd.reservations"), guests: demo.get("lastResult.guests") };
  }
  return (
    <div className="max-w-3xl">
      <PageHeader title="Site de démo" subtitle="Remettre la démonstration à zéro et la remplir à nouveau, autant de fois que nécessaire." />
      {!trial ? (
        <Card><p className="text-sm text-muted">Ce site n&apos;est pas le site de démonstration : la remise à zéro n&apos;existe pas ici.</p></Card>
      ) : (
        <Card>
          {last && (
            <p className="mb-4 rounded-xl bg-cream px-3 py-2 text-sm text-ink">
              Dernière remise à zéro : {last.at}{last.reservations != null ? ` · ${last.reservations} réservations de la foule` : ""}.
              {(last.guests ?? []).map((g) => <span key={g.email} className="block text-xs text-muted">{g.email} : {g.problem ?? (g.booked.length ? g.booked.join(", ") : "aucune date")}</span>)}
            </p>
          )}
          <DemoReset guestEmails={guestEmails} canEdit={superadmin} />
          {!superadmin && <p className="mt-3 text-xs text-muted">Réservé au super-admin.</p>}
        </Card>
      )}
    </div>
  );
}
