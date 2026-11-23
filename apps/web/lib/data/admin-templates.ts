import "server-only";
import { mergeTemplates, type EventTemplate } from "@thecommunity/shared";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * Modèles d'événements (docs/22, décision 21) : les 14 modèles livrés avec le site, remplacés ou complétés par ceux
 * enregistrés dans l'appli (collection `eventTemplates`). En démonstration : seulement ceux du site.
 */
export async function getTemplates(): Promise<EventTemplate[]> {
  return (await getTemplateState()).templates;
}

/** Modèles + identifiants de ceux enregistrés dans l'appli (modifiés ou créés). */
export async function getTemplateState(): Promise<{ templates: EventTemplate[]; savedIds: Set<string> }> {
  if (!FIREBASE_ENABLED) return { templates: mergeTemplates([]), savedIds: new Set() };
  await requireAdmin();
  const snap = await adminDb().collection("eventTemplates").get();
  const saved = snap.docs.map((d) => {
    const data = { ...d.data() };
    delete data.updatedAt;
    delete data.updatedBy;
    return { ...(data as Omit<EventTemplate, "id">), id: d.id } as EventTemplate;
  });
  return { templates: mergeTemplates(saved), savedIds: new Set(saved.map((t) => t.id)) };
}

export async function getTemplate(id: string): Promise<EventTemplate | null> {
  return (await getTemplates()).find((t) => t.id === id) ?? null;
}
