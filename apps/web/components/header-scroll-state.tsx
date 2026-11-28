"use client";

import { useEffect } from "react";

/** Pose data-scrolled sur <html> dès qu'on a fait défiler : le menu de l'accueil redevient opaque (globals.css). */
export function HeaderScrollState() {
  useEffect(() => {
    const el = document.documentElement;
    const on = () => (window.scrollY > 24 ? el.setAttribute("data-scrolled", "") : el.removeAttribute("data-scrolled"));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return null;
}
