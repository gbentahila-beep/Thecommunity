import { unitWord, type VenueUnit } from "@thecommunity/shared";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PartnerResponse } from "@/components/partner/partner-response";
import { PageShell } from "@/components/ui";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { formatLongDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Demande Wenzy", robots: { index: false, follow: false } };

type Req = { id: string; partnerId: string; partnerName: string; title: string; format: string; tier: string | null; unit: VenueUnit; startAt: string; tables: number; people: number; status: string; reference: string; recap?: { tables: { label: string; names: string[] }[]; notes: string[] } | null };

const iso = (v: unknown) => (v && typeof v === "object" && "toDate" in v ? (v as { toDate: () => Date }).toDate().toISOString() : String(v ?? ""));

async function load(id: string, token: string): Promise<{ req: Req; upcoming: Req[] } | null> {
  if (!FIREBASE_ENABLED) {
    if (id !== "demo") return null;
    const start = new Date(Date.now() + 26 * 3_600_000).toISOString();
    return { req: { id, partnerId: "p", partnerName: "Restaurant partenaire Gauthier", title: "Dîner", format: "Dîner", tier: "premium", unit: "table", startAt: start, tables: 3, people: 15, status: "sent", reference: "W-DEMO01" }, upcoming: [] };
  }
  const snap = await adminDb().doc(`venueRequests/${id}`).get();
  const d = snap.data();
  if (!d || !token || d.token !== token) return null;
  const toReq = (x: FirebaseFirestore.DocumentData, rid: string): Req => ({ id: rid, partnerId: x.partnerId, partnerName: x.partnerName ?? "", title: x.title ?? "", format: x.format ?? "", tier: x.tier ?? null, unit: x.unit ?? "table", startAt: iso(x.startAt), tables: Number(x.tables ?? 0), people: Number(x.people ?? 0), status: x.status, reference: x.reference ?? "", recap: x.recap ?? null });
  const others = await adminDb().collection("venueRequests").where("partnerId", "==", d.partnerId).get();
  const now = Date.now();
  const upcoming = others.docs.filter((o) => o.id !== id && o.get("status") === "confirmed" && new Date(iso(o.get("startAt"))).getTime() > now).map((o) => toReq(o.data(), o.id)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  return { req: toReq(d, id), upcoming };
}

/**
 * Espace du lieu par lien sécurisé (docs/22 § 17.H, H7) : la demande à accepter ou refuser, les rendez-vous à venir et
 * le récapitulatif final (prénoms par table, régimes et allergies partagés). Sans compte ni mot de passe.
 */
export default async function PartnerRequestPage({ params, searchParams }: PageProps<"/[locale]/partenaire/demande/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await connection();
  const sp = await searchParams;
  const data = await load(id, typeof sp.t === "string" ? sp.t : "");
  if (!data) notFound();
  const { req, upcoming } = data;
  const when = (x: string) => `${formatLongDate(x, "fr")} à ${formatTime(x, "fr")}`;
  const tier = req.tier ? ` ${req.tier.charAt(0).toUpperCase()}${req.tier.slice(1)}` : "";
  return (
    <PageShell className="max-w-xl py-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">Wenzy · espace lieu</p>
      <h1 className="page-title mt-1">{req.partnerName}</h1>
      <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="partner-request">
        <h2 className="font-display text-2xl font-medium text-brand-900">Demande de réservation</h2>
        <p className="mt-2 text-lg font-semibold text-ink">{when(req.startAt)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-cream p-3"><p className="text-3xl font-semibold text-ink">{req.tables}</p><p className="text-sm text-muted">{unitWord(req.unit, req.tables)} demandée{req.tables > 1 ? "s" : ""}</p></div>
          <div className="rounded-2xl bg-cream p-3"><p className="text-3xl font-semibold text-ink">{req.people}</p><p className="text-sm text-muted">personne{req.people > 1 ? "s" : ""}</p></div>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-ink">
          <li>Format : {req.format}{tier}</li>
          <li>Chacun règle sa consommation sur place, sans commission Wenzy sur l&apos;addition.</li>
          <li>Référence : {req.reference}</li>
        </ul>
        <div className="mt-5">
          {req.status === "sent" ? <PartnerResponse requestId={req.id} token={typeof sp.t === "string" ? sp.t : ""} />
            : req.status === "confirmed" ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-900">Confirmé, merci ! Vous recevrez les prénoms et les allergies 1 h avant.</p>
            : req.status === "refused" ? <p className="rounded-xl bg-stone-100 px-4 py-3 text-ink">Vous avez refusé cette demande. Merci de votre réponse.</p>
            : <p className="rounded-xl bg-stone-100 px-4 py-3 text-ink">Cette demande n&apos;est plus active.</p>}
        </div>
      </section>
      {req.recap && (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="partner-recap">
          <h2 className="font-display text-2xl font-medium text-brand-900">Récapitulatif</h2>
          <ul className="mt-3 space-y-2 text-[15px]">{req.recap.tables.map((t) => <li key={t.label}><span className="font-semibold">{t.label}</span> : {t.names.join(", ")}</li>)}</ul>
          <p className="mt-3 text-sm text-ink">{req.recap.notes.length ? `Régimes et allergies : ${req.recap.notes.join(" ; ")}.` : "Aucun régime ni allergie signalé."}</p>
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="mt-6 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
          <h2 className="font-semibold text-ink">Vos prochains rendez-vous Wenzy</h2>
          <ul className="mt-2 divide-y divide-line text-sm">{upcoming.map((u) => <li key={u.id} className="py-2">{when(u.startAt)} · {u.tables} {unitWord(u.unit, u.tables)} · {u.people} pers.</li>)}</ul>
        </section>
      )}
      <p className="mt-6 text-xs text-muted">Une question, un changement ? Répondez au message WhatsApp ou appelez l&apos;équipe Wenzy.</p>
    </PageShell>
  );
}
