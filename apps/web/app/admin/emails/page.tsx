import { adminDate, Badge, Card, DemoNote, PageHeader } from "@/components/admin/ui";
import { getAdminMail } from "@/lib/data/admin-mail";

export const metadata = { title: "Boîte d'envoi" };

const KINDS: Record<string, string> = {
  reservation_invoice: "Réservation confirmée + facture",
  membership_invoice: "Abonnement + facture",
  refund: "Remboursement + avoir",
  group_revealed: "Table révélée",
  reminder_d1: "Rappel la veille",
  reminder_h3: "Rappel 3 h avant",
  change_date: "Changement de date",
  change_venue: "Changement de lieu",
};
const STATUS = { outbox: ["Boîte d'envoi (test)", "amber"], sent: ["Envoyé", "green"], failed: ["Échec", "red"] } as const;

/** E-mails émis par le site. Sans service d'envoi branché, ils sont rangés ici et rien n'est envoyé. */
export default async function MailAdminPage() {
  const { mails, isDemo } = await getAdminMail();
  const outbox = mails.filter((m) => m.status === "outbox").length;
  return (
    <>
      <PageHeader title="Boîte d'envoi" subtitle={`${mails.length} e-mail(s) · ${outbox} non envoyé(s) (mode test)`} />
      <div className="mb-4">
        <DemoNote>
          {isDemo
            ? "Démonstration : les e-mails apparaissent ici sur le site en ligne."
            : "Tant que le service d'envoi (Brevo) n'est pas branché, les e-mails sont rangés ici et personne ne les reçoit. Ouvrez-en un pour voir exactement ce que le membre recevra."}
        </DemoNote>
      </div>
      <Card>
        {mails.length === 0 ? (
          <p className="text-sm text-muted">Aucun e-mail pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {mails.map((m) => (
              <li key={m.id}>
                <details className="group py-3">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
                    <span className="w-36 shrink-0 text-xs text-muted">{m.createdAt ? adminDate(m.createdAt) : ""}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{m.subject}</span>
                      <span className="block truncate text-xs text-muted">
                        À {m.to} · {KINDS[m.kind] ?? m.kind} · {m.locale.toUpperCase()}
                        {m.attachments.length > 0 && ` · pièce jointe : ${m.attachments.join(", ")}`}
                      </span>
                    </span>
                    <Badge tone={STATUS[m.status][1]}>{STATUS[m.status][0]}</Badge>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {m.error && <p className="text-xs text-red-800">Erreur : {m.error}</p>}
                    {m.refs.invoiceId && (
                      <a href={`/api/factures/${m.refs.invoiceId}`} className="text-xs font-semibold text-plum-900 underline">Ouvrir la pièce jointe (PDF)</a>
                    )}
                    {/* Aperçu isolé : aucun script, aucun accès à la page. */}
                    <iframe title={`Aperçu : ${m.subject}`} srcDoc={m.html} sandbox="" className="h-[520px] w-full rounded-xl border border-line bg-white" />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
