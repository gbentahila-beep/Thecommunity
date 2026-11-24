import { CalendarPlus, Repeat, Settings2 } from "lucide-react";
import Link from "next/link";
import { localDayKey, mergeTemplates, rotationDays, rotationDeadline, rotationPlan, rotationWindows, type RotationEntry, type RotationOverride } from "@thecommunity/shared";
import { connection } from "next/server";
import { RendezvousForm, type RendezvousFormValues } from "@/components/admin/rendezvous-form";
import { RendezvousLaunch } from "@/components/admin/rendezvous-launch";
import { OrganizerRequestActions } from "@/components/admin/organizer-actions";
import { RotationForm, RotationWeek, type ActivityOption, type RotationFormValues, type WeekRow } from "@/components/admin/rotation-form";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Rendez-vous" };

type Rotation = { kind?: "rotation"; anchor?: string; cycle?: RotationEntry[]; overrides?: Record<string, RotationOverride>; weeksAhead?: number };
type Rv = Rotation & { id: string; title: { fr: string; ar?: string; en?: string }; cityId: string; weekday: number; time: string; capacity: number; status: "active" | "paused"; baseExperienceId: string; tiers: { tier: "casual" | "premium" | "exclusive"; experienceId: string; frequency: "weekly" | "first_of_month" }[] };

const TIER = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" } as const;
// (Constante locale : une constante importée d'un composant client n'est pas lisible côté serveur.)
const DAYS = ["dimanches", "lundis", "mardis", "mercredis", "jeudis", "vendredis", "samedis"];
const fmt = (x: Date) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Casablanca" }).format(x).replace(":", "h");
const fmtDay = (x: Date | string) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Casablanca" }).format(new Date(x));

/**
 * Refonte UX du 25/11 : tout ce qui revient chaque semaine, sur une page. En haut, une carte par rendez-vous (quand,
 * gammes, places, prochaine date et son remplissage) ; puis le planning des samedis, lisible d'un coup d'œil (état de
 * chaque samedi : ouvert, Pass, s'ouvre le…). Les réglages rares (nouveau rendez-vous, lancement) sont en bas.
 */
export default async function RendezvousAdminPage() {
  await connection();
  const d = await getAdminData();
  let list: Rv[] = [];
  let launchedAt: string | null = null;
  if (FIREBASE_ENABLED) {
    await requireAdmin();
    const [snap, flag] = await Promise.all([adminDb().collection("rendezvous").get(), adminDb().doc("settings/showcase").get()]);
    // Du lundi au dimanche, puis par heure.
    list = snap.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Rv, "id">) })).sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.time.localeCompare(b.time));
    const at = flag.get("rendezvousLaunchAt") as { toDate(): Date } | undefined;
    launchedAt = at ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(at.toDate()) : null;
  }
  const canLaunch = FIREBASE_ENABLED && !d.isDemo && d.admin?.role === "superadmin";
  const rotations = list.filter((r) => r.kind === "rotation");
  const tiersList = list.filter((r) => r.kind !== "rotation");
  const tpl = new Map(mergeTemplates([]).map((t) => [t.id, t]));
  // Seul l'univers Activités alimente l'activité du samedi (les Événements ont leurs propres dates).
  const activities: ActivityOption[] = [...d.experiences.values()]
    .filter((e) => e.status === "published" && e.categoryId === "move" && (!e.rendezvousId || e.rendezvousKind === "rotation"))
    .map((e) => {
      const t = tpl.get(String((e as { templateId?: string }).templateId ?? ""));
      return { id: e.id, label: `${e.title.fr}${e.venue?.name ? ` · ${e.venue.name}` : e.district ? ` · ${e.district}` : ""}`, time: t?.values.time ?? "10:00", capacity: t?.values.capacity ?? 12 };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const label = (id: string) => d.experiences.get(id)?.title.fr ?? id;
  const now = new Date();
  const weeks = new Map<string, WeekRow[]>();
  for (const r of rotations) {
    const plan = rotationPlan({ weekday: r.weekday, anchor: r.anchor ?? "", cycle: r.cycle ?? [], overrides: r.overrides ?? {} }, rotationDays(r.weekday, now, 8));
    const sessions = FIREBASE_ENABLED ? (await adminDb().collection("sessions").where("rendezvousId", "==", r.id).where("startAt", ">", now).get()).docs.filter((x) => x.get("status") !== "cancelled") : [];
    const windows = rotationWindows(plan, now);
    weeks.set(r.id, plan.map((w) => {
      const win = windows.get(w.date);
      const deadline = rotationDeadline(win);
      const day = sessions.filter((x) => localDayKey(x.get("startAt").toDate()) === w.date);
      const mine = day.find((x) => x.get("experienceId") === w.entry?.experienceId);
      return {
        date: w.date,
        label: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${w.date}T12:00:00Z`)),
        source: w.source,
        experienceId: w.entry?.experienceId ?? null,
        activity: w.entry ? label(w.entry.experienceId) : "Pas d'activité",
        time: w.entry?.time ?? "10:00",
        capacity: w.entry?.capacity ?? 12,
        shift: w.shift,
        note: w.note,
        booked: Number(mine?.get("seatsConfirmed") ?? 0),
        sessionId: mine?.id ?? null,
        conflicts: day.filter((x) => x.get("experienceId") !== w.entry?.experienceId).map((x) => `${label(String(x.get("experienceId")))} (${x.get("seatsConfirmed") ?? 0} inscrit(s))`),
        state: !w.entry ? "none" : !win || win.state === "open" ? "open" : win.state === "pass" ? "pass" : "later",
        opens: !w.entry || !win || win.state === "open" ? "" : win.state === "pass" ? `à tous le ${fmt(win.opensAt!)}` : `${fmt(win.passOpensAt ?? win.opensAt!)} (Pass)`,
        deadline: deadline ? `Modifiable librement jusqu'au ${fmt(deadline)}` : "",
      };
    }));
  }
  // Lot O (docs/26) : activités proposées par des organisateurs pour un samedi.
  const proposals = FIREBASE_ENABLED && !d.isDemo
    ? (await adminDb().collection("organizerRequests").where("status", "==", "pending").get()).docs
        .filter((x) => x.get("type") === "saturday")
        .map((x) => ({ id: x.id, cityId: String(x.get("cityId") ?? ""), title: String(x.get("title") ?? ""), organizerName: String(x.get("organizerName") ?? ""), dates: (x.get("dates") ?? []) as string[], note: String(x.get("note") ?? "") }))
    : [];
  const rotationValues = (r: Rv): RotationFormValues => ({ id: r.id, titleFr: r.title.fr, titleAr: r.title.ar ?? "", titleEn: r.title.en ?? "", cityId: r.cityId, anchor: r.anchor ?? "", status: r.status, cycle: (r.cycle ?? []).map((c) => ({ experienceId: c.experienceId, time: c.time, capacity: String(c.capacity) })) });
  const emptyRotation: RotationFormValues = { titleFr: "L'activité du samedi", titleAr: "نشاط السبت", titleEn: "Saturday Activity", cityId: "casablanca", anchor: rotationDays(6, now, 1)[0]!, status: "active", cycle: [] };
  const experiences = [...d.experiences.values()]
    .filter((e) => e.status !== "archived" && !(e as { rendezvousId?: string | null }).rendezvousId)
    .map((e) => ({ id: e.id, label: `${e.title.fr}${e.venueTier ? ` · ${e.venueTier}` : ""}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const empty: RendezvousFormValues = { titleFr: "", titleAr: "", titleEn: "", cityId: "casablanca", weekday: 3, time: "20:30", capacity: "36", baseExperienceId: "", tiers: { casual: "weekly", premium: "weekly", exclusive: "first_of_month" }, status: "active" };
  const toValues = (r: Rv): RendezvousFormValues => ({ id: r.id, titleFr: r.title.fr, titleAr: r.title.ar ?? "", titleEn: r.title.en ?? "", cityId: r.cityId, weekday: r.weekday, time: r.time, capacity: String(r.capacity), baseExperienceId: r.baseExperienceId, tiers: Object.fromEntries(r.tiers.map((t) => [t.tier, t.frequency])), status: r.status });
  // Prochaine date de chaque gamme (la plus proche à venir), avec son remplissage.
  const nextOf = (experienceId: string) => d.sessions.filter((s) => s.experienceId === experienceId && (s.status === "published" || s.status === "full")).sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  return (
    <>
      <PageHeader
        title="Rendez-vous"
        subtitle="Ce qui revient chaque semaine. Les dates se créent toutes seules, 6 semaines à l'avance ; une seule date est ouverte à la fois."
        actions={rotations.length > 0 ? <Link href="#samedis" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">Planning des samedis</Link> : undefined}
      />

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="rendezvous-cards">
        {tiersList.map((r) => {
          const next = r.tiers.map((t) => ({ t, s: nextOf(t.experienceId) })).filter((x) => x.s).sort((a, b) => a.s!.startAt.localeCompare(b.s!.startAt));
          const firstDay = next[0]?.s ? localDayKey(new Date(next[0].s.startAt)) : null;
          const sameDay = next.filter((x) => x.s && localDayKey(new Date(x.s.startAt)) === firstDay);
          return (
            <Card key={r.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold leading-tight text-ink">{r.title.fr}</h2>
                <Badge tone={r.status === "active" ? "green" : "gray"}>{r.status === "active" ? "Actif" : "En pause"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">Tous les {DAYS[Number(r.weekday)] ?? ""} à {r.time.replace(":", "h")} · {r.capacity} places par gamme</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {r.tiers.map((t) => <li key={t.tier}><Badge tone={t.tier === "exclusive" ? "brand" : "gray"}>{TIER[t.tier]}{t.frequency === "first_of_month" ? " · 1er du mois" : ""}</Badge></li>)}
              </ul>
              <div className="mt-4 flex-1 rounded-xl bg-cream p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Prochaine date{firstDay ? ` · ${fmtDay(sameDay[0]!.s!.startAt)}` : ""}</p>
                {sameDay.length === 0 ? <p className="mt-1 text-sm text-muted">Aucune date à venir.</p> : (
                  <ul className="mt-2 space-y-1.5">
                    {sameDay.map(({ t, s }) => (
                      <li key={t.tier}>
                        <Link href={`/admin/sessions/${s!.id}`} className="flex items-center justify-between gap-2 text-sm hover:text-brand-900">
                          <span className="font-medium">{TIER[t.tier]}</span>
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white" aria-hidden><span className="block h-full rounded-full bg-brand-700" style={{ width: `${Math.min(100, (s!.seatsConfirmed / Math.max(1, s!.capacity)) * 100)}%` }} /></span>
                            <span className="tabular-nums text-xs text-muted">{s!.seatsConfirmed}/{s!.capacity}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <details className="mt-3">
                <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-900"><Settings2 className="size-4" aria-hidden />Réglages (jour, heure, places, gammes)</summary>
                <div className="mt-3"><RendezvousForm initial={toValues(r)} experiences={[...experiences, { id: r.baseExperienceId, label: d.experiences.get(r.baseExperienceId)?.title.fr ?? r.baseExperienceId }]} live={FIREBASE_ENABLED} /></div>
              </details>
            </Card>
          );
        })}
        {rotations.map((r) => {
          const w = (weeks.get(r.id) ?? []).find((x) => x.experienceId);
          return (
            <Card key={r.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold leading-tight text-ink">{r.title.fr}</h2>
                <Badge tone={r.status === "active" ? "green" : "gray"}>{r.status === "active" ? "Actif" : "En pause"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">Tous les samedis, une activité différente</p>
              <p className="mt-3 flex flex-wrap items-center gap-1 text-sm text-ink"><Repeat className="size-4 text-emerald-700" aria-hidden />{(r.cycle ?? []).map((c) => label(c.experienceId)).join(" → ") || "Rotation vide"}</p>
              <div className="mt-4 flex-1 rounded-xl bg-cream p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Prochain samedi{w ? ` · ${w.label}` : ""}</p>
                {w ? (
                  <p className="mt-2 flex items-center justify-between text-sm">
                    {w.sessionId ? <Link href={`/admin/sessions/${w.sessionId}`} className="font-medium hover:text-brand-900">{w.activity} · {w.time.replace(":", "h")}</Link> : <span className="font-medium">{w.activity} · {w.time.replace(":", "h")}</span>}
                    <span className="tabular-nums text-xs text-muted">{w.booked}/{w.capacity}</span>
                  </p>
                ) : <p className="mt-1 text-sm text-muted">Aucune activité prévue.</p>}
              </div>
              <Link href="#samedis" className="mt-3 text-sm font-semibold text-brand-900">Voir et changer le planning ↓</Link>
            </Card>
          );
        })}
      </div>

      {rotations.map((r) => (
        <Card key={r.id} className="mb-6 scroll-mt-6" id="samedis">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3" data-testid="rotation-card">
            <h2 className="text-lg font-semibold text-ink">Planning des samedis</h2>
            <Link href="/admin/experiences/nouvelle?univers=move" className="inline-flex items-center gap-1.5 rounded-full border border-brand-900 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50"><CalendarPlus className="size-4" aria-hidden />Nouvelle activité</Link>
          </div>
          <p className="mb-4 text-sm text-muted">Un samedi s&apos;ouvre aux réservations quand le précédent ferme (vendredi 20h30), une semaine plus tôt pour les abonnés Pass. Avant, vous pouvez changer son activité sans toucher à personne ; vous recevez un rappel 48 h avant.</p>
          {proposals.filter((p) => p.cityId === r.cityId).length > 0 && (
            <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4" data-testid="saturday-proposals">
              <p className="text-sm font-semibold text-brand-900">Propositions des organisateurs ({proposals.filter((p) => p.cityId === r.cityId).length})</p>
              <ul className="mt-1 divide-y divide-brand-100">
                {proposals.filter((p) => p.cityId === r.cityId).map((p) => {
                  const rows = weeks.get(r.id) ?? [];
                  const options = [...rows.filter((w) => p.dates.includes(w.date)), ...rows.filter((w) => !p.dates.includes(w.date))].map((w) => ({ date: w.date, label: `${w.label}${p.dates.includes(w.date) ? " (souhaité)" : ""} · prévu : ${w.activity}` }));
                  return (
                    <li key={p.id} className="py-2 text-sm">
                      <p><strong>{p.title}</strong> <span className="text-muted">· {p.organizerName}{p.note ? ` · « ${p.note} »` : ""}</span></p>
                      <OrganizerRequestActions requestId={p.id} type="saturday" saturdays={options} live={FIREBASE_ENABLED} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="hidden grid-cols-[7rem_1fr_9rem_7rem] gap-3 border-b border-line px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
            <span>Samedi</span><span>Activité</span><span>Réservations</span><span className="text-end">Action</span>
          </div>
          <ul className="divide-y divide-line">
            {(weeks.get(r.id) ?? []).map((w) => <RotationWeek key={w.date} rotationId={r.id} row={w} activities={activities} live={FIREBASE_ENABLED} />)}
          </ul>
          <details className="mt-4 rounded-xl bg-cream p-4">
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">Modifier la rotation (ordre, heures, places)</summary>
            <div className="mt-4"><RotationForm initial={rotationValues(r)} activities={activities} live={FIREBASE_ENABLED} /></div>
          </details>
        </Card>
      ))}

      <details className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Réglages avancés : nouveau rendez-vous, lancement</summary>
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">+ Nouveau rendez-vous</h3>
            <RendezvousForm initial={empty} experiences={experiences} live={FIREBASE_ENABLED} />
          </div>
          {rotations.length === 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">+ Créer l&apos;activité du samedi (rotation)</h3>
              <RotationForm initial={emptyRotation} activities={activities} live={FIREBASE_ENABLED} />
            </div>
          )}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Calendrier de lancement</h3>
            <RendezvousLaunch canRun={canLaunch} reason={d.isDemo || !FIREBASE_ENABLED ? "demo" : canLaunch ? null : "role"} doneAt={launchedAt} />
          </div>
        </div>
      </details>
    </>
  );
}
