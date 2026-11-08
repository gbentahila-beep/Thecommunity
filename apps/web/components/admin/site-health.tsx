import { CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { SiteHealth } from "@/lib/data/admin-mail";
import { adminDate, Card } from "./ui";

const ISSUE_TEXT: Record<string, (i: { count?: number }) => string> = {
  backup_failed: () => "La dernière sauvegarde a échoué.",
  backup_missing: () => "Aucune sauvegarde réussie depuis plus de 36 h.",
  mail_failures: (i) => `${i.count} e-mail(s) en échec sur 24 h.`,
  transfers_overdue: (i) => `${i.count} virement(s) en retard à vérifier.`,
};
const ISSUE_LINK: Record<string, string> = { mail_failures: "/admin/emails", transfers_overdue: "/admin/virements" };

/** Carte « Santé du site » (étape E) : sauvegarde de la nuit et bilan quotidien. */
export function SiteHealthCard({ health }: { health: SiteHealth }) {
  const ok = health.issues.length === 0 && health.backup?.status === "ok";
  return (
    <Card title="Santé du site" className="mb-6">
      <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${ok ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`} data-testid="site-health">
        {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> : <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
        <div className="space-y-1">
          <p className="font-semibold">{ok ? "Tout va bien" : "À vérifier"}</p>
          <p>
            Sauvegarde : {health.backup ? (health.backup.status === "ok" ? `réussie le ${adminDate(health.backup.at ?? "")}` : `échec le ${adminDate(health.backup.at ?? "")}`) : "aucune pour l'instant (la première a lieu cette nuit à 2 h 45)"}
            {health.backup?.status === "failed" && health.backup.error?.includes("403") && " — droits manquants : voir la liste des choses à faire."}
          </p>
          {health.issues.map((i) => (
            <p key={i.code}>
              {ISSUE_TEXT[i.code]?.(i) ?? i.code}
              {ISSUE_LINK[i.code] && <> <Link href={ISSUE_LINK[i.code]!} className="font-semibold underline">Voir</Link></>}
            </p>
          ))}
          <p className="text-xs opacity-80">{health.checkedAt ? `Dernier bilan : ${adminDate(health.checkedAt)}. ` : ""}Bilan chaque matin à 8 h ; en cas de problème, les super-admins reçoivent un e-mail.</p>
        </div>
      </div>
    </Card>
  );
}
