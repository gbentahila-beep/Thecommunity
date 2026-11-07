import { Link } from "@/i18n/navigation";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-[1.65rem] leading-none font-semibold tracking-tight text-plum-900 ${className}`}
      aria-label="The Host Club — accueil"
    >
      <span lang="en" dir="ltr" className="font-[family-name:var(--font-fraunces)]">
        The Host Club<span className="text-plum-500">.</span>
      </span>
    </Link>
  );
}
