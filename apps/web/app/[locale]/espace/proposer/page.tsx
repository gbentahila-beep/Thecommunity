import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ProposalForm } from "@/components/account/proposal-form";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { tr } from "@/lib/i18n-text";
import { getMyProposals } from "@/lib/data/proposals";
import { formatLongDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/proposer">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "propose" }))("title"), robots: { index: false } };
}

/** 18d — Proposer une sortie (membres de confiance) et suivre ses propositions. */
export default async function ProposePage({ params, searchParams }: PageProps<"/[locale]/espace/proposer">) {
  const { locale: localeParam } = await params;
  const groupParam = (await searchParams).groupe;
  setRequestLocale(localeParam);
  const [t, space, locale, categories] = await Promise.all([getTranslations("propose"), getMemberSpace(), getLocale(), getCategories()]);
  const trusted = space.profile.trustedHost === true;
  const mine = trusted ? await getMyProposals(space.session?.uid ?? space.profile.uid) : [];
  // Étape 31 : sortie proposée à un de mes anciens groupes (vérifié aussi par le serveur).
  const g = typeof groupParam === "string" ? space.groups.find((x) => x.id === groupParam) : undefined;
  const gr = g ? space.reservations.find((r) => r.groupId === g.id) : undefined;
  const forGroup = g && gr ? { id: g.id, label: `${tr(gr.sessionSnapshot.title, locale)} · ${formatLongDate(gr.sessionSnapshot.startAt, locale)} · ${g.label}` } : undefined;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">{t("title")}</h1>
        <p className="mt-2 text-ink/80">{t("intro")}</p>
      </header>
      {!trusted ? (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="proposal-not-trusted">
          <p className="text-ink/85">{t("notTrusted")}</p>
          <Link href="/contact" className="mt-3 inline-block font-semibold text-brand-900 underline">{t("contactUs")}</Link>
        </section>
      ) : (
        <>
          <ProposalForm live={!space.isDemo} forGroup={forGroup} categories={categories.map((c) => ({ id: c.id, label: tr(c.name, locale) }))} />
          {mine.length > 0 && (
            <section aria-labelledby="my-proposals" className="space-y-3">
              <h2 id="my-proposals" className="font-display text-2xl font-medium text-brand-900">{t("mine")}</h2>
              <ul className="space-y-2">
                {mine.map((p) => (
                  <li key={p.id} className="rounded-2xl bg-white p-4 shadow-card" data-testid="my-proposal">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{p.title}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "accepted" ? "bg-emerald-100 text-emerald-900" : p.status === "declined" ? "bg-line text-ink" : "bg-amber-100 text-amber-950"}`}>{t(`status_${p.status}`)}</span>
                    </p>
                    <p className="text-sm text-muted">{p.createdAt ? formatLongDate(p.createdAt, locale) : ""}</p>
                    {p.decisionMessage && <p className="mt-2 text-sm text-ink/85">{t("teamMessage")} {p.decisionMessage}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
