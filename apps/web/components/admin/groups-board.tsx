"use client";

import { AlertTriangle, Check, GripVertical, Merge, Plus, RotateCcw, Split } from "lucide-react";
import { useMemo, useState } from "react";

export type BoardMember = {
  uid: string;
  firstName: string;
  ageBand: string;
  gender: "female" | "male" | "undisclosed";
  languages: string[];
  interests: string[];
};
export type BoardGroup = { id: string; label: string; memberIds: string[] };

const LANG: Record<string, string> = { fr: "FR", ar: "AR", darija: "Darija", en: "EN", es: "ES" };

/**
 * Composition manuelle des groupes (tables / équipes).
 * Phase 2 : modifications locales à l'écran. Phase 6 : proposition par l'algorithme de matching,
 * scores détaillés, validation enregistrée (callable admin-groups-update / validate).
 */
export function GroupsBoard({
  initial,
  members,
  config,
  interestLabels,
  prefix,
}: {
  initial: BoardGroup[];
  members: Record<string, BoardMember>;
  config: { minSize: number; targetSize: number; maxSize: number };
  interestLabels: Record<string, string>;
  prefix: string;
}) {
  const [groups, setGroups] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [mergeA, setMergeA] = useState("");
  const [mergeB, setMergeB] = useState("");
  const [status, setStatus] = useState("");

  const move = (uid: string, to: string) => {
    setGroups((gs) => gs.map((g) => ({ ...g, memberIds: g.id === to ? [...g.memberIds.filter((m) => m !== uid), uid] : g.memberIds.filter((m) => m !== uid) })));
    const target = groups.find((g) => g.id === to);
    setStatus(`${members[uid]?.firstName} déplacé·e vers ${target?.label}.`);
  };

  const nextLabel = (gs: BoardGroup[]) => `${prefix} ${gs.length + 1}`;
  const addGroup = () => setGroups((gs) => [...gs, { id: `new-${Date.now()}`, label: nextLabel(gs), memberIds: [] }]);
  const split = (id: string) =>
    setGroups((gs) => {
      const g = gs.find((x) => x.id === id);
      if (!g || g.memberIds.length < 2) return gs;
      const half = Math.ceil(g.memberIds.length / 2);
      return [...gs.map((x) => (x.id === id ? { ...x, memberIds: g.memberIds.slice(0, half) } : x)), { id: `split-${Date.now()}`, label: nextLabel(gs), memberIds: g.memberIds.slice(half) }];
    });
  const merge = () => {
    if (!mergeA || !mergeB || mergeA === mergeB) return;
    setGroups((gs) => {
      const b = gs.find((g) => g.id === mergeB);
      return gs.filter((g) => g.id !== mergeB).map((g) => (g.id === mergeA ? { ...g, memberIds: [...g.memberIds, ...(b?.memberIds ?? [])] } : g));
    });
    setMergeB("");
  };
  const removeEmpty = (id: string) => setGroups((gs) => gs.filter((g) => g.id !== id || g.memberIds.length > 0));

  const analysis = useMemo(
    () =>
      Object.fromEntries(
        groups.map((g) => {
          const ms = g.memberIds.map((id) => members[id]).filter(Boolean) as BoardMember[];
          const common = ms.length ? Object.keys(LANG).filter((l) => ms.every((m) => m.languages.includes(l))) : [];
          const bands = [...new Set(ms.map((m) => m.ageBand))].sort();
          const counts = new Map<string, number>();
          ms.forEach((m) => m.interests.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1)));
          const shared = [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => i);
          const women = ms.filter((m) => m.gender === "female").length;
          const men = ms.filter((m) => m.gender === "male").length;
          const warnings: string[] = [];
          if (ms.length < config.minSize) warnings.push(`moins de ${config.minSize} personnes`);
          if (ms.length > config.maxSize) warnings.push(`plus de ${config.maxSize} personnes`);
          if (ms.length > 1 && common.length === 0) warnings.push("aucune langue commune");
          if (bands.length > 3) warnings.push("écart d'âge important");
          return [g.id, { size: ms.length, common, bands, shared, women, men, warnings }];
        }),
      ),
    [groups, members, config],
  );
  const totalWarnings = Object.values(analysis).reduce((a, x) => a + x.warnings.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-card">
        <button type="button" onClick={addGroup} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium hover:bg-cream">
          <Plus className="size-4" aria-hidden /> Ajouter un groupe
        </button>
        <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
          <Merge className="size-4 text-plum-700" aria-hidden />
          <label className="sr-only" htmlFor="merge-a">Groupe qui reçoit</label>
          <select id="merge-a" value={mergeA} onChange={(e) => setMergeA(e.target.value)} className="rounded-full border border-line bg-white px-3 py-2">
            <option value="">Fusionner…</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <span>avec</span>
          <label className="sr-only" htmlFor="merge-b">Groupe fusionné</label>
          <select id="merge-b" value={mergeB} onChange={(e) => setMergeB(e.target.value)} className="rounded-full border border-line bg-white px-3 py-2">
            <option value="">…</option>
            {groups.filter((g) => g.id !== mergeA).map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <button type="button" onClick={merge} disabled={!mergeA || !mergeB} className="rounded-full bg-plum-900 px-3 py-2 font-medium text-white disabled:bg-plum-900/30">
            Fusionner
          </button>
        </span>
        <button type="button" onClick={() => { setGroups(initial); setStatus("Proposition initiale restaurée."); }} className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-cream">
          <RotateCcw className="size-4" aria-hidden /> Revenir à la proposition
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{status}</p>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {groups.map((g) => {
          const a = analysis[g.id]!;
          return (
            <section
              key={g.id}
              aria-label={g.label}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const uid = e.dataTransfer.getData("text/plain");
                if (uid) move(uid, g.id);
                setDragging(null);
              }}
              className={`rounded-2xl border-2 bg-white p-4 shadow-card transition ${dragging ? "border-dashed border-plum-200" : "border-transparent"}`}
            >
              <header className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink">{g.label} <span className="font-normal text-muted">· {a.size} pers.</span></h3>
                  <p className="text-xs text-muted">
                    Âges {a.bands.join(", ") || "—"} · {a.women} F / {a.men} H · Langue commune : {a.common.map((l) => LANG[l]).join(", ") || "aucune"}
                  </p>
                  {a.shared.length > 0 && <p className="text-xs text-muted">Intérêts partagés : {a.shared.map((i) => interestLabels[i]).join(", ")}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => split(g.id)} disabled={a.size < 2} title="Diviser en deux" aria-label={`Diviser ${g.label} en deux`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-cream disabled:opacity-30">
                    <Split className="size-4" aria-hidden />
                  </button>
                  {a.size === 0 && (
                    <button type="button" onClick={() => removeEmpty(g.id)} className="rounded-full px-2 text-xs text-muted hover:bg-cream">Supprimer</button>
                  )}
                </div>
              </header>
              {a.warnings.length > 0 ? (
                <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {a.warnings.join(" · ")}
                </p>
              ) : (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-emerald-800"><Check className="size-3.5" aria-hidden /> Composition équilibrée</p>
              )}
              <ul className="space-y-1.5">
                {g.memberIds.map((uid) => {
                  const m = members[uid];
                  if (!m) return null;
                  return (
                    <li
                      key={uid}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", uid); setDragging(uid); }}
                      onDragEnd={() => setDragging(null)}
                      className={`flex items-center gap-2 rounded-xl border border-line bg-cream/50 px-2 py-1.5 text-sm ${dragging === uid ? "opacity-40" : ""}`}
                    >
                      <GripVertical className="size-4 shrink-0 cursor-grab text-muted" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-ink">{m.firstName}</span>{" "}
                        <span className="text-xs text-muted">{m.ageBand} · {m.languages.map((l) => LANG[l]).join("/")}</span>
                      </span>
                      <label className="sr-only" htmlFor={`mv-${uid}`}>Déplacer {m.firstName} vers</label>
                      <select
                        id={`mv-${uid}`}
                        value={g.id}
                        onChange={(e) => move(uid, e.target.value)}
                        className="max-w-28 rounded-lg border border-line bg-white px-1.5 py-1 text-xs"
                      >
                        {groups.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-ink">
          {groups.length} groupes · {totalWarnings === 0 ? "aucune alerte" : `${totalWarnings} alerte${totalWarnings > 1 ? "s" : ""}`}
        </p>
        <button type="button" disabled className="ms-auto cursor-not-allowed rounded-full bg-plum-900/30 px-5 py-2.5 text-sm font-semibold text-white">
          Valider et révéler — étape 6
        </button>
        <p className="basis-full text-xs text-muted">
          Démonstration : les modifications restent à l&apos;écran. L&apos;enregistrement, la révélation aux participants et l&apos;algorithme de matching arrivent à l&apos;étape 6 du plan.
        </p>
      </div>
    </div>
  );
}
