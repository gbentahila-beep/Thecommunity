"use client";

import { sessionVenuesInputSchema, type SessionVenue } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";

type PartnerOption = { id: string; name: string; address: string; tables: number };
type Row = { partnerId: string; name: string; address: string; coords: string; tables: string };

const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand-700 disabled:bg-cream";
const toRow = (v: SessionVenue): Row => ({ partnerId: v.partnerId ?? "", name: v.name, address: v.address, coords: v.geo ? `${v.geo.lat}, ${v.geo.lng}` : "", tables: v.tables ? String(v.tables) : "" });
const emptyRow = (): Row => ({ partnerId: "", name: "", address: "", coords: "", tables: "" });

/**
 * Lieu(x) d'une date à lieu secret (docs/22, décision 15) : un ou plusieurs restaurants, choisis parmi les lieux
 * partenaires ou saisis librement, au plus tard 5 h avant. Options : appliquer aux prochaines dates, lieu habituel.
 */
export function SessionVenuesForm({ sessionId, initial, defaultVenue, partners, live, past }: { sessionId: string; initial: SessionVenue[]; defaultVenue: { name: string; address: string } | null; partners: PartnerOption[]; live: boolean; past: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.length ? initial.map(toRow) : [defaultVenue?.name ? { ...emptyRow(), name: defaultVenue.name, address: defaultVenue.address } : emptyRow()]);
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const update = (i: number, patch: Partial<Row>) => { setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x))); setState("idle"); };
  const pick = (i: number, id: string) => {
    const p = partners.find((x) => x.id === id);
    update(i, p ? { partnerId: id, name: p.name, address: p.address, tables: p.tables ? String(p.tables) : "" } : { partnerId: "" });
  };
  const call = async (name: string, data: unknown, done: string) => {
    setState("busy");
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, name)(data);
      setState("saved");
      setMessage(done);
      router.refresh();
    } catch {
      setState("error");
    }
  };
  return (
    <div className="space-y-4" data-testid="session-venues">
      {!initial.length && defaultVenue?.name && <p className="text-sm text-muted">Lieu habituel du rendez-vous : <strong className="text-ink">{defaultVenue.name}</strong>. Enregistrez pour le confirmer pour cette date, ou choisissez-en un autre.</p>}
      {rows.map((r, i) => (
        <fieldset key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2" disabled={!live}>
          <legend className="px-1 text-sm font-semibold">{rows.length > 1 ? `Lieu ${i + 1}` : "Lieu"}</legend>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium" htmlFor={`sv-partner-${i}`}>Lieu partenaire</label>
            <select id={`sv-partner-${i}`} className={input} value={r.partnerId} onChange={(e) => pick(i, e.target.value)}>
              <option value="">— Saisie libre</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}{p.tables ? ` (${p.tables} tables)` : ""}</option>)}
            </select>
          </div>
          <div><label className="mb-1 block text-sm font-medium" htmlFor={`sv-name-${i}`}>Nom</label><input id={`sv-name-${i}`} className={input} value={r.name} onChange={(e) => update(i, { name: e.target.value })} /></div>
          <div><label className="mb-1 block text-sm font-medium" htmlFor={`sv-address-${i}`}>Adresse</label><input id={`sv-address-${i}`} className={input} value={r.address} onChange={(e) => update(i, { address: e.target.value })} /></div>
          <div><label className="mb-1 block text-sm font-medium" htmlFor={`sv-coords-${i}`}>Coordonnées GPS (facultatif)</label><input id={`sv-coords-${i}`} className={input} placeholder="33.5951, -7.6187" value={r.coords} onChange={(e) => update(i, { coords: e.target.value })} /></div>
          <div><label className="mb-1 block text-sm font-medium" htmlFor={`sv-tables-${i}`}>Tables disponibles</label><input id={`sv-tables-${i}`} className={input} inputMode="numeric" value={r.tables} onChange={(e) => update(i, { tables: e.target.value })} /></div>
          {rows.length > 1 && (
            <button type="button" onClick={() => setRows((x) => x.filter((_, k) => k !== i))} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-800 sm:col-span-2">
              <Trash2 className="size-4" aria-hidden /> Retirer ce lieu
            </button>
          )}
        </fieldset>
      ))}
      {live && rows.length < 5 && (
        <button type="button" onClick={() => setRows((x) => [...x, emptyRow()])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-900">
          <Plus className="size-4" aria-hidden /> Ajouter un restaurant (pas assez de tables dans un seul lieu)
        </button>
      )}
      {rows.length > 1 && <p className="text-xs text-muted">Les tables sont réparties dans l&apos;ordre : Table 1, Table 2… remplissent le lieu 1 selon ses tables disponibles, puis le lieu 2.</p>}
      {live && (
        <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={applyToFuture} onChange={(e) => setApplyToFuture(e.target.checked)} className="size-4 accent-brand-900" /> Utiliser ce lieu pour toutes les prochaines dates (celles qui n&apos;en ont pas encore)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="size-4 accent-brand-900" /> En faire le lieu habituel du rendez-vous</label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={state === "busy"}
              onClick={() => {
                const data = { sessionId, venues: rows.filter((r) => r.name.trim() || r.address.trim()).map((r) => ({ partnerId: r.partnerId, name: r.name, address: r.address, coords: r.coords, ...(r.tables ? { tables: r.tables } : {}) })), applyToFuture, makeDefault };
                if (!sessionVenuesInputSchema.safeParse(data).success) return setState("error");
                void call("adminSetSessionVenues", data, "Lieux enregistrés.");
              }}
              className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {state === "busy" ? "Enregistrement…" : "Enregistrer le lieu"}
            </button>
            {state === "saved" && <p role="status" className="text-sm text-emerald-800">{message}</p>}
            {state === "error" && <p role="alert" className="text-sm text-red-800">Nom et adresse obligatoires pour chaque lieu (ou enregistrement impossible).</p>}
          </div>
        </>
      )}
      {!live && <p className="text-xs text-muted">Démonstration : les lieux s&apos;enregistrent sur le site en ligne.</p>}
      {past && live && initial.length > 0 && (
        <div className="rounded-xl bg-cream p-3 text-sm" data-testid="venue-review">
          <p className="font-semibold text-ink">Après la date : comment ça s&apos;est passé ?</p>
          <ul className="mt-2 space-y-2">
            {initial.map((v, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{v.name}</span>
                {v.rating && <span className="text-muted">({v.rating === "good" ? "bien" : "à revoir"})</span>}
                <button type="button" onClick={() => call("adminSessionVenueAction", { sessionId, index: i, action: "rate", rating: "good" }, `${v.name} : noté « bien ».`)} className="rounded-full border border-line px-3 py-1">Bien</button>
                <button type="button" onClick={() => call("adminSessionVenueAction", { sessionId, index: i, action: "rate", rating: "bad" }, `${v.name} : noté « à revoir ».`)} className="rounded-full border border-line px-3 py-1">À revoir</button>
                <button type="button" onClick={() => call("adminSessionVenueAction", { sessionId, index: i, action: "default" }, `${v.name} est maintenant le lieu habituel.`)} className="rounded-full bg-brand-900 px-3 py-1 font-semibold text-white">En faire le lieu habituel</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
