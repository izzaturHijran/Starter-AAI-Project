# Budiman HRMS – Tasks (Login)

> **This file answers:** In what order do we build it, and how do we check
> each step?
>
> Build one task at a time, in order. When a task is done, the AI changes
> its Status to Done. At the end, you check the whole app against the specs.
> If something is wrong, fix the spec first, then ask the AI to rebuild.
>
> **Scope:** login only, per `01-requirements.md` and `02-design.md`.
> Before writing Next.js code, the AI reads the relevant guide in
> `node_modules/next/dist/docs/` (AGENTS.md rule). Every commit uses
> Conventional Commits (`feat: …`, `fix: …`, `docs: …`, `chore: …`).

**Priority.** Every task is **High**, **Medium** or **Low**. Do High first.
Do Low only if time is left, and only if you ask.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| Done | 1 | Database: Prisma + SQLite + `User` table | High | Design §1 (feeds AC-12, AC-13) |
| Done | 2 | Seed the six demo users | High | AC-12, AC-13 |
| Done | 3 | Session cookie library | High | AC-11, AC-14 |
| Done | 4 | Protected layout, header and the four role home pages | High | AC-05, AC-06 |
| Done | 5 | Login page and sign-in | High | AC-01, AC-02, AC-03, AC-04, AC-07 |
| Done | 6 | Sign out | High | AC-08 |
| Done | 7 | 30-minute inactivity expiry | High | AC-09, AC-10 |
| Done | 8 | Root page `/` redirects | High | AC-05 (the `/` case), AC-01 (full flow) |
| Done | 9 | Middleware quick redirect | Medium | AC-05 (earlier redirect) |
| Done | 10 | Log failed sign-ins | Low | U10 (requirements §3; no AC) |
| Done | 11 | Final sweep: lint + walk the whole checklist | High | AC-01 … AC-14 |

---

## Task 1 – Database: Prisma + SQLite + `User` table *(High)*

- **Goal:** The app has a real database: one SQLite file with the `User`
  table exactly as designed, ready to hold the demo users.
- **Files:** `prisma/schema.prisma` (create), `prisma.config.ts` or
  `package.json` prisma/seed entries (create), `src/lib/db.ts` (create),
  `.env` (create: `DATABASE_URL`), `.gitignore` (change: add `.env`,
  `dev.db`).
- **Check:** Run `npx prisma migrate dev` and `npx prisma studio`.
  The SQLite file exists, the `User` table shows the nine fields from
  design §1 (`id`, `name`, `icNumber`, `email`, `passwordHash`, `role`,
  `division`, `designation`, `createdAt`), and `email` is marked unique.
  Try adding two rows with the same email in Studio — the second must
  fail. `git status` must not list `.env`.

## Task 2 – Seed the six demo users *(High)*

- **Goal:** One command loads the six people from the HRMS doc, with
  `password123` stored only as a bcrypt hash.
- **Files:** `prisma/seed.ts` (create), seed script entry in
  `package.json` / Prisma config (create).
- **Check:** Run `npx prisma db seed`, then open the users in Prisma
  Studio: the six rows from design Reference B exist with the right names,
  IC numbers, roles, divisions and designations. Each `passwordHash` starts
  with `$2a$`/`$2b$` — searching the database file for `password123` finds
  nothing. Run the seed again: it succeeds with no duplicate errors.
  (AC-12, AC-13)

## Task 3 – Session cookie library *(High)*

- **Goal:** A tested piece of code that can create, verify and refresh the
  signed session cookie (id + role + expiry, HMAC-SHA256, 30-minute
  expiry, `httpOnly`, `sameSite=Lax`, `secure` over HTTPS) — before any
  screen uses it.
- **Files:** `src/lib/session.ts` (create), `.env` (change: add
  `SESSION_SECRET`), `.env.example` (create).
- **Check:** A throwaway script run with `npx tsx` (not committed, or
  deleted after): create a session for user id 1 → verify returns the user
  id and role; change one character of the token → verify rejects it as
  logged out; create a session with expiry in the past → verify rejects
  it. `.env.example` contains a placeholder, never a real secret;
  `git status` never shows `.env`. (AC-11, AC-14)

## Task 4 – Protected layout, header and the four role home pages *(High)*

- **Goal:** `/employee`, `/supervisor`, `/hr` and `/admin` exist behind one
  protected layout that refuses logged-out visitors and wrong roles on the
  server, and shows every signed-in user their name, role and a (still
  non-working) "Sign out" button.
- **Files:** `src/lib/auth.ts` (create: `requireUser()`, `requireRole()`),
  `src/app/(protected)/layout.tsx` (create),
  `src/app/(protected)/employee/page.tsx`,
  `src/app/(protected)/supervisor/page.tsx`, `src/app/(protected)/hr/page.tsx`,
  `src/app/(protected)/admin/page.tsx` (create).
- **Check:** With no cookie (or after deleting it in DevTools), open each
  of the four addresses directly → each redirects to `/login` showing no
  data (AC-05). With a valid employee cookie hand-made via the Task 3
  library (or after Task 5, by signing in as `employee-1@budiman.com`),
  open `/admin`, `/hr`, `/supervisor` → each is refused and redirected to
  `/employee`, nothing of the other role rendered (AC-06). Your own pages
  show the header with name, role and the button, and the responses carry
  no-store cache headers.

## Task 5 – Login page and sign-in *(High)*

- **Goal:** `/login` works end to end: a demo account signs in and lands on
  its own home page; every failure shows the one generic message.
- **Files:** `src/app/login/page.tsx` (create), `src/app/login/actions.ts`
  (create: `signIn`), `src/lib/auth.ts` (change: `signIn` logic with
  bcrypt compare — including a fixed dummy compare when the email is
  unknown, so timing never betrays whether an account exists; server-side
  email and `@budiman.com` validation).
- **Check:** Sign in with each of the four roles' demo accounts → land on
  `/employee`, `/supervisor`, `/hr`, `/admin` (AC-01). Wrong password,
  unknown email `nobody@budiman.com`, and `someone@gmail.com` → all show
  exactly "Email address or password is incorrect", email still in the
  box, password box empty (AC-02, AC-03, AC-04). Already signed in, open
  `/login` → bounced to your home page (AC-07). DevTools shows the session
  cookie present and `httpOnly`.

## Task 6 – Sign out *(High)*

- **Goal:** "Sign out" in the header logs you out properly: cookie gone,
  `/login` with "You have been signed out", and the Back button recovers
  nothing.
- **Files:** `src/app/login/actions.ts` (change: add `signOut`),
  `src/app/login/page.tsx` (change: show the signed-out message),
  `src/app/(protected)/layout.tsx` (change: wire the header button).
- **Check:** Sign in as `employee-1@budiman.com`, click "Sign out" → land
  on `/login` with the message, and the cookie is gone in DevTools (AC-08).
  Press Back → you are not viewing cached pages; anything you click sends
  you to `/login` again.

## Task 7 – 30-minute inactivity expiry *(High)*

- **Goal:** The session dies 30 minutes after the last activity, and any
  activity restarts the clock — so idle laptops are safe and busy users
  are never cut off.
- **Files:** `src/proxy.ts` (create: every verified request on a protected
  path re-issues the cookie with expiry 30 minutes ahead — user-approved
  placement, since Server Components cannot write cookies; the layout's
  `requireUser()` stays the real access gate).
- **Check:** Sign in, leave the app untouched 31 minutes, click any link →
  land on `/login` (AC-09). Sign in again and move between pages every
  20 minutes for an hour → never bounced (AC-10). In DevTools, the
  cookie's expiry visibly moves forward after each request.

## Task 8 – Root page `/` redirects *(High)*

- **Goal:** Opening `http://localhost:3000` behaves per design §4: logged
  out → `/login`; logged in → your role's home page. The whole sign-in
  loop works from the bare address with no links memorised.
- **Files:** `src/app/page.tsx` (change from the starter landing page).
- **Check:** Logged out, open `/` → `/login` (AC-05). Sign in as
  `hr-1@budiman.com`, open `/` again → `/hr` with no form flash in
  between (AC-01 flow). Logged-out Back/Forward around the site never
  shows another role's data.

## Task 9 – Middleware quick redirect *(Medium)*

- **Goal:** Logged-out requests are turned away at the door by middleware
  instead of loading a page first — pure experience; the Task 4 server
  checks stay the real gate (design §2 rule 9).
- **Files:** `src/proxy.ts` (change: logged-out requests on protected paths
  are redirected before any page code runs; Next 16 renamed middleware to
  `proxy.ts` — verified against `node_modules/next/dist/docs/` first, same
  file as Task 7's session refresh).
- **Check:** With the cookie deleted, request `/admin` directly → the
  browser arrives at `/login` without the admin page's code running.
  Then re-verify AC-05 and AC-06 still hold **with the middleware
  disabled** (temporarily), proving the layout checks alone are enough.

## Task 10 – Log failed sign-ins *(Low)*

- **Goal:** Each failed sign-in attempt records the email and the time in
  the server log — nothing else — so repeated guessing can be reviewed
  (U10).
- **Files:** `src/lib/auth.ts` (change: log on failure).
- **Check:** Fail two sign-ins (`nobody@budiman.com`, then a wrong
  password for `employee-1@budiman.com`). The terminal shows two lines with
  email + timestamp only. Search the log output for `password123` — it
  must not appear (together with AC-12).

## Task 11 – Final sweep: lint + walk the whole checklist *(High)*

- **Goal:** The login module is finished and verifiably matches the specs:
  lint clean, every acceptance check re-run in order, every task marked
  Done, work committed with Conventional Commits messages.
- **Files:** None new — fixes only, if a check fails (spec first, then
  code).
- **Check:** `npm run lint` passes with no errors. Walk `01-requirements.md`
  §4 top to bottom: AC-01 → AC-14 all pass, using only the six demo
  accounts and `password123`. `git log` shows one Conventional Commit per
  task.
