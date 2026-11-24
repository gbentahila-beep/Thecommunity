import { connection } from "next/server";
import { RendezvousForm, WEEKDAYS, type RendezvousFormValues } from "@/components/admin/rendezvous-form";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Rendez-vous" };

type Rv = { id: string; title: { fr: string; ar?: string; en?: string }; cityId: string; weekday: number; time: string; capacity: number; status: "active" | "paused"; baseExperienceId: string; tiers: { tier: "casual" | "premium" | "exclusive"; experienceId: string; frequency: "weekly" | "first_of_month" }[] };

/** docs/25 — les rendez-vous de la semaine : un jour fixe, une expérience par gamme, des dates créées toutes seules. */
export default async function RendezvousAdminPage() {
  await connection();
  const d = await getAdminData();
  let list: Rv[] = [];
  if (FIREBASE_ENABLED) {
    await requireAdmin();
    const snap = await adminDb().collection("rendezvous").get();
    list = snap.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Rv, "id">) }));
  }
  const experiences = [...d.experiences.values()]
    .filter((e) => e.status !== "archived" && !(e as { rendezvousId?: string | null }).rendezvousId)
    .map((e) => ({ id: e.id, label: `${e.title.fr}${e.venueTier ? ` · ${e.venueTier}` : ""}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const empty: RendezvousFormValues = { titleFr: "", titleAr: "", titleEn: "", cityId: "casablanca", weekday: 3, time: "20:30", capacity: "36", baseExperienceId: "", tiers: { casual: "weekly", premium: "weekly", exclusive: "first_of_month" }, status: "active" };
  const toValues = (r: Rv): RendezvousFormValues => ({ id: r.id, titleFr: r.title.fr, titleAr: r.title.ar ?? "", titleEn: r.title.en ?? "", cityId: r.cityId, weekday: r.weekday, time: r.time, capacity: String(r.capacity), baseExperienceId: r.baseExperienceId, tiers: Object.fromEntries(r.tiers.map((t) => [t.tier, t.frequency])), status: r.status });
  return (
    <>
      <PageHeader title="Rendez-vous de la semaine" subtitle="Un jour fixe, une gamme choisie à la réservation, des dates créées 6 semaines à l'avance." />
      <Card className="mb-6">
        <details open={list.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-brand-900">+ Nouveau rendez-vous</summary>
          <div className="mt-4"><RendezvousForm initial={empty} experiences={experiences} live={FIREBASE_ENABLED} /></div>
        </details>
      </Card>
      {list.map((r) => (
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
