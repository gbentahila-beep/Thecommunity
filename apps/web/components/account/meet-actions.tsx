"use client";

import { httpsCallable } from "firebase/functions";
import { Heart, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";

async function call(name: string, data: unknown) {
  await firebase().auth.authStateReady();
  return (await httpsCallable(firebase().functions, name)(data)).data as { matched?: boolean };
}

/** Étape 31 — « J'aimerais revoir » (privé) et « Ne plus me placer avec » pour une personne d'un ancien groupe. */
export function MeetActions({ groupId, otherUid, firstName, wished, avoided, matched, windowOpen, live }: {
  groupId: string; otherUid: string; firstName: string; wished: boolean; avoided: boolean; matched: boolean; windowOpen: boolean; live: boolean;
}) {
  const t = useTranslations("meet");
  const router = useRouter();
  const [w, setW] = useState(wished);
  const [a, setA] = useState(avoided);
  const [confirmAvoid, setConfirmAvoid] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      const r = (e as { details?: { reason?: string } }).details?.reason;
      setMsg({ ok: false, text: r === "meet_window" ? t("windowClosed") : t("error") });
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {matched ? (
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800" data-testid="meet-matched">{t("matched")}</span>
      ) : a ? null : (
        <button
          type="button"
          disabled={busy || !windowOpen}
          aria-pressed={w}
          onClick={() =>
            run(async () => {
              const next = !w;
              if (live) {
                const r = await call("setMeetAgain", { groupId, otherUid, wish: next });
                if (r.matched) setMsg({ ok: true, text: t("justMatched", { name: firstName }) });
                router.refresh();
              } else if (next) setMsg({ ok: true, text: t("demo") });
              setW(next);
            })
          }
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${w ? "bg-brand-100 text-brand-900 ring-1 ring-brand-200" : "border border-brand-900 text-brand-900"}`}
        >
          <Heart className={`size-3.5 ${w ? "fill-current" : ""}`} aria-hidden />
          {w ? t("wished", { name: firstName }) : t("wish", { name: firstName })}
        </button>
      )}
      {a ? (
        <button type="button" disabled={busy} onClick={() => run(async () => { if (live) await call("setAvoid", { otherUid, avoid: false }); setA(false); router.refresh(); })} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted">
          {t("unavoid")}
        </button>
      ) : confirmAvoid ? (
        <span className="inline-flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink">{t("avoidConfirm", { name: firstName })}</span>
          <button type="button" disabled={busy} onClick={() => run(async () => { if (live) await call("setAvoid", { otherUid, avoid: true }); setA(true); setW(false); setConfirmAvoid(false); router.refresh(); })} className="rounded-full bg-red-800 px-3 py-1.5 font-semibold text-white">{t("avoidYes")}</button>
          <button type="button" onClick={() => setConfirmAvoid(false)} className="text-muted underline">{t("cancel")}</button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmAvoid(true)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-800" aria-label={t("avoidLabel", { name: firstName })}>
          <UserX className="size-3.5" aria-hidden />
          {t("avoid")}
        </button>
      )}
      {a && <span className="text-xs text-muted" data-testid="meet-avoided">{t("avoided")}</span>}
      <ReportButton groupId={groupId} otherUid={otherUid} firstName={firstName} live={live} />
      {msg && <p role={msg.ok ? "status" : "alert"} className={`w-full text-xs ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </div>
  );
}

/** Inviter un contact (réciproque) à une prochaine date. */
export function InviteForm({ toUid, firstName, sessions, live }: { toUid: string; firstName: string; sessions: { id: string; label: string }[]; live: boolean }) {
  const t = useTranslations("meet");
  const [open, setOpen] = useState(false);
  const [sid, setSid] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <div className="space-y-1">
        <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="btn btn-primary btn-sm">{t("invite", { name: firstName })}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
      </div>
    );
  return (
    <form
      className="flex w-full flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!sid) return setMsg({ ok: false, text: t("pickSession") });
        if (!live) return setMsg({ ok: true, text: t("demo") });
        setBusy(true);
        try {
          await call("inviteToSession", { sessionId: sid, toUids: [toUid] });
          setMsg({ ok: true, text: t("invited", { name: firstName }) });
          setOpen(false);
        } catch (err) {
          const r = (err as { details?: { reason?: string } }).details?.reason;
          setMsg({ ok: false, text: r === "too_many_invites" ? t("tooMany") : t("error") });
        }
        setBusy(false);
      }}
    >
      <label className="min-w-0 flex-1 text-sm">
        <span className="mb-1 block font-medium">{t("whichSession")}</span>
        <select value={sid} onChange={(e) => setSid(e.target.value)} className="w-full rounded-xl border border-line bg-white px-3 py-2">
          <option value="">{t("pickSession")}</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <button type="submit" disabled={busy} className="btn btn-primary btn-sm">{t("sendInvite")}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`w-full text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </form>
  );
}

/** Signaler une personne de sa table (docs/22, décision 48) : privé, lu par l'équipe seulement. */
function ReportButton({ groupId, otherUid, firstName, live }: { groupId: string; otherUid: string; firstName: string; live: boolean }) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("behaviour");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done") return <p role="status" className="w-full text-xs text-emerald-800">{t("done")}</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline hover:text-red-800" data-testid="report-open">{t("open", { name: firstName })}</button>;
  return (
    <form
      className="w-full space-y-2 rounded-xl bg-cream p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        if (details.trim().length < 5) return setState("error");
        setState("busy");
        try {
          if (live) await call("reportParticipant", { groupId, otherUid, reason, details: details.trim() });
          setState("done");
        } catch {
          setState("error");
        }
      }}
    >
      <label className="flex flex-col gap-1 font-medium">{t("reason")}
        <select className="rounded-lg border border-line bg-white px-2 py-1.5" value={reason} onChange={(e) => setReason(e.target.value)}>
          {(["behaviour", "harassment", "safety", "other"] as const).map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-medium">{t("details")}<textarea rows={3} maxLength={1000} className="rounded-lg border border-line bg-white px-2 py-1.5" value={details} onChange={(e) => setDetails(e.target.value)} /></label>
      <div className="flex gap-2">
        <button type="submit" disabled={state === "busy"} className="rounded-full bg-red-800 px-3 py-1.5 text-xs font-semibold text-white">{t("send")}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">{t("cancel")}</button>
      </div>
      <p className="text-xs text-muted">{t("privacy")}</p>
      {state === "error" && <p role="alert" className="text-xs text-red-800">{t("error")}</p>}
    </form>
  );
}
