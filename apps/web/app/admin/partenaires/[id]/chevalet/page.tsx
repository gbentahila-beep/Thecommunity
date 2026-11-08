import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { PageHeader } from "@/components/admin/ui";
import { MonogramSvg } from "@/components/brand/brand-mark";
import { getAdminData } from "@/lib/data/admin";
import { qrSvg } from "@/lib/qr";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Chevalet « Réservé »" };

/** Chevalet à imprimer pour un lieu partenaire (brand book 10d) : se plie en deux, une face par côté de la table. */
export default async function ReservedTentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, d] = await Promise.all([params, getAdminData()]);
  const p = d.partners.find((x) => x.id === id);
  if (!p) notFound();
  const url = `${SITE_URL}/?utm_source=chevalet&utm_medium=qr&utm_campaign=${encodeURIComponent(p.id)}`;
  const qr = await qrSvg(url);
  const face = (
    <div className="grid aspect-[1.55] place-items-center content-center gap-1 rounded-xl border border-dashed border-plum-200 bg-cream p-6 text-center print:[print-color-adjust:exact]">
      <MonogramSvg className="h-9 w-auto text-plum-900" />
      <span className="font-display text-5xl text-plum-900">Réservé</span>
      <span className="text-xs tracking-[0.2em] text-muted uppercase">The Host Club · {p.name}</span>
      <span className="mt-2 block w-28 overflow-hidden rounded-md [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
      <span className="text-xs text-muted">Scannez pour découvrir nos expériences</span>
    </div>
  );
  return (
    <>
      <p className="mb-2 text-sm print:hidden"><Link href={`/admin/partenaires/${p.id}`} className="text-plum-900">← {p.name}</Link></p>
      <PageHeader title="Chevalet « Réservé »" subtitle="Imprimez en A4 paysage, pliez en deux le long du pointillé." actions={<PrintButton label="Imprimer / PDF" />} />
      <div className="mx-auto grid max-w-3xl gap-0">
        <div className="rotate-180">{face}</div>
        <div className="border-t-2 border-dashed border-plum-200" aria-hidden />
        {face}
      </div>
    </>
  );
}
