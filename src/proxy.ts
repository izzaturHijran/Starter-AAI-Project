// Sliding 30-minute session (02-design.md §2 rules 5–6, AC-09/AC-10), in
// the place Next 16 allows writing cookies outside Server Functions, plus
// the logged-out quick redirect (§2 rule 9: experience only — the real
// gate is the protected layout, which re-verifies signature, expiry, role
// AND the database on every page). This layer never grants access: it
// refreshes verified sessions and turns away absent/tampered/expired
// cookies before any page code runs; the layout would send them to
// /login anyway (verified in Task 9 with this file disabled).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    const session = verifySessionToken(token);
    if (session) {
      // Activity restarts the clock: same user, fresh 30-minute expiry.
      const response = NextResponse.next();
      response.cookies.set(SESSION_COOKIE, createSessionToken(session.uid, session.role), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_DURATION_MS / 1000,
      });
      return response;
    }
  }

  // Absent, tampered or expired: turn away at the door, no page load.
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/employee/:path*", "/supervisor/:path*", "/hr/:path*", "/admin/:path*"],
};
