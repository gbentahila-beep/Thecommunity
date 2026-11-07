"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AdminNav } from "./admin-nav";

export function MobileAdminMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        className="grid size-10 place-items-center rounded-full bg-white text-plum-900 shadow-card"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open && (
        <div id="admin-mobile-nav" className="absolute inset-x-0 top-full z-40 border-b border-line bg-cream p-3 shadow-float">
          <AdminNav onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
