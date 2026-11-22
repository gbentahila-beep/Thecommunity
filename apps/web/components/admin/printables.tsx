import { BrandLogo } from "@/components/brand/brand-mark";

/** Supports imprimables aux couleurs de la marque (brand book 10d) : marque-place, numéro de table, carte de bienvenue. */
export function PlaceCard({ name, table }: { name: string; table?: string }) {
  return (
    <li className="grid aspect-[1.7] place-items-center content-center gap-1 rounded-xl border border-dashed border-brand-200 bg-cream text-center break-inside-avoid">
      <BrandLogo className="h-8" />
      <span className="font-display text-2xl text-brand-900">{name}</span>
      {table && <span className="text-[10px] tracking-[0.16em] text-muted uppercase">{table}</span>}
    </li>
  );
}

export function TableNumberCard({ label }: { label: string }) {
  const n = label.match(/\d+/)?.[0];
  return (
    <div className="grid aspect-[1.2] place-items-center rounded-xl bg-ciel p-4 break-inside-avoid print:[print-color-adjust:exact]">
      <div className="grid justify-items-center rounded-lg bg-cream px-8 py-4">
        <span className="text-[11px] tracking-[0.18em] text-muted uppercase">{n ? "Table" : label}</span>
        {n && <span className="font-display text-6xl leading-none text-brand-900">{n}</span>}
        <BrandLogo className="mt-1 h-7" />
      </div>
    </div>
  );
}

export function WelcomeCard({ questions }: { questions: string[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white break-inside-avoid">
      <div className="h-10 bg-ciel print:[print-color-adjust:exact]" />
      <div className="grid gap-2 p-4">
        <span className="font-display text-xl text-brand-900">Bienvenue à table</span>
        <span className="text-[11px] tracking-[0.12em] text-muted uppercase">Pour lancer la conversation</span>
        <ol className="list-decimal space-y-1 ps-5 text-sm">{questions.map((q) => <li key={q}>{q}</li>)}</ol>
        <BrandLogo alt="Wenzy" className="mt-1 h-8 self-start" />
      </div>
    </div>
  );
}
