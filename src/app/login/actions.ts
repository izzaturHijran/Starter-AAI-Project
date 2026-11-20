"use server";

import { redirect } from "next/navigation";
import { authenticate, homePathFor } from "@/lib/auth";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

// Sign in (01-requirements.md AC-01 … AC-04). Every failure goes back to
// /login with the same generic flag; the typed email is returned so the
// box keeps it, and the fresh render leaves the password empty.
export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await authenticate(email, password);
  if (!user) {
    redirect(`/login?error=invalid&email=${encodeURIComponent(email.trim())}`);
  }

  await setSessionCookie(user.id, user.role);
  redirect(homePathFor(user.role));
}

// Sign out (01-requirements.md AC-08): clears the cookie and returns to
// /login with a confirmation message. Nothing is cached on the way back —
// signed-in pages carry no-store headers (next.config.ts) and every page
// re-checks the session on the server, so the Back button recovers nothing.
export async function signOut(): Promise<void> {
  await clearSessionCookie();
  redirect("/login?signedOut=1");
}
