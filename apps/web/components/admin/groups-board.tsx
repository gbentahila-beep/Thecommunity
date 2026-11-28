"use client";

import { assignGroupsToVenues, byTableLabel } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { AlertTriangle, Check, GripVertical, MapPin, Merge, Plus, RotateCcw, Sparkles, Split, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { firebase } from "@/lib/firebase/client";

export type MemberProfile = {
  profession: string; bio: string; sector: string; district: string; socialGoals: string[]; groupVibe: string; conversationStyle: number | null;
  humor: string; lifeValues: string[]; venueBudget: string; diets: string[]; agePreference: string; createdAt: string;
  outings: number; noShows: number; metUids: string[];
};
export type BoardMember = {
  uid: string;
  firstName: string;
  fullName?: string;
  email?: string;
  ageBand: string;
  gender: "female" | "male" | "undisclosed";
  languages: string[];
  interests: string[];
  /** Places de la réservation (la personne + ses invités). */
  seats?: number;
  /** 18a : réponses au questionnaire (numéros) et leur résumé lisible. */
  answers?: Record<string, number>;
  answersText?: string;
  /** Choix faits à la réservation : régime, allergies (partagés ou non avec le lieu). */
  diet?: string;
  allergies?: string;
  profile?: MemberProfile;
};
/** 18a : questions utiles aux alertes (niveau éloigné, questionnaire non rempli). */
export type BoardQuestion = { id: string; kind: "choice" | "ordered"; match: "same" | "mix" | "none" };
export type BoardGroup = { id: string; label: string; memberIds: string[] };
export type BoardVenue = { name: string; cuisine?: string | null; tables?: number | null };

const LANG: Record<string, string> = { fr: "FR", ar: "AR", darija: "Darija", en: "EN", es: "ES" };
const GENDER: Record<string, string> = { female: "Femme", male: "Homme", undisclosed: "Non précisé" };
const SECTOR: Record<string, string> = { tech: "Tech", health: "Santé", finance_law: "Finance, droit", creative_media: "Création, médias", education: "Éducation", trades: "Artisanat, métiers", hospitality_retail: "Hôtellerie, commerce", public: "Secteur public", student: "Étudiant·e", not_working: "Sans emploi", other: "Autre" };
const VIBE: Record<string, string> = { calm: "Calme", curious: "Curieuse", playful: "Joueuse", any: "Peu importe" };
const HUMOR: Record<string, string> = { dry: "Pince-sans-rire", playful: "Taquin", offbeat: "Décalé", everything: "De tout" };
const VALUES: Record<string, string> = { family: "Famille", friends: "Amis", career: "Carrière", health: "Santé", adventure: "Aventure", learning: "Apprendre", creativity: "Créativité", helping: "Aider", fun: "S'amuser" };
const BUDGET: Record<string, string> = { cafe: "Café", casual: "Décontracté", smart: "Chic", fine: "Gastronomique" };
const GOALS: Record<string, string> = { meet_new_people: "Rencontrer du monde", expand_circle: "Élargir son cercle", discover_activities: "Découvrir des activités", go_out_more: "Sortir plus", share_passions: "Partager ses passions" };
const DIETS: Record<string, string> = { none: "", vegetarian: "Végétarien", vegan: "Végan", pescatarian: "Pescétarien", halal: "Halal", no_alcohol: "Sans alcool", gluten_free: "Sans gluten", lactose_free: "Sans lactose", other: "Régime particulier" };
const CONVERSATION = ["", "Plutôt à l'écoute", "Écoute surtout", "Équilibré", "Parle volontiers", "Lance les conversations"];

const UNASSIGNED = "__unassigned";
const STATUS_LABELS: Record<string, string> = { none: "Pas encore composées", proposed: "Composées automatiquement", validated: "Retouchées et enregistrées", revealed: "Dévoilées aux participants" };

/**
 * Composition des tables (refonte UX du 25/11). Les tables sont rangées par restaurant (celui où elles iront) ; un
 * clic sur une personne ouvre son profil complet (réponses d'inscription, régime, historique, personnes déjà
 * rencontrées) pour décider en connaissance de cause. Glisser-déposer ou « Déplacer vers » ; enregistrer garde la
 * composition telle quelle (elle n'est plus jamais recomposée automatiquement).
 */
export function GroupsBoard({
  initial, members, config, interestLabels, prefix, live = false, sessionId, status: groupsStatus = "none", unassigned = [], questions = [], venues = [], timing,
}: {
  initial: BoardGroup[];
  members: Record<string, BoardMember>;
  config: { minSize: number; targetSize: number; maxSize: number };
  interestLabels: Record<string, string>;
  prefix: string;
  live?: boolean;
  sessionId?: string;
  status?: string;
  unassigned?: string[];
  questions?: BoardQuestion[];
  venues?: BoardVenue[];
  /** « composées à 20h30, dévoilées le … » */
  timing?: string;
}) {
  const router = useRouter();
  const start = () => [...initial, ...(live ? [{ id: UNASSIGNED, label: "À placer", memberIds: unassigned }] : [])];
  const [groups, setGroups] = useState(start);
  const source = JSON.stringify([initial, unassigned]);
  const [seen, setSeen] = useState(source);
  if (seen !== source) {
    setSeen(source);
    setGroups(start());
  }
  const dirty = JSON.stringify(groups.filter((g) => g.memberIds.length || g.id !== UNASSIGNED)) !== JSON.stringify(start().filter((g) => g.memberIds.length || g.id !== UNASSIGNED));
  const [busy, setBusy] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [mergeA, setMergeA] = useState("");
  const [mergeB, setMergeB] = useState("");
  const [status, setStatus] = useState("");
  const REASONS: Record<string, string> = {
    unassigned: "Tous les participants confirmés doivent être placés.",
    duplicate_member: "Un participant est placé deux fois.",
    unknown_member: "Un participant n'a plus de réservation confirmée : rechargez la page.",
    already_revealed: "Tables déjà dévoilées : modifiez-les à la main puis enregistrez.",
    not_validated: "Enregistrez d'abord la composition.",
    no_participants: "Aucun participant confirmé.",
  };
  const call = async (fn: string, data: unknown, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await firebase().auth.authStateReady();
      await httpsCallable(firebase().functions, fn)(data);
      setMessage({ ok: true, text: ok });
      router.refresh();
      return true;
    } catch (e) {
      const reason = (e as { details?: { reason?: string } }).details?.reason;
      setMessage({ ok: false, text: (reason && REASONS[reason]) || "Action impossible." });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const payload = () => ({ sessionId, groups: groups.filter((g) => g.id !== UNASSIGNED && g.memberIds.length).map((g) => ({ label: g.label, memberIds: g.memberIds })) });

  const tableOf = (uid: string) => groups.find((g) => g.memberIds.includes(uid));
  const move = (uid: string, to: string) => {
    setGroups((gs) => gs.map((g) => ({ ...g, memberIds: g.id === to ? [...g.memberIds.filter((m) => m !== uid), uid] : g.memberIds.filter((m) => m !== uid) })));
    setStatus(`${members[uid]?.firstName} déplacé·e vers ${groups.find((g) => g.id === to)?.label}.`);
  };
  const tables = groups.filter((g) => g.id !== UNASSIGNED);
  const nextLabel = () => `${prefix} ${tables.length + 1}`;
  const addGroup = () => setGroups((gs) => [...gs.filter((g) => g.id !== UNASSIGNED), { id: `new-${Date.now()}`, label: nextLabel(), memberIds: [] }, ...gs.filter((g) => g.id === UNASSIGNED)]);
  const split = (id: string) =>
    setGroups((gs) => {
      const g = gs.find((x) => x.id === id);
      if (!g || g.memberIds.length < 2) return gs;
      const half = Math.ceil(g.memberIds.length / 2);
      return [...gs.filter((x) => x.id !== UNASSIGNED).map((x) => (x.id === id ? { ...x, memberIds: g.memberIds.slice(0, half) } : x)), { id: `split-${Date.now()}`, label: nextLabel(), memberIds: g.memberIds.slice(half) }, ...gs.filter((x) => x.id === UNASSIGNED)];
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

  // Restaurant de chaque table : dans l'ordre des tables, selon le nombre de tables réservées chez chacun.
  const venueOf = useMemo(() => {
    const sorted = [...tables].sort((a, b) => byTableLabel(a.label, b.label));
    const idx = venues.length ? assignGroupsToVenues(sorted.length, venues) : [];
    return new Map(sorted.map((g, i) => [g.id, venues.length ? idx[i]! : -1]));
  }, [tables, venues]);

  const analysis = useMemo(
    () =>
      Object.fromEntries(
        groups.map((g) => {
          const ms = g.memberIds.map((id) => members[id]).filter(Boolean) as BoardMember[];
          const seats = ms.reduce((a, m) => a + (m.seats ?? 1), 0);
          const known = ms.filter((m) => m.languages.length > 0);
          const common = known.length ? Object.keys(LANG).filter((l) => known.every((m) => m.languages.includes(l))) : [];
          const bands = [...new Set(ms.map((m) => m.ageBand))].sort();
          const counts = new Map<string, number>();
          ms.forEach((m) => m.interests.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1)));
          const shared = [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => i);
          const women = ms.filter((m) => m.gender === "female").length;
          const men = ms.filter((m) => m.gender === "male").length;
          const metPairs = ms.flatMap((m, i) => ms.slice(i + 1).filter((o) => m.profile?.metUids.includes(o.uid)).map((o) => `${m.firstName.split(" ")[0]} et ${o.firstName.split(" ")[0]}`));
          const warnings: string[] = [];
          if (g.id === UNASSIGNED) return [g.id, { size: seats, common, bands, shared, women, men, warnings: [] as string[], metPairs }];
          if (seats < config.minSize) warnings.push(`moins de ${config.minSize} personnes`);
          if (seats > config.maxSize) warnings.push(`plus de ${config.maxSize} personnes`);
          if (known.length > 1 && common.length === 0) warnings.push("aucune langue commune");
          if (bands.length > 3) warnings.push("écart d'âge important");
          if (metPairs.length) warnings.push(`déjà rencontrés : ${metPairs.join(", ")}`);
          if (questions.some((q) => q.match === "same" && q.kind === "ordered" && (() => {
            const vals = ms.map((m) => m.answers?.[q.id]).filter((x): x is number => typeof x === "number");
            return vals.length > 1 && Math.max(...vals) - Math.min(...vals) >= 2;
          })())) warnings.push("niveaux très différents");
          const unanswered = questions.length ? ms.filter((m) => !m.answers || Object.keys(m.answers).length === 0).length : 0;
          if (unanswered > 0) warnings.push(`${unanswered} questionnaire${unanswered > 1 ? "s" : ""} non rempli${unanswered > 1 ? "s" : ""}`);
          return [g.id, { size: seats, common, bands, shared, women, men, warnings, metPairs }];
        }),
      ),
    [groups, members, config, questions],
  );
  const totalWarnings = tables.reduce((a, g) => a + (analysis[g.id]?.warnings.length ?? 0), 0);
  const people = tables.reduce((a, g) => a + (analysis[g.id]?.size ?? 0), 0);
  const toPlace = groups.find((g) => g.id === UNASSIGNED)?.memberIds ?? [];

  const chip = (uid: string, tableId: string) => {
    const m = members[uid];
    if (!m) return null;
    const table = groups.find((g) => g.id === tableId);
    const met = (m.profile?.metUids ?? []).filter((o) => table?.memberIds.includes(o));
    const first = m.profile && m.profile.outings === 0;
    return (
      <li
        key={uid}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", uid); setDragging(uid); }}
        onDragEnd={() => setDragging(null)}
        className={`group flex items-center gap-2 rounded-xl border px-2 py-1.5 text-sm transition ${selected === uid ? "border-brand-700 bg-brand-50" : "border-line bg-white hover:border-brand-200"} ${dragging === uid ? "opacity-40" : ""}`}
        data-testid="member-chip"
      >
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted/60" aria-hidden />
        <button type="button" onClick={() => setSelected(selected === uid ? null : uid)} className="flex min-w-0 flex-1 items-center gap-2 text-start" aria-label={`Voir le profil de ${m.firstName}`}>
          <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${m.gender === "female" ? "bg-pink-100 text-pink-900" : m.gender === "male" ? "bg-sky-100 text-sky-900" : "bg-stone-200 text-stone-700"}`}>
            {m.firstName.charAt(0)}{(m.firstName.split(" ")[1] ?? "").charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-ink">{m.firstName}{(m.seats ?? 1) > 1 ? <span className="ms-1 rounded-full bg-brand-100 px-1.5 text-[11px] font-semibold text-brand-900">+{(m.seats ?? 1) - 1}</span> : null}</span>
            <span className="block truncate text-xs text-muted">{m.ageBand} ans · {m.languages.map((l) => LANG[l]).join("/")}{m.profile?.sector ? ` · ${SECTOR[m.profile.sector] ?? m.profile.sector}` : ""}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            {first && <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-900">1re sortie</span>}
            {met.length > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900" title="A déjà rencontré quelqu'un de cette table">déjà vu·e</span>}
            {(m.allergies || (m.diet && m.diet !== "none")) && <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-900" title={[DIETS[m.diet ?? ""] ?? m.diet, m.allergies].filter(Boolean).join(" · ")}>{m.allergies ? "allergie" : "régime"}</span>}
          </span>
        </button>
        <label className="sr-only" htmlFor={`mv-${uid}`}>Déplacer {m.firstName} vers</label>
        <select id={`mv-${uid}`} value={tableId} onChange={(e) => move(uid, e.target.value)} className="hidden max-w-24 rounded-lg border border-line bg-white px-1.5 py-1 text-xs group-hover:block group-focus-within:block">
          {groups.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </li>
    );
  };

  const tableCard = (g: BoardGroup) => {
    const a = analysis[g.id]!;
    const over = a.size > config.maxSize;
    const under = a.size < config.minSize;
    return (
      <section
        key={g.id}
        aria-label={g.label}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const uid = e.dataTransfer.getData("text/plain"); if (uid) move(uid, g.id); setDragging(null); }}
        className={`rounded-2xl border-2 bg-white p-3 shadow-card transition ${dragging ? "border-dashed border-brand-300" : "border-transparent"}`}
        data-testid="table-card"
      >
        <header className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              {g.label}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${over || under ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{a.size}/{config.maxSize}</span>
            </h4>
            {venues.length > 0 && <p className="flex items-center gap-1 text-xs font-medium text-brand-900"><MapPin className="size-3.5" aria-hidden />{venues[venueOf.get(g.id) ?? -1]?.name ?? "Restaurant à préciser"}{venues[venueOf.get(g.id) ?? -1]?.cuisine ? <span className="font-normal text-muted"> · {venues[venueOf.get(g.id) ?? -1]?.cuisine}</span> : null}</p>}
            <p className="text-xs text-muted">Âges {a.bands.join(", ") || "—"} · {a.women} F / {a.men} H · Langue : {a.common.map((l) => LANG[l]).join(", ") || "aucune commune"}</p>
            {a.shared.length > 0 && <p className="text-xs text-muted">En commun : {a.shared.map((i) => interestLabels[i] ?? i).join(", ")}</p>}
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => split(g.id)} disabled={g.memberIds.length < 2} title="Diviser en deux" aria-label={`Diviser ${g.label} en deux`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-cream disabled:opacity-30"><Split className="size-4" aria-hidden /></button>
            {g.memberIds.length === 0 && <button type="button" onClick={() => removeEmpty(g.id)} className="rounded-full px-2 text-xs text-muted hover:bg-cream">Supprimer</button>}
          </div>
        </header>
        {a.warnings.length > 0 ? (
          <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {a.warnings.join(" · ")}</p>
        ) : (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-emerald-800"><Check className="size-3.5" aria-hidden /> Table équilibrée</p>
        )}
        <ul className="space-y-1.5">{g.memberIds.map((uid) => chip(uid, g.id))}</ul>
        {g.memberIds.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-muted">Glissez quelqu&apos;un ici</p>}
      </section>
    );
  };

  // Tables rangées par restaurant (ou un seul bloc si les lieux ne sont pas encore connus).
  const sections = venues.length
    ? venues.map((v, i) => ({ key: `v${i}`, title: v.name, sub: [v.cuisine, v.tables ? `${v.tables} table${v.tables > 1 ? "s" : ""} réservée${v.tables > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · "), tables: tables.filter((g) => venueOf.get(g.id) === i).sort((a, b) => byTableLabel(a.label, b.label)) }))
    : [{ key: "all", title: "Lieu pas encore confirmé", sub: "Les restaurants s'affichent ici dès qu'ils ont confirmé.", tables: [...tables].sort((a, b) => byTableLabel(a.label, b.label)) }];

  const sel = selected ? members[selected] : null;
  const selTable = selected ? tableOf(selected) : null;
  const selVenue = selTable && venues.length ? venues[venueOf.get(selTable.id) ?? -1] : null;

  return (
    <div className="space-y-4 pb-24">
      {/* Résumé et outils */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white p-3 shadow-card" data-testid="board-summary">
        <p className="text-sm text-ink">
          <strong>{tables.length}</strong> table{tables.length > 1 ? "s" : ""} · <strong>{people}</strong> personnes{venues.length ? <> · <strong>{venues.length}</strong> restaurant{venues.length > 1 ? "s" : ""}</> : null} ·{" "}
          {totalWarnings === 0 ? <span className="text-emerald-800">aucune alerte</span> : <span className="font-semibold text-amber-800">{totalWarnings} alerte{totalWarnings > 1 ? "s" : ""}</span>}
          {live && <span className="block text-xs text-muted">{STATUS_LABELS[groupsStatus] ?? groupsStatus}{timing ? ` · ${timing}` : ""}</span>}
        </p>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={addGroup} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium hover:bg-cream"><Plus className="size-4" aria-hidden /> Ajouter une table</button>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-2 text-sm font-medium hover:bg-cream"><Merge className="me-1 inline size-4" aria-hidden />Fusionner</summary>
            <div className="absolute end-0 z-20 mt-2 flex w-72 flex-wrap items-center gap-1.5 rounded-2xl bg-white p-3 text-sm shadow-card ring-1 ring-line">
              <select aria-label="Table qui reçoit" value={mergeA} onChange={(e) => setMergeA(e.target.value)} className="rounded-full border border-line bg-white px-3 py-1.5"><option value="">Table…</option>{tables.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
              <span>avec</span>
              <select aria-label="Table fusionnée" value={mergeB} onChange={(e) => setMergeB(e.target.value)} className="rounded-full border border-line bg-white px-3 py-1.5"><option value="">…</option>{tables.filter((g) => g.id !== mergeA).map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
              <button type="button" onClick={merge} disabled={!mergeA || !mergeB} className="rounded-full bg-brand-900 px-3 py-1.5 font-medium text-white disabled:opacity-30">OK</button>
            </div>
          </details>
          {live && groupsStatus !== "revealed" && (
            <button type="button" disabled={busy} onClick={() => call("adminProposeGroups", { sessionId }, "Nouvelle composition proposée.")} className="inline-flex items-center gap-1.5 rounded-full border border-brand-900 px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50"><Sparkles className="size-4" aria-hidden /> Recomposer automatiquement</button>
          )}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {toPlace.length > 0 && (
            <section className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const uid = e.dataTransfer.getData("text/plain"); if (uid) move(uid, UNASSIGNED); }}>
              <h3 className="mb-2 text-sm font-semibold text-amber-950">À placer ({toPlace.length})</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">{toPlace.map((uid) => chip(uid, UNASSIGNED))}</ul>
            </section>
          )}
          {venues.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-xs" aria-label="Restaurants de la date" data-testid="venue-legend">
              {sections.map((sec) => (
                <li key={sec.key} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-card">
                  <MapPin className="size-3.5 text-brand-700" aria-hidden /><span className="font-semibold text-ink">{sec.title}</span>
                  <span className="text-muted">{sec.tables.map((g) => g.label.replace(/^\D+/, "T")).join(", ") || "aucune table"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-4" aria-hidden />Restaurants pas encore confirmés : ils s&apos;afficheront sur chaque table.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3" data-testid="venue-section">
            {sections.flatMap((sec) => sec.tables).map((g) => tableCard(g))}
          </div>
        </div>

        {/* Profil de la personne sélectionnée : à droite sur grand écran, en bas sur téléphone. */}
        <aside className={`lg:sticky lg:top-4 lg:self-start ${sel ? "fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl shadow-float lg:static lg:max-h-none lg:rounded-2xl lg:shadow-card" : "hidden lg:block"} bg-white p-4`} data-testid="member-panel">
          {!sel ? (
            <div className="text-sm text-muted">
              <UserRound className="mb-2 size-6 text-brand-700" aria-hidden />
              <p className="font-semibold text-ink">Profil d&apos;un participant</p>
              <p className="mt-1">Cliquez sur une personne pour voir son profil complet : âge, langues, métier, centres d&apos;intérêt, envies, style de conversation, budget, régime et allergies, sorties déjà faites et personnes déjà rencontrées.</p>
              <ul className="mt-3 space-y-1 text-xs">
                <li><span className="rounded-full bg-emerald-100 px-1.5 font-semibold text-emerald-900">1re sortie</span> jamais venu·e à un rendez-vous</li>
                <li><span className="rounded-full bg-amber-100 px-1.5 font-semibold text-amber-900">déjà vu·e</span> a déjà rencontré quelqu&apos;un de sa table</li>
                <li><span className="rounded-full bg-red-100 px-1.5 font-semibold text-red-900">allergie</span> régime ou allergie déclaré</li>
              </ul>
            </div>
          ) : (
            <MemberPanel m={sel} table={selTable?.label ?? "À placer"} venue={selVenue?.name ?? ""} members={members} tableOf={tableOf} interestLabels={interestLabels} onClose={() => setSelected(null)}
              moveSelect={
                <select value={selTable?.id ?? UNASSIGNED} onChange={(e) => move(sel.uid, e.target.value)} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" aria-label="Déplacer vers">
                  {groups.map((x) => <option key={x.id} value={x.id}>{x.label}{venues.length && x.id !== UNASSIGNED ? ` · ${venues[venueOf.get(x.id) ?? -1]?.name ?? ""}` : ""}</option>)}
                </select>
              }
            />
          )}
        </aside>
      </div>

      {/* Barre d'actions, toujours visible. */}
      <div className="sticky bottom-0 z-20 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-float ring-1 ring-line backdrop-blur" data-testid="board-actions">
        <p className="text-sm">
          {dirty ? <span className="font-semibold text-amber-800">Modifications non enregistrées</span> : <span className="text-muted">Aucune modification en cours</span>}
        </p>
        {dirty && <button type="button" onClick={() => { setGroups(start()); setStatus("Composition enregistrée restaurée."); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-cream"><RotateCcw className="size-4" aria-hidden /> Annuler</button>}
        {live ? (
          <div className="ms-auto flex flex-wrap gap-2">
            <button type="button" disabled={busy || (!dirty && groupsStatus !== "proposed")} onClick={() => call("adminSaveGroups", payload(), groupsStatus === "revealed" ? "Enregistré : les personnes déplacées sont prévenues." : "Composition enregistrée : elle sera dévoilée telle quelle.")} className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40">
              Enregistrer la composition
            </button>
            {groupsStatus !== "revealed" && !confirmReveal && (
              <button type="button" disabled={busy || groupsStatus !== "validated" || dirty} onClick={() => setConfirmReveal(true)} className="rounded-full border border-brand-900 px-5 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-40" title="Sinon, dévoilement automatique à l'heure prévue">
                Dévoiler maintenant
              </button>
            )}
          </div>
        ) : (
          <span className="ms-auto text-xs text-muted">Démonstration : les modifications restent à l&apos;écran.</span>
        )}
        {confirmReveal && (
          <div role="alertdialog" aria-label="Confirmer le dévoilement" className="basis-full rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
            <p>Chaque participant découvre son lieu et un aperçu de sa table (sans les noms), avec une notification et un e-mail. Dévoiler maintenant, avant l&apos;heure prévue ?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={busy} onClick={async () => { if (await call("adminRevealGroups", { sessionId }, "Dévoilé : les participants sont prévenus.")) setConfirmReveal(false); }} className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Oui, dévoiler</button>
              <button type="button" onClick={() => setConfirmReveal(false)} className="rounded-full border border-line bg-white px-4 py-2 font-semibold">Pas encore</button>
            </div>
          </div>
        )}
        {message && <p role={message.ok ? "status" : "alert"} className={`basis-full text-sm ${message.ok ? "text-emerald-800" : "text-red-800"}`}>{message.text}</p>}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Profil complet d'un participant (équipe seulement) : de quoi décider d'un changement de table. */
function MemberPanel({ m, table, venue, members, tableOf, interestLabels, onClose, moveSelect }: {
  m: BoardMember; table: string; venue: string; members: Record<string, BoardMember>; tableOf: (uid: string) => BoardGroup | undefined;
  interestLabels: Record<string, string>; onClose: () => void; moveSelect: React.ReactNode;
}) {
  const p = m.profile;
  const met = (p?.metUids ?? []).map((u) => ({ u, m: members[u], t: tableOf(u)?.label })).filter((x) => x.m);
  const since = p?.createdAt ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(p.createdAt)) : "";
  const diets = [m.diet && m.diet !== "none" ? DIETS[m.diet] ?? m.diet : "", ...(p?.diets ?? []).map((x) => DIETS[x] ?? x)].filter(Boolean);
  return (
    <div className="space-y-4 text-sm" data-testid="member-profile">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-ink">{m.fullName ?? m.firstName}</p>
          <p className="text-muted">{m.ageBand} ans · {GENDER[m.gender] ?? ""}{p?.district ? ` · ${p.district}` : ""}</p>
          <p className="mt-1 text-xs font-medium text-brand-900">{table}{venue ? ` · ${venue}` : ""}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer le profil" className="grid size-8 place-items-center rounded-full hover:bg-cream"><X className="size-4" aria-hidden /></button>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Changer de table</p>
        {moveSelect}
      </div>
      {met.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-amber-950">
          <p className="text-xs font-semibold">Déjà rencontré·e à une autre sortie</p>
          <ul className="mt-1 space-y-0.5 text-sm">{met.map((x) => <li key={x.u}>{x.m!.firstName} <span className="text-xs">({x.t ?? "à placer"}{x.t === table ? " : même table" : ""})</span></li>)}</ul>
        </div>
      )}
      {(diets.length > 0 || m.allergies) && (
        <div className="rounded-xl bg-red-50 p-3 text-red-950">
          <p className="text-xs font-semibold">Régime et allergies</p>
          <p>{[...diets, m.allergies ? `Allergie : ${m.allergies}` : ""].filter(Boolean).join(" · ")}</p>
        </div>
      )}
      <dl className="divide-y divide-line">
        <Row label="Langues">{m.languages.map((l) => LANG[l] ?? l).join(", ") || "—"}</Row>
        {p && <Row label="Métier">{[p.profession, SECTOR[p.sector] ?? p.sector].filter(Boolean).join(" · ") || "—"}</Row>}
        <Row label="Centres d'intérêt">{m.interests.map((i) => interestLabels[i] ?? i).join(", ") || "—"}</Row>
        {p && p.socialGoals.length > 0 && <Row label="Envies">{p.socialGoals.map((g) => GOALS[g] ?? g).join(", ")}</Row>}
        {p?.groupVibe && <Row label="Ambiance de groupe">{VIBE[p.groupVibe] ?? p.groupVibe}</Row>}
        {p?.conversationStyle ? <Row label="Conversation">{CONVERSATION[p.conversationStyle] ?? p.conversationStyle}</Row> : null}
        {p?.humor && <Row label="Humour">{HUMOR[p.humor] ?? p.humor}</Row>}
        {p && p.lifeValues.length > 0 && <Row label="Valeurs">{p.lifeValues.map((v) => VALUES[v] ?? v).join(", ")}</Row>}
        {p?.venueBudget && <Row label="Budget sorties">{BUDGET[p.venueBudget] ?? p.venueBudget}</Row>}
        {p?.agePreference === "similar" && <Row label="Âges">Préfère des personnes de son âge</Row>}
        {m.answersText && <Row label="Questionnaire">{m.answersText}</Row>}
        {p && <Row label="Historique">{p.outings === 0 ? "Première sortie" : `${p.outings} sortie${p.outings > 1 ? "s" : ""}`}{p.noShows ? ` · ${p.noShows} absence${p.noShows > 1 ? "s" : ""}` : ""}{since ? ` · membre depuis ${since}` : ""}</Row>}
      </dl>
      {p?.bio && <p className="rounded-xl bg-cream p-3 text-sm italic text-ink/80">« {p.bio} »</p>}
      {m.email && <a href={`/admin/utilisateurs?q=${encodeURIComponent(m.email)}`} className="inline-block text-sm font-semibold text-brand-900 underline">Fiche du membre →</a>}
    </div>
  );
}
