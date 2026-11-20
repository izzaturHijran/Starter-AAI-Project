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

---

# Budiman HRMS – Tasks (Leave Request)

> **Scope:** the Leave Request module, per the "Requirements (Leave
> Request)" and "Design (Leave Request)" sections just added. Login tasks
> 1–11 above stay Done and untouched.
>
> Same way of working: one task at a time, in order, High first; before
> Next.js code the AI reads the relevant guide in
> `node_modules/next/dist/docs/`; Conventional Commits per task; the AI
> flips Status to Done when a task's check passes.
>
> **Priority.** Every task is **High**, **Medium** or **Low**. Do High
> first. Do Low only if time is left, and only if you ask.

| Status | # | Task | Priority | Checks (from requirements) |
|--------|---|------|----------|----------------------------|
| Done | 12 | Database: `LeaveRequest` table + enums | High | Design §1 (feeds AC-15 … AC-33) |
| Done | 13 | Seed the three extra demo users | High | AC-17, AC-18, AC-25, AC-26 |
| Done | 14 | Status machine + server validators (`src/lib/leave.ts`) | High | AC-16, AC-33 |
| Done | 15 | New request form: submit with validated signer | High | AC-15, AC-16, AC-17, AC-18 |
| Done | 16 | Employee list + own detail page | High | AC-25 |
| Done | 17 | Supervisor queue + sign / reject with remark | High | AC-19, AC-20, AC-26 |
| Done | 18 | Send to HR (shared queue) | High | AC-21 |
| Done | 19 | HR queue + approve / reject, decider recorded, no self-deciding | High | AC-22, AC-23, AC-24, AC-27 |
| Done | 20 | Styled confirmation modal + success banners on every action | High | AC-28 |
| Done | 21 | Withdraw a request | Medium | AC-30, AC-31 |
| Done | 22 | Admin table + read-only detail | Medium | AC-29 |
| Done | 23 | Copy to new request | Low | AC-32 |
| Done | 24 | Final sweep: lint + walk the whole leave checklist | High | AC-15 … AC-33 |

---

## Task 12 – Database: `LeaveRequest` table + enums *(High)*

- **Goal:** The database holds leave requests exactly as designed: one table
  with every field of design §1, the seven-status and five-type enums, and
  real links to `User` for employee, signer and HR officer.
- **Files:** `prisma/schema.prisma` (change: `LeaveRequest` model + `LeaveType`
  / `Status` enums per design §1 and Reference C), new migration.
- **Check:** Run `npx prisma migrate dev` and open Prisma Studio: the
  `LeaveRequest` table shows all 15 fields of design §1 with the enums
  offering exactly Reference C's values; relations point at `User` (a
  request naming a nonexistent `employeeId` is refused). The existing six
  users are still there. `git status` stays clean of `.env`/`dev.db`.

## Task 13 – Seed the three extra demo users *(High)*

- **Goal:** One command adds the Reference-D test users so every division
  rule can be exercised; the original six are untouched and the seed still
  re-runs safely.
- **Files:** `prisma/seed.ts` (change: three new upsert-by-email users from
  design Reference D — Marketing employee + supervisor, Operations employee).
- **Check:** `npx prisma db seed` twice: both succeed, Studio shows nine
  users total — the six of Reference B unchanged plus Employee 2, Supervisor
  3 and Employee 3 with the right divisions/designations and bcrypt hashes
  (search the SQLite file for `password123` → nothing). All three log in
  through `/login` (AC-17/AC-18 prerequisites).

## Task 14 – Status machine + server validators *(High)*

- **Goal:** One tested library owns every leave rule — allowed transitions,
  permission checks (owner / signer / HR officer / no-self-deciding /
  fallback validation) and input validators — so no screen invents its own
  rules.
- **Files:** `src/lib/leave.ts` (create), per design §5.
- **Check:** A throwaway `npx tsx` script (deleted after, not committed)
  proves: every legal transition in design §2 rule 1 is accepted and every
  illegal combination is refused (e.g. Sign while Signed, decide a Withdrawn
  one, owner sends to HR while Pending supervisor, the HR signer deciding
  their own signature); validator refuses end-before-start, blank Other
  text, remark > 200 chars, a signer who is not a same-division Supervisor,
  and an HR signer when the division HAS a supervisor.

## Task 15 – New request form: submit with validated signer *(High)*

- **Goal:** An Employee can submit a valid request that lands as Pending
  supervisor with the right signer — and every bad submission is stopped on
  the server, not just the screen.
- **Files:** `src/app/(protected)/employee/new/page.tsx` (create),
  `src/app/(protected)/employee/actions.ts` (create: `createRequest`), plus
  a `New request` pill on `/employee` linking to it.
- **Check:** As `employee-1` (AC-15): New request → type Annual, dates,
  picker lists only Supervisor 1 and Supervisor 2 → submit → success, row
  `status = PendingSupervisor`, `submittedAt` set, appears on `/employee`.
  (AC-16): end-before-start, blank dates, blank Other text → refused and
  values kept; a DevTools-posted `status=Approved` field is ignored — still
  Pending supervisor. (AC-17): posting `supervisorId` of Supervisor 3 as
  employee-1 → error, nothing saved. (AC-18): as `employee-3` the picker
  shows HR 1/HR 2 with the stand-in note; submitting with HR 1 saves HR 1 as
  `supervisorId`. No confirmation modal yet — that is Task 20.

## Task 16 – Employee list + own detail page *(High)*

- **Goal:** Employees see exactly their own requests with badges, dates and
  remarks, and a detail page of the full record; anyone else gets
  page-not-found.
- **Files:** `src/app/(protected)/employee/page.tsx` (change: own list,
  newest first, status badges), `src/app/(protected)/employee/[id]/page.tsx`
  (create), `src/components/status-badge.tsx` (create).
- **Check:** (AC-25) Create one request as `employee-1` and one as
  `employee-2`: each list shows only their own (type, dates, badge, remark,
  newest first); opening the other's `/employee/[id]` URL → page-not-found
  with no data of it rendered. Detail shows type (incl. Other text), dates,
  signer, and the submitted date. Buttons per machine rows appear (Send to
  HR only on Signed; no actions needed yet — wired in Tasks 18/21).

## Task 17 – Supervisor queue + sign / reject with remark *(High)*

- **Goal:** A supervisor sees only what is addressed to them and can sign or
  reject it; rejections carry a required remark and become final.
- **Files:** `src/app/(protected)/supervisor/page.tsx` (change: queue then
  history), `src/app/(protected)/supervisor/[id]/page.tsx` +
  `actions.ts` (create: `sign`, `rejectBySupervisor`).
- **Check:** (AC-19) As `supervisor-1`: employee-1's Pending request sits in
  the queue → Sign → `status = Signed`, `signedAt` set; as employee-1 the
  list shows Signed. (AC-20) Reject with remark empty → screen refuses AND a
  DevTools-posted empty remark is refused by the server; with remark →
  `RejectedBySupervisor`, remark visible to the employee, no buttons left
  for anyone. (AC-26) `supervisor-3` never sees that request (not in list;
  its detail URL → page-not-found); `supervisor-1`'s list shows only
  requests where they are the signer.

## Task 18 – Send to HR *(High)*

- **Goal:** The owner moves a Signed request into the shared HR queue, and
  only the owner, and only when Signed.
- **Files:** `src/app/(protected)/employee/actions.ts` (change: `sendToHr`),
  row/detail button on `/employee` and `/employee/[id]`.
- **Check:** (AC-21) As `employee-1`, "Send to HR" appears only on Signed
  requests → action → `status = PendingHR`, `sentToHrAt` set, request now
  topmost in `/hr`'s queue (any officer). Posting send for a Pending
  supervisor or an Approved request via DevTools → refused, status
  unchanged; `employee-2` posting employee-1's request id → refused.

## Task 19 – HR queue + approve / reject, decider recorded, no self-deciding *(High)*

- **Goal:** Any HR officer decides requests in the shared queue — except the
  one who signed via the fallback — and the record shows who decided.
- **Files:** `src/app/(protected)/hr/page.tsx` (change: queue + full list
  with "you signed this" flags), `src/app/(protected)/hr/[id]/page.tsx` +
  `actions.ts` (create: `approve`, `rejectByHr`).
- **Check:** (AC-22) As `hr-2`, Approve the Pending HR request → `Approved`,
  `hrOfficerId` = hr-2, `decidedAt` set; employee sees "decided by HR 2".
  (AC-23) As `hr-1`, reject: empty remark refused by screen and server; with
  remark → `RejectedByHR` with reason + decider shown. (AC-24) `employee-3` submits
  with HR 1 as signer, hr-1 signs it, `employee-3` sends it to HR: it then
  shows hr-1 the flag and NO buttons; hr-1's DevTools-posted approve of it
  is refused; hr-2 decides it normally. (AC-27) `/hr` shows the queue newest-first on top, then every
  request ever submitted, including supervisor rejections, with statuses and
  remarks visible.

## Task 20 – Styled confirmation modal + success banners *(High)*

- **Goal:** FR-07 in its agreed look *(interview)*: every action opens the
  lavender-overlay modal first and reports with a green banner after — and
  Cancel truly cancels.
- **Files:** `src/components/confirm-modal.tsx` + `src/components/success-banner.tsx`
  (create), wire into submit, sign, both rejects (remark box inside the
  modal), send to HR, approve, and withdraw (Task 21's button uses it from
  the start); the four home/detail pages (change: read `?msg=` keys).
- **Check:** (AC-28) Walk every action as its role: modal appears BEFORE
  anything happens, Cancel leaves list and database unchanged (re-open the
  row to confirm); Confirm shows the matching green banner naming the
  action, with `role="status"`; the text comes only from the fixed message
  keys — typing a `?msg=<script>…` URL shows nothing custom. Reject modals
  keep their required remark box; empty confirm stays refused.
- **Note:** banner/error colours and modal layout follow design §4 visual
  design; server checks of Tasks 15–19 stay the real gate.

## Task 21 – Withdraw a request *(Medium)*

- **Goal:** The owner can withdraw their own request while Pending
  supervisor or Signed; it becomes final and stays in history.
- **Files:** `src/app/(protected)/employee/actions.ts` (change: `withdraw`),
  buttons on list rows and `/employee/[id]`.
- **Check:** (AC-30) As `employee-1`: Withdraw shows only on Pending
  supervisor / Signed → confirm modal → `Withdrawn`, `decidedAt` set,
  banner, still listed in history; buttons gone on Pending HR / Approved /
  Rejected; DevTools-posted withdraw of a Pending HR row → refused.
  (AC-31) `employee-2` posting employee-1's request id → refused; opening
  it → page-not-found.

## Task 22 – Admin table + read-only detail *(Medium)*

- **Goal:** The Admin audits everything: one table of all requests, newest
  first, with signer and decider, and a detail that cannot change anything.
- **Files:** `src/app/(protected)/admin/page.tsx` (change: the table),
  `src/app/(protected)/admin/[id]/page.tsx` (create, no actions imported).
- **Check:** (AC-29) As `admin@budiman.com`: the table lists every request
  — including Withdrawn and both rejection kinds — newest submitted first,
  with employee, division, type, dates, status badge, signer, HR officer;
  row click → read-only detail with remarks and the dates trail. No button
  in the markup; posting a sign/approve/withdraw action as admin → refused
  by the role check. (Status/division filters are Low — only if time
  remains, per the requirements §5.)

## Task 23 – Copy to new request *(Low)*

- **Goal:** One click rebooks any past request: the form opens prefilled and
  submitting creates a brand-new request.
- **Files:** `src/app/(protected)/employee/page.tsx` + `[id]/page.tsx`
  (change: Copy-to-new links), `src/app/(protected)/employee/new/page.tsx`
  (change: read prefill query params).
- **Check:** (AC-32) From a Rejected or Approved own request → Copy to new
  → the form shows the original type, dates and (where still legal) signer,
  plus the Other text when set; submit → a new `PendingSupervisor` row; the
  original is byte-for-byte unchanged. Same dates as an existing request are
  accepted (no dedupe). Prefill cannot inject a signer outside rule 3 —
  a hand-edited `supervisorId` param is re-validated by the same Task 14
  checks as any other submission.

## Task 24 – Final sweep: lint + walk the whole leave checklist *(High)*

- **Goal:** The leave module is finished and verifiably matches the specs:
  lint clean, every AC-15 → AC-33 check re-run in order, tasks marked Done,
  one Conventional Commit per task.
- **Files:** None new — fixes only, if a check fails (spec first, then
  code).
- **Check:** `npm run lint` passes with no errors. Walk the requirements
  "Acceptance checklist (leave requests)" top to bottom: AC-15 → AC-33 all
  pass using only the nine seeded accounts and `password123` (login checks
  AC-01 → AC-14 re-spot-checked along the way). `npx prisma db seed` re-runs
  cleanly. `git log` shows one Conventional Commit per task.
