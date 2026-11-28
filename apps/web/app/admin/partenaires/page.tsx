import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { ApplicationActions } from "@/components/admin/application-actions";
import { PARTNER_STATUS_LABELS, PARTNER_STATUS_TONES, PARTNER_TYPE_LABELS } from "@/components/admin/partner-labels";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getPartnerApplications } from "@/lib/data/admin-help";
import { insuranceState, mergeTemplates } from "@thecommunity/shared";

export const metadata = { title: "Partenaires" };

const TIERS = [["casual", "Casual"], ["premium", "Premium"], ["exclusive", "Exclusive"]] as const;
const SORTS = [["nom", "Nom"], ["capacite", "Capacité"], ["fiabilite", "Fiabilité"], ["demandes", "Demandes reçues"]] as const;
const FORMAT_NAMES = new Map(mergeTemplates([]).map((t) => [t.id, t.name]));
const fmt = (id: string) => FORMAT_NAMES.get(id) ?? id;

/**
 * Refonte UX du 25/11 : les partenaires en liste, triable et filtrable (recherche, gamme, format, quartier, statut,
 * lieux réels ou de démonstration), au lieu de blocs. Chaque ligne dit l'essentiel pour l'attribution : gammes,
 * formats, capacité par soir, fiabilité (demandes acceptées). Les candidatures sont en haut quand il y en a à traiter.
 */
export default async function PartnersAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const vue = one("vue") === "archived" ? "archived" : "current";
  const q = one("q").trim().toLowerCase();
  const tier = one("gamme");
  const format = one("format");
  const district = one("quartier");
  const origin = one("origine"); // "" | "reels" | "demo"
  const sort = (SORTS.find(([k]) => k === one("tri"))?.[0] ?? "nom") as (typeof SORTS)[number][0];
  const [d, { applications, isDemo }] = await Promise.all([getAdminData(), getPartnerApplications()]);
  const pending = applications.filter((a) => a.status === "new");

  type P = (typeof d.partners)[number] & { isDemo?: boolean; source?: string };
  const capacity = (p: P) => Math.max(0, ...(p.slots ?? []).map((s) => s.units));
  const reliability = (p: P) => (p.stats?.requests ? (p.stats.accepted ?? 0) / p.stats.requests : null);
  const demoOf = (p: P) => Boolean(p.isDemo) || p.source === "demo" || p.source === "essai";
  const base = (d.partners as P[]).filter((p) => (vue === "archived" ? p.status === "archived" : p.status !== "archived"));
  const list = base
    .filter((p) => !q || `${p.name} ${p.district ?? ""} ${p.cuisine ?? ""} ${p.contactName ?? ""}`.toLowerCase().includes(q))
    .filter((p) => !tier || (p.tiers ?? []).includes(tier as never))
    .filter((p) => !format || (p.formats ?? []).includes(format))
    .filter((p) => !district || p.district === district)
    .filter((p) => !origin || (origin === "demo" ? demoOf(p) : !demoOf(p)))
    .sort((a, b) =>
      sort === "capacite" ? capacity(b) - capacity(a)
      : sort === "fiabilite" ? (reliability(b) ?? -1) - (reliability(a) ?? -1)
      : sort === "demandes" ? (b.stats?.requests ?? 0) - (a.stats?.requests ?? 0)
      : a.name.localeCompare(b.name, "fr"));
  const formats = [...new Set(base.flatMap((p) => p.formats ?? []))].sort((a, b) => fmt(a).localeCompare(fmt(b), "fr"));
  const districts = [...new Set(base.map((p) => p.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const countTier = (t: string) => base.filter((p) => (p.tiers ?? []).includes(t as never)).length;
  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams(Object.entries({ vue: vue === "archived" ? "archived" : "", q, gamme: tier, format, quartier: district, origine: origin, tri: sort === "nom" ? "" : sort, ...patch }).filter(([, v]) => v));
    const s = params.toString();
    return `/admin/partenaires${s ? `?${s}` : ""}`;
  };
  const select = "rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-700";

  return (
    <>
      <PageHeader
        title="Partenaires"
        subtitle={`${base.length} lieu${base.length > 1 ? "x" : ""}${vue === "archived" ? " archivé(s)" : ""} · ${pending.length} candidature(s) à traiter`}
        actions={
          <Link href="/admin/partenaires/nouveau" className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            <Plus className="size-4" aria-hidden /> Nouveau partenaire
          </Link>
        }
      />
      {sp.supprime === "1" && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Partenaire supprimé.</p>}

      {!isDemo && applications.length > 0 && (
        <details className="mb-6 rounded-2xl bg-white p-4 shadow-card sm:p-5" open={pending.length > 0}>
          <summary className="cursor-pointer text-base font-semibold text-ink">Candidatures « Devenir partenaire » {pending.length > 0 && <Badge tone="amber">{pending.length} à traiter</Badge>}</summary>
          <ul className="mt-3 divide-y divide-line">
            {applications.map((a) => (
              <li key={a.id} className={`py-4 ${a.status !== "new" ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {a.businessName} <span className="font-normal text-muted">· {PARTNER_TYPE_LABELS[a.type] ?? a.type} · {a.city}</span>{" "}
                    {a.status === "converted" && <Badge tone="green">Partenaire créé</Badge>}
                    {a.status === "declined" && <Badge tone="gray">Écartée</Badge>}
                  </p>
                  <span className="text-xs text-muted">{a.createdAt ? adminDate(a.createdAt) : ""}</span>
                </div>
                <p className="mt-1 text-sm">
                  {a.contactName} · <a href={`mailto:${a.email}`} className="text-brand-900 underline">{a.email}</a>
                  {a.phone && <> · <a href={`tel:${a.phone}`} className="text-brand-900 underline">{a.phone}</a></>}
                  {a.link && <> · <span className="break-all">{a.link}</span></>}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink/85">{a.message}</p>
                <div className="mt-3"><ApplicationActions applicationId={a.id} status={a.status} partnerId={a.partnerId} /></div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Gammes en un clic, puis recherche et filtres. */}
      <nav aria-label="Gammes" className="mb-3 flex flex-wrap gap-2">
        <Link href={href({ gamme: "" })} aria-current={!tier ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium ${!tier ? "bg-brand-900 text-white" : "bg-white text-ink hover:bg-cream"}`}>Toutes <span className="opacity-70">{base.length}</span></Link>
        {TIERS.map(([k, label]) => (
          <Link key={k} href={href({ gamme: k })} aria-current={tier === k ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium ${tier === k ? "bg-brand-900 text-white" : "bg-white text-ink hover:bg-cream"}`}>{label} <span className="opacity-70">{countTier(k)}</span></Link>
        ))}
        <Link href={href({ vue: vue === "archived" ? "" : "archived" })} className="ms-auto rounded-full px-4 py-2 text-sm font-medium text-brand-900 underline">{vue === "archived" ? "Voir les lieux actifs" : "Voir les archivés"}</Link>
      </nav>
      <form method="get" action="/admin/partenaires" className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 shadow-card" data-testid="partner-filters">
        {vue === "archived" && <input type="hidden" name="vue" value="archived" />}
        {tier && <input type="hidden" name="gamme" value={tier} />}
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 focus-within:border-brand-700">
          <Search className="size-4 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Nom, quartier, cuisine, contact…" className="w-full bg-transparent text-sm outline-none" aria-label="Rechercher" />
        </label>
        <select name="format" defaultValue={format} className={select} aria-label="Format">
          <option value="">Tous les formats</option>
          {formats.map((f) => <option key={f} value={f}>{fmt(f)}</option>)}
        </select>
        <select name="quartier" defaultValue={district} className={select} aria-label="Quartier">
          <option value="">Tous les quartiers</option>
          {districts.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select name="origine" defaultValue={origin} className={select} aria-label="Origine">
          <option value="">Réels et démo</option>
          <option value="reels">Lieux réels</option>
          <option value="demo">Lieux de démo</option>
        </select>
        <select name="tri" defaultValue={sort} className={select} aria-label="Trier par">
          {SORTS.map(([k, label]) => <option key={k} value={k}>Trier : {label}</option>)}
        </select>
        <button type="submit" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">Filtrer</button>
        {(q || format || district || origin || sort !== "nom") && <Link href={href({ q: "", format: "", quartier: "", origine: "", tri: "" })} className="px-2 py-2 text-sm text-muted underline">Effacer</Link>}
      </form>

      <Card>
        <p className="mb-2 text-sm text-muted" data-testid="partner-count">{list.length} lieu{list.length > 1 ? "x" : ""}{list.length !== base.length ? ` sur ${base.length}` : ""}</p>
        {list.length === 0 ? (
          <p className="text-sm text-muted">Aucun lieu ne correspond. <Link href={href({ q: "", format: "", quartier: "", origine: "", gamme: "" })} className="text-brand-900 underline">Tout afficher</Link></p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-3 py-2 text-start font-medium">Lieu</th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">Gammes</th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">Formats</th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">Tables / soir</th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">Fiabilité</th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">Statut</th>
                  <th scope="col" className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70" data-testid="partner-list">
                {list.map((p) => {
                  const rel = reliability(p);
                  const cap = capacity(p);
                  return (
                    <tr key={p.id} className="hover:bg-cream/60">
                      <td className="px-3 py-2.5">
                        <Link href={`/admin/partenaires/${p.id}`} className="font-semibold text-ink hover:text-brand-900">{p.name}</Link>
                        <span className="block text-xs text-muted">{[PARTNER_TYPE_LABELS[p.type] ?? p.type, p.district, p.cuisine].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="px-3 py-2.5"><span className="flex flex-wrap gap-1">{(p.tiers ?? []).length ? (p.tiers ?? []).map((t) => <Badge key={t} tone={t === "exclusive" ? "brand" : "gray"}>{t.charAt(0).toUpperCase() + t.slice(1)}</Badge>) : <span className="text-xs text-amber-800">À compléter</span>}</span></td>
                      <td className="px-3 py-2.5 text-ink/80">{(p.formats ?? []).map(fmt).join(", ") || <span className="text-xs text-amber-800">À compléter</span>}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{cap || "—"}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{rel === null ? <span className="text-xs text-muted">aucune demande</span> : <span title={`${p.stats?.accepted ?? 0} acceptée(s) sur ${p.stats?.requests ?? 0}`}>{Math.round(rel * 100)} %</span>}</td>
                      <td className="px-3 py-2.5"><span className="flex flex-wrap gap-1"><Badge tone={PARTNER_STATUS_TONES[p.status]}>{PARTNER_STATUS_LABELS[p.status]}</Badge>{demoOf(p) && <Badge tone="gray">Démo</Badge>}{p.type !== "restaurant" && ["expired", "expiring"].includes(insuranceState(p.insurance, d.now)) && <Badge tone="red">Assurance {insuranceState(p.insurance, d.now) === "expired" ? "expirée" : "bientôt expirée"}</Badge>}</span></td>
                      <td className="px-1"><Link href={`/admin/partenaires/${p.id}`} aria-label={`Ouvrir ${p.name}`}><ChevronRight className="size-4 text-muted" aria-hidden /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
