import { ageOn } from "@thecommunity/shared";
import Link from "next/link";
import { INTEREST_LABELS } from "@/components/admin/labels";
import { UserActions } from "@/components/admin/user-actions";
import { adminDate, Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Utilisateurs" };

const ROLE = { user: ["Membre", "gray"], organizer: ["Organisateur", "amber"], admin: ["Admin", "plum"], superadmin: ["Super-admin", "plum"] } as const;

export default async function UsersAdminPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const d = await getAdminData();
  const count = (uid: string) => d.reservations.filter((r) => r.userId === uid && r.status === "confirmed").length;
  const users = d.users.filter((u) => !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q));
  return (
    <>
      <PageHeader title="Utilisateurs" subtitle={`${users.length} membre${users.length > 1 ? "s" : ""}`} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="q">Rechercher</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nom ou e-mail…" className="min-w-64 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm" />
        <button className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white">Rechercher</button>
        {q && <Link href="/admin/utilisateurs" className="self-center text-sm text-muted underline">Effacer</Link>}
      </form>
      <Card>
        <Table head={["Membre", "Âge", "Centres d'intérêt", "Réservations", "Inscrit le", "Rôle", "Statut", ...(d.isDemo ? [] : ["Actions"])]} caption="Utilisateurs">
          {users.map((u) => (
            <tr key={u.uid}>
              <td><span className="block font-medium text-ink">{u.firstName} {u.lastName}</span><span className="text-xs text-muted">{u.email} · {u.phone}</span></td>
              <td className="tabular-nums">{u.birthDate ? ageOn(u.birthDate) : "—"}</td>
              <td className="text-xs text-muted">{u.interests.map((i) => INTEREST_LABELS[i]).join(", ")}</td>
              <td className="tabular-nums">{count(u.uid)}</td>
              <td className="whitespace-nowrap text-muted">{adminDate(u.createdAt, false)}</td>
              <td><Badge tone={ROLE[u.role][1]}>{ROLE[u.role][0]}</Badge></td>
              <td><Badge tone={u.status === "active" ? "green" : "red"}>{u.status === "active" ? "Actif" : "Suspendu"}</Badge></td>
              {!d.isDemo && (
                <td>
                  <UserActions uid={u.uid} role={u.role} status={u.status} canSetRole={d.admin?.role === "superadmin"} isSelf={d.admin?.uid === u.uid} />
                </td>
              )}
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-muted">{d.isDemo ? "Mode démonstration : actions désactivées." : "Changer un rôle (super-admin uniquement) ou suspendre un compte : actions vérifiées par le serveur et journalisées."}</p>
      </Card>
    </>
  );
}
