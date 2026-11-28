"use client";

import { organizerCancelRequestSchema, saturdayProposalSchema } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

type Existing = { status: "pending" | "accepted" | "refused"; message?: string; placedOn?: string; dates?: string[] } | null;
const satLabel = (d: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

async function call(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  return httpsCallable(firebase().functions, name)(data);
}

/** Lot O (docs/26) : l'organisateur ne peut plus annuler une date ; il le demande à l'équipe, qui décide et rembourse. */
export function CancellationRequest({ sessionId, participants, existing, live }: { sessionId: string; participants: number; existing: Existing; live: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (existing?.status === "pending") return <p className="text-sm text-amber-800" data-testid="cancel-request-pending">Demande d&apos;annulation envoyée : l&apos;équipe vous répond rapidement. La date est maintenue d&apos;ici là.</p>;
  return (
    <div className="space-y-2 text-sm" data-testid="cancel-request">
      {existing?.status === "refused" && <p className="text-muted">Dernière demande refusée{existing.message ? ` : « ${existing.message} »` : ""}.</p>}
      <p className="text-muted">Météo, lieu indisponible, minimum non atteint… Expliquez le motif : l&apos;équipe annule la date et rembourse intégralement {participants > 0 ? `les ${participants} inscrit(s)` : "les inscrits"}, ou vous recontacte.</p>
      <textarea rows={3} maxLength={600} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2" aria-label="Motif de l'annulation" placeholder="Motif (10 caractères minimum)" />
      <button
        type="button"
        disabled={!live || busy}
        onClick={async () => {
          const parsed = organizerCancelRequestSchema.safeParse({ sessionId, reason });
          if (!parsed.success) return setMsg("Expliquez le motif en quelques mots (10 caractères minimum).");
          setBusy(true);
          try {
            await call("organizerRequestCancellation", parsed.data);
            setMsg("Demande envoyée à l'équipe.");
            router.refresh();
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Envoi impossible.");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full border border-red-300 bg-white px-4 py-2 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Envoi…" : "Demander l'annulation de la date"}
      </button>
      {msg && <p role="status" className="text-muted">{msg}</p>}
    </div>
  );
}

/** Lot O : proposer une activité validée pour l'activité du samedi (l'équipe la place sur un samedi, ou non). */
export function SaturdayProposal({ experienceId, saturdays, existing, live }: { experienceId: string; saturdays: string[]; existing: Existing; live: boolean }) {
  const router = useRouter();
  const [dates, setDates] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (existing?.status === "pending") return <p className="text-sm text-amber-800">Proposée pour un samedi{existing.dates?.length ? ` (${existing.dates.map(satLabel).join(", ")})` : ""} : l&apos;équipe vous répond.</p>;
  return (
    <div className="space-y-3 text-sm" data-testid="saturday-proposal">
      {existing?.status === "accepted" && existing.placedOn && <p className="font-medium text-emerald-800">Retenue pour le {satLabel(existing.placedOn)}.</p>}
      {existing?.status === "refused" && <p className="text-muted">Dernière proposition non retenue{existing.message ? ` : « ${existing.message} »` : ""}.</p>}
      <p className="text-muted">Chaque samedi, Wenzy propose une activité à sa communauté. Proposez la vôtre : si l&apos;équipe la retient, elle devient l&apos;activité du samedi choisi (une seule date ouverte à la fois, mise en avant sur l&apos;accueil).</p>
      <fieldset>
        <legend className="mb-1 font-medium text-ink">Samedis souhaités (facultatif, 3 au plus)</legend>
        <div className="flex flex-wrap gap-2">
          {saturdays.map((d) => (
            <label key={d} className={`cursor-pointer rounded-full border px-3 py-1.5 ${dates.includes(d) ? "border-brand-900 bg-brand-50 text-brand-900" : "border-line bg-white"}`}>
              <input type="checkbox" className="sr-only" checked={dates.includes(d)} onChange={(e) => setDates((x) => (e.target.checked ? [...x, d].slice(0, 3) : x.filter((y) => y !== d)))} />
              {satLabel(d)}
            </label>
          ))}
        </div>
      </fieldset>
      <textarea rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2" aria-label="Message à l'équipe" placeholder="Message à l'équipe (facultatif) : horaires possibles, nombre de places…" />
      <button
        type="button"
        disabled={!live || busy}
        onClick={async () => {
          const parsed = saturdayProposalSchema.safeParse({ experienceId, dates, note });
          if (!parsed.success) return setMsg("Vérifiez votre proposition.");
          setBusy(true);
          try {
            await call("organizerProposeSaturday", parsed.data);
            setMsg("Proposition envoyée à l'équipe.");
            router.refresh();
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Envoi impossible.");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Envoi…" : "Proposer pour un samedi"}
      </button>
      {msg && <p role="status" className="text-muted">{msg}</p>}
    </div>
  );
}
