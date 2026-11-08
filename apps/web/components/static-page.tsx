import type { ReactNode } from "react";
import { PageShell } from "./ui";

export function StaticPage({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <PageShell className="max-w-3xl py-12">
      <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg leading-relaxed text-ink/80">{intro}</p>}
      {children && <div className="mt-10 space-y-8">{children}</div>}
    </PageShell>
  );
}
