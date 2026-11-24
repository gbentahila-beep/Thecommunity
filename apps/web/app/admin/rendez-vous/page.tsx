import Link from "next/link";
import { localDayKey, mergeTemplates, rotationDays, rotationDeadline, rotationPlan, rotationWindows, type RotationEntry, type RotationOverride } from "@thecommunity/shared";
import { connection } from "next/server";
import { RendezvousForm, WEEKDAYS, type RendezvousFormValues } from "@/components/admin/rendezvous-form";
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

/** docs/25 — les rendez-vous de la semaine : un jour fixe, une expérience par gamme, des dates créées toutes seules. */
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
  // Lot D : l'activité du samedi (rotation) — activités possibles, programme des 8 prochains samedis.
  const rotations = list.filter((r) => r.kind === "rotation");
  const tiersList = list.filter((r) => r.kind !== "rotation");
  const tpl = new Map(mergeTemplates([]).map((t) => [t.id, t]));
  const activities: ActivityOption[] = [...d.experiences.values()]
    // Seul l'univers Activités alimente l'activité du samedi (les Événements ont leurs propres dates).
    .filter((e) => e.status === "published" && e.categoryId === "move" && (!e.rendezvousId || e.rendezvousKind === "rotation"))
    .map((e) => {
      const t = tpl.get(String((e as { templateId?: string }).templateId ?? ""));
      return { id: e.id, label: `${e.title.fr}${e.venue?.name ? ` · ${e.venue.name}` : e.district ? ` · ${e.district}` : ""}`, time: t?.values.time ?? "10:00", capacity: t?.values.capacity ?? 12 };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const label = (id: string) => d.experiences.get(id)?.title.fr ?? id;
  const weeks = new Map<string, WeekRow[]>();
  for (const r of rotations) {
    const plan = rotationPlan({ weekday: r.weekday, anchor: r.anchor ?? "", cycle: r.cycle ?? [], overrides: r.overrides ?? {} }, rotationDays(r.weekday, new Date(), 8));
    const sessions = FIREBASE_ENABLED ? (await adminDb().collection("sessions").where("rendezvousId", "==", r.id).where("startAt", ">", new Date()).get()).docs.filter((x) => x.get("status") !== "cancelled") : [];
    const windows = rotationWindows(plan, new Date());
    const fmt = (x: Date) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Casablanca" }).format(x).replace(":", "h");
    weeks.set(r.id, plan.map((w) => {
      const win = windows.get(w.date);
      const deadline = rotationDeadline(win);
      const opens = !w.entry ? "" : !win || win.state === "open" ? "Ouvert aux réservations" : win.state === "pass" ? `Ouvert aux abonnés Pass · à tous le ${fmt(win.opensAt!)}` : `S'ouvre le ${fmt(win.passOpensAt ?? win.opensAt!)} (Pass), le ${fmt(win.opensAt!)} pour tous`;
      const day = sessions.filter((x) => localDayKey(x.get("startAt").toDate()) === w.date);
      const mine = day.find((x) => x.get("experienceId") === w.entry?.experienceId);
      return {
        date: w.date,
        label: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${w.date}T12:00:00Z`)),
        source: w.source,
        experienceId: w.entry?.experienceId ?? null,
        activity: w.entry ? label(w.entry.experienceId) : "Pas d'activité",
        time: w.entry?.time ?? "10:00",
        capacity: w.entry?.capacity ?? 12,
        shift: w.shift,
        note: w.note,
        booked: Number(mine?.get("seatsConfirmed") ?? 0),
        conflicts: day.filter((x) => x.get("experienceId") !== w.entry?.experienceId).map((x) => `${label(String(x.get("experienceId")))} (${x.get("seatsConfirmed") ?? 0} inscrit(s))`),
        opens,
        deadline: deadline ? `à choisir avant le ${fmt(deadline)}` : "",
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
  const emptyRotation: RotationFormValues = { titleFr: "L'activité du samedi", titleAr: "نشاط السبت", titleEn: "Saturday Activity", cityId: "casablanca", anchor: rotationDays(6, new Date(), 1)[0]!, status: "active", cycle: [] };
  const experiences = [...d.experiences.values()]
    .filter((e) => e.status !== "archived" && !(e as { rendezvousId?: string | null }).rendezvousId)
    .map((e) => ({ id: e.id, label: `${e.title.fr}${e.venueTier ? ` · ${e.venueTier}` : ""}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const empty: RendezvousFormValues = { titleFr: "", titleAr: "", titleEn: "", cityId: "casablanca", weekday: 3, time: "20:30", capacity: "36", baseExperienceId: "", tiers: { casual: "weekly", premium: "weekly", exclusive: "first_of_month" }, status: "active" };
  const toValues = (r: Rv): RendezvousFormValues => ({ id: r.id, titleFr: r.title.fr, titleAr: r.title.ar ?? "", titleEn: r.title.en ?? "", cityId: r.cityId, weekday: r.weekday, time: r.time, capacity: String(r.capacity), baseExperienceId: r.baseExperienceId, tiers: Object.fromEntries(r.tiers.map((t) => [t.tier, t.frequency])), status: r.status });
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/experiences" className="text-brand-900">← Événements</Link></p>
      <PageHeader title="Rendez-vous de la semaine" subtitle="Un jour fixe, une gamme choisie à la réservation, des dates créées 6 semaines à l'avance." />
      <Card className="mb-6" title="Calendrier de lancement">
        <details open={!launchedAt}>
          <summary className="cursor-pointer text-sm font-semibold text-brand-900">{launchedAt ? "Bascule faite : voir le détail" : "Passer au calendrier de lancement (docs/25)"}</summary>
          <div className="mt-3"><RendezvousLaunch canRun={canLaunch} reason={d.isDemo || !FIREBASE_ENABLED ? "demo" : canLaunch ? null : "role"} doneAt={launchedAt} /></div>
        </details>
      </Card>
      <Card className="mb-6">
        <details open={list.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-brand-900">+ Nouveau rendez-vous</summary>
          <div className="mt-4"><RendezvousForm initial={empty} experiences={experiences} live={FIREBASE_ENABLED} /></div>
        </details>
      </Card>
      {rotations.map((r) => (
        <Card key={r.id} className="mb-4">
          <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="rotation-card">
            <h2 className="text-lg font-semibold text-ink">{r.title.fr}</h2>
            <Badge tone={r.status === "active" ? "green" : "gray"}>{r.status === "active" ? "Actif" : "En pause"}</Badge>
            <span className="text-sm text-muted">{WEEKDAYS[r.weekday]} · rotation : {(r.cycle ?? []).map((c) => label(c.experienceId)).join(" → ")}</span>
          </div>
          <p className="text-sm text-muted">Les 8 prochains samedis. Un samedi s&apos;ouvre aux réservations quand le précédent ferme (vendredi 20h30), une semaine plus tôt pour les abonnés Pass. Avant son ouverture, vous pouvez changer son activité librement ; l&apos;équipe reçoit un rappel 48 h avant.</p>
          <details className="my-3 rounded-xl bg-cream p-3 text-sm" data-testid="saturday-howto">
            <summary className="cursor-pointer font-semibold text-brand-900">Ajouter une nouvelle activité (ex. un cours de Pilates)</summary>
            <ol className="mt-2 list-decimal space-y-1 ps-5">
              <li><Link href="/admin/experiences/nouvelle" className="text-brand-900 underline">Créez l&apos;événement</Link> dans l&apos;univers <strong>Activités</strong> (modèle ou page blanche), publié. Pas de date à saisir : elle vient de ce planning.</li>
              <li>Sur sa fiche, carte « Activité du samedi » : <strong>Ajouter à la rotation</strong> (elle revient à son tour) ou <strong>Programmer un samedi</strong> (une seule fois).</li>
              <li>Ou ici : « Changer ce samedi » sur la ligne voulue, puis choisissez l&apos;activité, l&apos;heure et les places.</li>
            </ol>
            <p className="mt-2 text-muted">Un organisateur propose son activité depuis son espace : sa proposition apparaît ci-dessous, à accepter pour un samedi.</p>
          </details>
          {proposals.filter((p) => p.cityId === r.cityId).length > 0 && (
            <div className="my-3 rounded-xl bg-brand-50 p-3" data-testid="saturday-proposals">
              <p className="text-sm font-semibold text-brand-900">Propositions des organisateurs</p>
              <ul className="divide-y divide-brand-100">
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
          <ul className="divide-y divide-line">
            {(weeks.get(r.id) ?? []).map((w) => <RotationWeek key={w.date} rotationId={r.id} row={w} activities={activities} live={FIREBASE_ENABLED} />)}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">Modifier la rotation (ordre, heures, places)</summary>
            <div className="mt-4"><RotationForm initial={rotationValues(r)} activities={activities} live={FIREBASE_ENABLED} /></div>
          </details>
        </Card>
      ))}
      {rotations.length === 0 && (
        <Card className="mb-6">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">+ Créer l&apos;activité du samedi (rotation)</summary>
            <div className="mt-4"><RotationForm initial={emptyRotation} activities={activities} live={FIREBASE_ENABLED} /></div>
          </details>
        </Card>
      )}
      {tiersList.map((r) => (
        <Card key={r.id} className="mb-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{r.title.fr}</h2>
            <Badge tone={r.status === "active" ? "green" : "gray"}>{r.status === "active" ? "Actif" : "En pause"}</Badge>
            <span className="text-sm text-muted">{WEEKDAYS[r.weekday]} · {r.time} · {r.tiers.map((t) => `${t.tier}${t.frequency === "first_of_month" ? " (1er du mois)" : ""}`).join(", ")}</span>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">Modifier</summary>
            <div className="mt-4"><RendezvousForm initial={toValues(r)} experiences={[...experiences, { id: r.baseExperienceId, label: d.experiences.get(r.baseExperienceId)?.title.fr ?? r.baseExperienceId }]} live={FIREBASE_ENABLED} /></div>
          </details>
        </Card>
      ))}
    </>
  );
}
