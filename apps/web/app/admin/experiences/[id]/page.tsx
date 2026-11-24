import { localDayKey, mergeTemplates, PAYMENT_MODELS, rotationDays, rotationPlan, type RotationEntry, type RotationOverride } from "@thecommunity/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddSessionsForm } from "@/components/admin/add-sessions-form";
import { ExperienceActions } from "@/components/admin/experience-actions";
import { ExperienceForm } from "@/components/admin/experience-form";
import { ExperienceReview } from "@/components/admin/organizer-actions";
import { SaturdayActivityCard, type SaturdayOption } from "@/components/admin/rotation-form";
import { adminDate, Card, FillBar, PageHeader } from "@/components/admin/ui";
import { experienceToValues, formOptions } from "@/lib/admin-forms";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { getWenzyPrice } from "@/lib/data/admin-mail";
import { getCancellationPolicies } from "@/lib/data/policies";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Modifier une expérience" };

export default async function EditExperiencePage({ params }: PageProps<"/admin/experiences/[id]">) {
  const { id } = await params;
  const [d, policies, wenzyPrice] = await Promise.all([getAdminData(), getCancellationPolicies(), getWenzyPrice()]);
  const e = d.experiences.get(id);
  if (!e) notFound();
  const sessions = d.sessions.filter((s) => s.experienceId === e.id);
  const me = d.isDemo ? null : await requireAdmin();
  // Lot O (docs/26) : modifications de l'organisateur en attente de validation (la version en ligne ne bouge pas).
  const revDoc = !d.isDemo && FIREBASE_ENABLED && e.organizerId ? (await adminDb().doc(`experiences/${e.id}/private/revision`).get()).data() : undefined;
  const revision = revDoc
    ? { changes: (revDoc.changes as string[] | undefined) ?? [], sessionsAdded: Number(revDoc.sessionsAdded ?? 0), submittedAt: revDoc.submittedAt?.toDate?.().toISOString() ?? "" }
    : null;
  const archived = e.status === "archived";
  // docs/22, décision 24 : nouvelle date une semaine après la dernière, même heure et mêmes places.
  const last = [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt)).at(-1);
  const lastStart = last ? new Date(last.startAt) : null;
  const nextDate = new Date(Math.max(d.now.getTime() + 86_400_000, (lastStart?.getTime() ?? 0) + 7 * 86_400_000));
  const addDefaults = {
    firstDate: nextDate.toISOString().slice(0, 10),
    time: lastStart ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(lastStart) : "19:30",
    capacity: String(last?.capacity ?? 12),
  };
  // Univers Activités : sa place dans l'activité du samedi (rotation de la ville), les 8 prochains samedis.
  type Rot = { id: string; cityId: string; weekday: number; anchor: string; cycle: RotationEntry[]; overrides?: Record<string, RotationOverride>; title?: { fr?: string } };
  const rotation = e.categoryId === "move" && FIREBASE_ENABLED && !d.isDemo
    ? (await adminDb().collection("rendezvous").where("kind", "==", "rotation").get()).docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Rot, "id">) })).find((r) => r.cityId === e.cityId) ?? null
    : null;
  const tpl = mergeTemplates([]).find((t) => t.id === (e as { templateId?: string }).templateId);
  const satLabel = (day: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  const plan = rotation ? rotationPlan({ weekday: rotation.weekday, anchor: rotation.anchor, cycle: rotation.cycle ?? [], overrides: rotation.overrides ?? {} }, rotationDays(rotation.weekday, d.now, 8)) : [];
  const bookedOn = (day: string) => d.sessions.filter((s) => (s as { rendezvousId?: string | null }).rendezvousId === rotation?.id && localDayKey(new Date(s.startAt)) === day).reduce((n, s) => n + s.seatsConfirmed, 0);
  const saturdays: SaturdayOption[] = plan.map((w) => ({ date: w.date, label: satLabel(w.date), planned: w.entry ? d.experiences.get(w.entry.experienceId)?.title.fr ?? "activité" : "pas d'activité", booked: bookedOn(w.date), locked: bookedOn(w.date) > 0 }));
  const mine = plan.filter((w) => w.entry?.experienceId === e.id);
  const cycleIndex = rotation ? (rotation.cycle ?? []).findIndex((c) => c.experienceId === e.id) : -1;
  const bookedSeats = sessions.filter((s) => new Date(s.startAt).getTime() > d.now.getTime()).reduce((n, s) => n + s.seatsConfirmed, 0);
  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-sm"><Link href="/admin/experiences" className="text-brand-900">← Expériences</Link></p>
      <PageHeader title={e.title.fr} subtitle="Modifiable même après publication : en cas de changement de date ou de lieu, les participants sont prévenus automatiquement (notification + e-mail)." />
      {e.organizerId && (
        <Card title={`Activité proposée par ${e.organizerSnapshot?.name ?? "un organisateur"}`} className="mb-5">
          <p className="mb-3 text-sm text-muted">
            {e.status === "pending_review" ? "Envoyée pour validation : publiez-la ou refusez-la avec un message (l'organisateur est prévenu)." : revision ? "En ligne, avec des modifications de l'organisateur en attente de validation." : e.reviewFlag ? "Publiée, puis modifiée par l'organisateur : relisez la fiche ci-dessous." : e.status === "rejected" ? `Refusée : « ${e.rejectionMessage ?? ""} »` : "Activité d'organisateur : 35 DH en ligne pour Wenzy, le prix de l'activité payé sur place à l'organisateur, sans commission."}{" "}
            <Link href={`/admin/organisateurs/${e.organizerId}`} className="font-semibold text-brand-900 underline">Voir l&apos;organisateur</Link>
          </p>
          <ExperienceReview experienceId={e.id} status={e.status} reviewFlag={Boolean(e.reviewFlag)} live={!d.isDemo} revision={revision} />
        </Card>
      )}
      {archived && (
        <p role="status" className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Expérience <strong>archivée</strong> : elle n&apos;apparaît plus sur le site. Réactivez-la pour la republier ou lui ajouter des dates.
        </p>
      )}
      <Card title={`Dates (${sessions.length})`} className="mb-5" actions={(e as { rendezvousId?: string | null }).rendezvousId ? <Link href="/admin/rendez-vous" className="text-sm font-medium text-brand-900">Créées par le rendez-vous de la semaine →</Link> : undefined}>
        {sessions.length === 0 ? <p className="text-sm text-muted">Aucune date à venir.</p> : (
          <ul className="divide-y divide-line text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>{adminDate(s.startAt)}</span>
                <FillBar value={s.seatsConfirmed} max={s.capacity} />
                <Link href={`/admin/sessions/${s.id}`} className="font-medium text-brand-900">Ouvrir la date →</Link>
              </li>
            ))}
          </ul>
        )}
        {!archived && !(e as { rendezvousId?: string | null }).rendezvousId && e.categoryId !== "move" && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand-900">+ Ajouter des dates</summary>
            <div className="mt-3"><AddSessionsForm experienceId={e.id} defaults={addDefaults} live={!d.isDemo} /></div>
          </details>
        )}
      </Card>
      {e.categoryId === "move" && (
        <Card title="Activité du samedi" className="mb-5" actions={<Link href="/admin/rendez-vous" className="text-sm font-medium text-brand-900">Planning des samedis →</Link>}>
          <p className="mb-3 text-sm text-muted">
            {!rotation ? "Les activités passent par le planning de l'activité du samedi (Programme → Rendez-vous de la semaine)." : cycleIndex >= 0
              ? `Dans la rotation : position ${cycleIndex + 1} sur ${rotation.cycle.length} (${rotation.cycle[cycleIndex]!.time.replace(":", "h")}, ${rotation.cycle[cycleIndex]!.capacity} places).`
              : "Pas dans la rotation."}
            {rotation && (mine.length ? ` Prévue le ${mine.map((w) => satLabel(w.date)).join(", ")}.` : " Aucun samedi prévu dans les 8 prochaines semaines.")}
          </p>
          {rotation && e.status === "published" && (
            <SaturdayActivityCard rotationId={rotation.id} experienceId={e.id} inCycle={cycleIndex >= 0} defaults={{ time: cycleIndex >= 0 ? rotation.cycle[cycleIndex]!.time : tpl?.values.time ?? "10:00", capacity: cycleIndex >= 0 ? rotation.cycle[cycleIndex]!.capacity : tpl?.values.capacity ?? 12 }} saturdays={saturdays} live={!d.isDemo} />
          )}
          {rotation && e.status !== "published" && <p className="text-sm text-amber-800">Publiez-la d&apos;abord (statut « Publiée » dans la fiche ci-dessous) pour pouvoir la programmer.</p>}
        </Card>
      )}
      <ExperienceForm
        mode="edit"
        live={!d.isDemo}
        experienceId={e.id}
        existingImages={e.images ?? []}
        bookedSeats={bookedSeats}
        initial={experienceToValues(e, d.economics[e.id], d.now)}
        {...formOptions(d, policies)}
        {...(wenzyPrice !== null ? { wenzyPrice } : {})}
        {...(e.organizerId ? { organizer: { orgId: e.organizerId, currentStatus: e.status, asTeam: true, models: [...PAYMENT_MODELS] } } : {})}
      />
      <Card title="Archiver ou supprimer" className="mt-8">
        <ExperienceActions id={e.id} status={e.status} canDelete={me?.role === "superadmin"} live={!d.isDemo} />
      </Card>
    </div>
  );
}
