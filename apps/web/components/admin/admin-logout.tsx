"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth/client";

export function AdminLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        router.push("/");
        router.refresh();
      }}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-white hover:text-ink"
    >
      <LogOut className="size-4" aria-hidden />
      Se déconnecter
    </button>
  );
}
