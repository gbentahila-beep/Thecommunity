"use client";

import { signOut, type User } from "firebase/auth";
import { firebase } from "@/lib/firebase/client";

/** Traduit un code d'erreur Firebase Auth en clé de message (auth.errors.*). */
export function authErrorKey(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(code)) return "invalidCredentials";
  if (code === "auth/email-already-in-use") return "emailInUse";
  if (code === "auth/weak-password") return "weakPassword";
  if (code === "auth/invalid-email" || code === "auth/missing-email") return "invalidEmail";
  if (code === "auth/too-many-requests") return "tooManyRequests";
  if (code === "auth/network-request-failed") return "network";
  if (code === "auth/user-disabled") return "suspended";
  return "generic";
}

/** Crée le cookie de session httpOnly côté serveur à partir d'une connexion fraîche. */
export async function startServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
  if (!res.ok) throw Object.assign(new Error("session"), { code: "session-failed" });
}

export async function logout() {
  await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
  await signOut(firebase().auth).catch(() => undefined);
}

/** N'accepte que des chemins internes (pas de redirection vers un autre site). */
export function safeNext(value: string | null | undefined, fallback = "/espace") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
