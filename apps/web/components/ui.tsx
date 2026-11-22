import { ArrowRight, Star } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export function SectionHeading({
  title,
  action,
  as: Tag = "h2",
}: {
  title: ReactNode;
  action?: { href: string; label: string };
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <Tag className="section-title">{title}</Tag>
      {action && (
        <Link href={action.href} className="group hidden shrink-0 items-center gap-1.5 text-sm font-medium text-brand-900 sm:flex">
          {action.label}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function PrimaryLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group btn btn-primary ${className}`}
    >
      {children}
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-4 ${i <= Math.round(value) ? "fill-brand-700 text-brand-700" : "text-brand-200"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function PageShell({ children, className = "", ...rest }: { children: ReactNode; className?: string; "data-testid"?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`} {...rest}>{children}</div>;
}
