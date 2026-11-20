// Signed session cookie: create, verify, refresh (02-design.md §2 rules 5–6, §5).
// The cookie holds only { uid, role, exp } — never a name, IC number or
// password — signed HMAC-SHA256 with SESSION_SECRET from .env.
// Any edit breaks the signature and counts as logged out.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session";
export const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 min of inactivity

export type SessionPayload = {
  uid: number;
  role: string;
  exp: number; // epoch ms
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error(
      "SESSION_SECRET is not set — copy .env.example to .env and put a random secret there (02-design.md §3)"
    );
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", sessionSecret()).update(data).digest("base64url");
}

// Pure token functions — safe to use from proxy.ts and test scripts too.

export function createSessionToken(
  uid: number,
  role: string,
  expiresAt: Date = new Date(Date.now() + SESSION_DURATION_MS)
): string {
  const payload: SessionPayload = { uid, role, exp: expiresAt.getTime() };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = Buffer.from(sign(data));
  const received = Buffer.from(signature);
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null; // tampered or forged — treat as logged out
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as SessionPayload).uid !== "number" ||
    typeof (payload as SessionPayload).role !== "string" ||
    typeof (payload as SessionPayload).exp !== "number"
  ) {
    return null;
  }

  const session = payload as SessionPayload;
  if (session.exp <= Date.now()) return null; // expired — signed out
  return session;
}

// Cookie helpers — call these from Server Functions (sign in / sign out)
// only: setting or deleting cookies is not allowed during Server Component
// rendering, so pages and layouts verify with readSession() but never write.

export async function setSessionCookie(uid: number, role: string): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(uid, role), {
    httpOnly: true,
    sameSite: "lax",
    // secure whenever served over HTTPS; local dev runs on plain HTTP
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function clearSessionCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
