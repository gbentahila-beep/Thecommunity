"use client";

import { LATE_OPTIONS } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { CheckCircle2, Clock, MessageCircle, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { firebase } from "@/lib/firebase/client";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export type TableMate = { uid: string; firstName: string; status: "arrived" | "late" | "waiting"; lateMinutes?: number; me: boolean; avatar: ReactNode };

type Props = {
  reservationId: string;
  startAt: string;
  /** Heure du serveur au rendu (le compte à rebours part de là, puis suit l'horloge de l'appareil). */
  nowIso: string;
  timeLabel: string;
  dayLabel: "today" | "tomorrow";
  state: "early" | "open" | "closed";
  arrived: boolean;
  lateMinutes?: number;
  canLate: boolean;
  directionsUrl?: string;
  /** Table et prénoms : seulement après son arrivée (Tables) ou dès la révélation (autres groupes). */
  table?: { label: string; mates: TableMate[] } | null;
  chatHref?: string | null;
};

const call = async (name: string, data: unknown) => {
  if (!FIREBASE_ENABLED) return;
  await firebase().auth.authStateReady();
  await httpsCallable(firebase().functions, name)(data);
};

/**
 * Le jour J (docs/22, étape Z, inspiré de Timeleft) : compte à rebours, « Je suis là », « Je serai en retard »,
 * itinéraire ; après l'arrivée, qui est à la table (arrivé, en retard, pas encore là) et le chat du groupe.
 */
export function DayOfCard(p: Props) {
  const t = useTranslations("dayOf");
  const router = useRouter();
  const [arrived, setArrived] = useState(p.arrived);
  const [late, setLate] = useState<number | undefined>(p.lateMinutes);
  const [picking, setPicking] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [offset] = useState(() => new Date(p.nowIso).getTime() - Date.now());
  const [now, setNow] = useState(() => new Date(p.nowIso).getTime());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 30_000);
    return () => clearInterval(id);
  }, [offset]);

  const mins = Math.round((new Date(p.startAt).getTime() - now) / 60_000);
  const countdown = mins <= 0 ? t("started") : mins < 60 ? t("inMinutes", { minutes: mins }) : mins % 60 === 0 ? t("inHoursOnly", { hours: mins / 60 }) : t("inHours", { hours: Math.floor(mins / 60), minutes: String(mins % 60).padStart(2, "0") });

  const run = async (fn: () => Promise<void>) => {
    setStatus("busy");
    try {
      await fn();
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  return (
    <section aria-labelledby="day-of-title" className="card overflow-hidden" data-testid="day-of">
      <div className="bg-brand-50 px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand-700 uppercase">{t(p.dayLabel)} · {p.timeLabel}</p>
        <h2 id="day-of-title" className="mt-1 font-display text-[1.9rem] leading-tight font-semibold text-brand-900" data-testid="day-of-countdown">
          {arrived ? t("arrived") : countdown}
        </h2>
      </div>

      <div className="space-y-4 p-5">
        {!arrived && (
          <>
            <p className="text-[15px] text-ink/80">{p.state === "early" ? t("early") : t("openText")}</p>
            {late !== undefined && !picking && (
              <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950" data-testid="late-done">
                <Clock className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{t("lateDone", { minutes: late })}</span>
                {p.canLate && <button type="button" onClick={() => setPicking(true)} className="font-semibold underline underline-offset-2">{t("lateChange")}</button>}
              </p>
            )}
            {picking ? (
              <div role="group" aria-label={t("lateTitle")} className="space-y-2">
                <p className="text-sm font-medium text-ink">{t("lateTitle")}</p>
                <div className="flex flex-wrap gap-2">
                  {LATE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={status === "busy"}
                      onClick={() => run(async () => { await call("signalLate", { reservationId: p.reservationId, minutes: m }); setLate(m); setPicking(false); })}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${late === m ? "bg-brand-900 text-white ring-brand-900" : "bg-white text-ink ring-line hover:ring-brand-300"}`}
                    >
                      {t("lateMinutes", { minutes: m })}
                    </button>
                  ))}
                  <button type="button" onClick={() => setPicking(false)} className="px-2 text-sm font-medium text-muted underline underline-offset-2">{t("lateCancel")}</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {p.state === "open" && (
                  <button type="button" disabled={status === "busy"} onClick={() => run(async () => { await call("selfCheckIn", { reservationId: p.reservationId }); setArrived(true); })} className="btn btn-primary" data-testid="check-in-here">
                    <CheckCircle2 className="size-4" aria-hidden />
                    {status === "busy" ? t("busy") : t("here")}
                  </button>
                )}
                {p.canLate && late === undefined && (
                  <button type="button" onClick={() => setPicking(true)} className="btn btn-secondary" data-testid="late-open">
                    <Clock className="size-4" aria-hidden />
                    {t("late")}
                  </button>
                )}
                {p.directionsUrl && (
                  <a href={p.directionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    <Navigation className="size-4" aria-hidden />
                    {t("directions")}
                  </a>
                )}
              </div>
            )}
          </>
        )}

        {arrived && !p.table && <p className="text-[15px] text-ink/80">{t("arrivedSolo")}</p>}

        {arrived && p.table && (
          <div data-testid="day-of-table">
            <p className="text-sm font-semibold text-ink">{t("atTable")} · {p.table.label}</p>
            <ul className="mt-3 divide-y divide-line/70">
              {p.table.mates.map((m) => (
                <li key={m.uid} className="flex items-center gap-3 py-2.5">
                  {m.avatar}
                  <span className="min-w-0 flex-1 font-medium text-ink">
                    {m.firstName} {m.me && <span className="font-normal text-muted">({t("you")})</span>}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.status === "arrived" ? "bg-emerald-50 text-emerald-800" : m.status === "late" ? "bg-amber-50 text-amber-900" : "bg-cream text-muted"}`}
                  >
                    {m.status === "arrived" ? t("statusArrived") : m.status === "late" ? t("statusLate", { minutes: m.lateMinutes ?? 0 }) : t("statusWaiting")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {arrived && p.chatHref && (
          <div className="rounded-2xl bg-cream/70 p-4">
            <Link href={p.chatHref} className="btn btn-primary w-full sm:w-auto" data-testid="day-of-chat">
              <MessageCircle className="size-4" aria-hidden />
              {t("chat")}
            </Link>
            <p className="mt-2 text-xs text-muted">{t("chatHint")}</p>
          </div>
        )}

        {status === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
      </div>
    </section>
  );
}
