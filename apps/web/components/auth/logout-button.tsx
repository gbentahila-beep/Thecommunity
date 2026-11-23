"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { logout } from "@/lib/auth/client";

export function LogoutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        router.replace("/");
        router.refresh();
      }}
      className="btn btn-secondary w-full"
    >
      <LogOut className="size-[18px]" strokeWidth={1.8} aria-hidden />
      {t("logout")}
    </button>
  );
}
