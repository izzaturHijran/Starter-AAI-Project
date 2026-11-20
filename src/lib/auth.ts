// Server-side gate and sign-in logic (02-design.md §2 rules 1–3, 7, 9):
// the session signature/expiry/role are verified here, and the role is
// re-checked against the database — never trusted from the cookie alone.
// Redirects are convenience only; this module is the real gate.
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { readSession } from "./session";

export type SignedInUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

// Work emails only; checked on the server, never trusted from the form
// (02-design.md §6). AC-02/03/04: every failure looks identical.
const WORK_EMAIL = /^[^\s@]+@budiman\.com$/i;

// Fixed cost-10 bcrypt hash of a throwaway string. Compared against when
// the email is unknown so a failed sign-in costs the same whether or not
// the account exists (02-design.md §2 rule 7 — no timing oracle).
const DUMMY_HASH =
  "$2b$10$cQuSFuodt8WFHG.R5ehocu2213kTnxm/C.USkIO2ibe6fBoAX7elm";

export function homePathFor(role: string): string {
  return `/${role.toLowerCase()}`;
}

// null unless the cookie verifies AND the user still exists with the same
// role. Used for checks that must not redirect (the login page).
export async function getCurrentUser(): Promise<SignedInUser | null> {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  // No such user any more, or the role no longer matches the cookie
  // (tampering or an admin change): treat as logged out.
  if (!user || user.role !== session.role) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function requireUser(): Promise<SignedInUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function requireRole(user: SignedInUser, role: string): void {
  if (user.role !== role) redirect(homePathFor(user.role));
}

// U10: each failed attempt records email + time, nothing else. Newlines are
// stripped so a crafted "email" cannot forge extra log lines. No password,
// ever (AC-12).
function logFailedSignIn(email: string): void {
  const safe = email.replace(/[\r\n]/g, "").slice(0, 254);
  console.log(`Failed sign-in attempt: email="${safe}" at ${new Date().toISOString()}`);
}

// Returns the user on success, null on ANY failure (unknown email, wrong
// password, non-work email) — callers must show one generic message.
export async function authenticate(
  email: string,
  password: string
): Promise<SignedInUser | null> {
  const normalized = email.trim().toLowerCase();

  if (!normalized || !WORK_EMAIL.test(normalized)) {
    await compare(password, DUMMY_HASH); // keep the response time uniform
    logFailedSignIn(email.trim());
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const passwordOk = await compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    logFailedSignIn(email.trim());
    return null;
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
