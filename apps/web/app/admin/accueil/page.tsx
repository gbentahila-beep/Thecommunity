import { HomeSettingsForm } from "@/components/admin/home-settings-form";
import { Card, PageHeader } from "@/components/admin/ui";
import { getHomeSettingsFresh, getPublishedExperiences } from "@/lib/data";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Accueil" };

/** Étape 23 — l'équipe règle l'accueil : bannière, sections et leur ordre, coups de cœur. */
export default async function HomeAdminPage() {
  const [settings, published] = await Promise.all([getHomeSettingsFresh(), getPublishedExperiences()]);
  const experiences = published.map((e) => ({ id: e.id, title: e.title.fr })).sort((a, b) => a.title.localeCompare(b.title, "fr"));
  return (
    <>
      <PageHeader title="Accueil du site" subtitle="Bannière, sections affichées et leur ordre, activités mises en avant. Enregistré tout de suite sur le site, journalisé." />
      <Card>
        {!FIREBASE_ENABLED && <p className="mb-4 rounded-xl bg-plum-50 px-4 py-3 text-sm text-plum-900">Démonstration : vous pouvez tout essayer, rien n&apos;est enregistré.</p>}
        <HomeSettingsForm initial={settings} experiences={experiences} live={FIREBASE_ENABLED} />
      </Card>
    </>
  );
}
