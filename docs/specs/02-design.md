# Budiman HRMS – Design (Login)

> **Scope of this file right now:** login only, matching
> `docs/specs/01-requirements.md`. The leave request design comes later and
> is appended below, not written over. If this file and the requirements
> disagree, fix the requirements first, then this file.

## 1. Tables

### `User` – one row per person who can log in

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `name` | text | yes | Full name, e.g. "Supervisor 1" |
| `icNumber` | text | yes | Identity card number, format `xx-xxxxxx` (two digits, hyphen, six digits) |
| `email` | text | yes | Work email, always ends `@budiman.com`. **Unique** — it is the login name |
| `passwordHash` | text | yes | bcrypt hash of the password (starts `$2a$`/`$2b$`). The plain password is never stored in this column, in any other column, or in logs |
| `role` | text (enum) | yes | Exactly one of `Employee`, `Supervisor`, `HR`, `Admin` (Reference A) |
| `division` | text | yes | One of the fixed divisions (Reference A). `Admin` is also a value, used only by the Admin account |
| `designation` | text | yes | Job title, one of the titles for that division (Reference A) |
| `createdAt` | date | yes | Set automatically when the account is created |

No other tables exist yet. `LeaveRequest` and its fields arrive with the
leave module; they will be added in a new section below this point.

## 2. Business rules

1. **Login before anything.** Only `/login` responds to a logged-out visitor.
   Every other route, and every server action, requires a valid session
   first; anonymous requests are redirected to `/login`.
2. **One role, one home.** Each user has exactly one role, and the role
   decides which pages they can open: Employee → `/employee`, Supervisor →
   `/supervisor`, HR → `/hr`, Admin → `/admin`. Opening another role's page
   is refused **on the server**, not just by hiding links.
3. **Email is the login name.** `email` is unique and must end
   `@budiman.com`. The domain and format are re-checked on the server, never
   trusted from the form alone.
4. **Passwords are only ever a bcrypt hash.** The hash is created with
   bcryptjs; the plain password never reaches the database, the logs, the
   URL, or an error message.
5. **The session is a signed cookie, and it is small.** It holds only
   `userId`, `role`, and an expiry time, signed with HMAC-SHA256 using a
   secret from `.env` (never committed). Any edit to the cookie breaks the
   signature and counts as logged out.
6. **30 minutes of inactivity, refreshed by activity.** Each request whose
   session checks out re-issues the cookie with an expiry 30 minutes ahead.
   An idle user's next click sends them to `/login`; an active user is never
   cut off.
7. **Sign-in failures never talk.** Unknown email, wrong password and a
   non-`@budiman.com` email all produce the exact same message:
   *"Email address or password is incorrect."* The email stays filled in,
   the password field clears. The password is bcrypt-compared even when the
   email is unknown (against a fixed dummy hash), so response times do not
   reveal whether an account exists.
8. **Sign out clears everything client-side.** Signing out deletes the
   cookie and returns to `/login` with "You have been signed out". Signed-in
   pages are sent with no-store cache headers, so the Back button cannot
   recover them.
9. **The server always has the last word.** The session's signature,
   expiry and role are verified in the protected layout (every page) *and*
   again inside every server action. A middleware redirect is only a quick
   first line for user experience — it is never the check anything depends
   on.
10. **Seeding is safe to repeat.** `npx prisma db seed` upserts the six
    demo users by email and hashes `password123` at write time. The app has
    no sign-up screen; only the seed creates accounts at this stage.
11. **Failed sign-ins are recorded, carefully.** A failed attempt logs the
    email and time only — never the password, never a session token.

## 3. Technology

Only what the HRMS doc §7.3 pins; versions come from `package.json` and are
not changed.

| Part | Choice | In plain words |
|------|--------|----------------|
| Web framework | Next.js 16 (TypeScript, App Router) | Screens and server logic live in one project; forms post to server actions |
| Database | SQLite through Prisma 6 | No database server to install; the data is one file |
| Styling | Tailwind CSS 4 | Styles sit next to each screen |
| Login | Signed session cookie (HMAC-SHA256), passwords hashed with bcryptjs | Simple and safe, with no extra accounts or auth library |
| Forms and buttons | Server actions | No separate API to design |
| Session secret | `SESSION_SECRET` in `.env`, gitignored | The key that signs the cookie; random, never committed |

## 4. Screens (routes)

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/` | Anyone | No screen of its own: logged out → redirect to `/login`; logged in → redirect to the role's home page | To do |
| `/login` | Logged-out visitors | Email box, password box, "Sign in" button. Generic error on failure ("Email address or password is incorrect", email kept, password cleared); "You have been signed out" after signing out. A logged-in user who opens it is redirected to their home page. No demo-account hints | To do |
| `/employee` | Employee | Home page placeholder for now, with the shared header: name, role, and "Sign out". Leave features arrive in the next spec section | To do |
| `/supervisor` | Supervisor | Same shape as `/employee`, for the Supervisor role | To do |
| `/hr` | HR | Same shape as `/employee`, for the HR role | To do |
| `/admin` | Admin | Same shape as `/employee`, for the Admin role. View only, now and always | To do |

Wrong-role access (e.g. an Employee typing `/admin`) is refused server-side
by redirecting to the user's own home page — the other role's page is never
rendered first.

### Visual design (shared by `/login` and the home pages)

Based on the mockup supplied by the user (a split white card on a lavender
page). Look only — behaviour, text and checks from §2 stay exactly as they
are.

- **Page:** light lavender background (≈ `#C9BCEA`); one white card,
  rounded 24 px corners, soft shadow, centred on the screen.
- **Login card:** two columns — white form panel (left, ~4/9) and a purple→
  blue gradient hero (right, ~5/9); stacked on small screens.
  - Form panel: brand top-left (small solid deep-purple circle with "B" +
    "Budiman HRMS"); centred indigo (≈ `#5146C6`) "Login" heading; Email
    and Password are underline-only inputs (no box border, grey
    placeholders, labels kept for screen readers); the submit button is a
    deep-purple (≈ `#4A0AAE`) full-width **pill** with white uppercase
    text ("SIGN IN"). The error ("…is incorrect") and signed-out messages
    keep their text and `role="alert"`/`role="status"`, restyled as
    rounded strips.
  - Hero panel: diagonal gradient (violet-600 → blue-500), large white
    "Welcome to **Budiman HRMS**" (light weight, last words bold), one
    muted-white subtitle line, and three static decorative dots at the
    bottom-left.
- **Home card:** white card on lavender; inside it a slim header bar
  (brand left; right: user name, purple role-badge pill, deep-purple pill
  "SIGN OUT" button) and a body holding the same gradient hero panel with
  the "{Role} home" heading and the welcome line.
- **Not copied from the mockup, on purpose:** "Don't have an account? Sign
  Up", "Forgot Your Password?" and the live carousel dots. The HRMS has no
  sign-up or password-reset feature (§2 rule 10), so those would be dead
  links — links that *do something* (nothing), which changes what the
  screens do. The mockup's photograph is replaced by the CSS gradient: no
  image asset to licence and nothing to load.

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | The `User` model from §1 |
| `prisma/seed.ts` | The six demo users from Reference B, password hashed at write time, upsert-by-email so it can run twice |
| `src/lib/db.ts` | One shared Prisma client |
| `src/lib/session.ts` | Create, verify and refresh the signed session cookie (HMAC-SHA256 sign/verify, 30-minute expiry); sign out = delete cookie |
| `src/lib/auth.ts` | `signIn` logic (find user, bcrypt compare — dummy compare for unknown emails) and `requireUser()` / `requireRole(role)` helpers every protected page and action calls |
| `src/app/login/page.tsx` | The login form screen |
| `src/app/login/actions.ts` | Server actions: `signIn` (sets the cookie, redirects to the role's home) and `signOut` (deletes the cookie, back to `/login`) |
| `src/app/(protected)/layout.tsx` | Layout wrapping all signed-in pages: calls `requireUser()`, renders the lavender page, white card and header (brand, name, role badge, "Sign out") in the shared visual style (§4) |
| `src/app/(protected)/employee/page.tsx` | Employee home placeholder |
| `src/app/(protected)/supervisor/page.tsx` | Supervisor home placeholder |
| `src/app/(protected)/hr/page.tsx` | HR home placeholder |
| `src/app/(protected)/admin/page.tsx` | Admin home placeholder |
| `src/app/page.tsx` | The redirect-only root page (`/`) |
| `src/proxy.ts` | Next 16 renamed middleware to `proxy.ts` (verified in `node_modules/next/dist/docs/`): quick redirect of logged-out requests on protected paths to `/login` (experience only — §2 rule 9) and the sliding 30-minute cookie refresh (§2 rule 6) |
| `next.config.ts` | `headers()`: `no-store, must-revalidate` on `/employee|supervisor|hr|admin` (Server Components cannot set headers, so cache policy lives here) |
| `.env` (gitignored), `.env.example` | `SESSION_SECRET` — real value in `.env`, a placeholder in `.env.example` so the repo explains itself |

## 6. Security (in plain words)

- **Every page checks:** the protected layout verifies the cookie's
  signature, expiry and role before rendering, and shows only that role's
  page.
- **Every action checks again on the server:** each server action calls
  `requireUser()` / `requireRole()` itself — a forged fetch to an action is
  refused even if the page check were skipped.
- **The cookie** is `httpOnly` (JavaScript can't read it), `sameSite=Lax`
  (cross-site requests don't carry it), and `secure` when served over
  HTTPS. It carries only id, role and expiry — never name, IC number or
  password.
- **The secret** lives only in `.env`, which `.gitignore` keeps out of
  commits. Without a valid secret nothing can forge a session.
- **Passwords** exist in plain text only in the form, in memory briefly for
  the bcrypt check, then nowhere. Logs get email + time for failures, never
  passwords or tokens.
- **Input on the login form is validated on the server** (email shape,
  `@budiman.com` domain), and all messages shown back are generic — the
  screen never echoes anything the server did not confirm.

## 7. Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install the pinned dependencies |
| `npx prisma migrate dev` | Create/update the SQLite database from the schema |
| `npx prisma db seed` | Load the six demo users (safe to re-run) |
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run lint` | Check the code before finishing any piece of work |

---

# Reference

## Reference A. Fixed lists

- **Roles:** `Employee`, `Supervisor`, `HR`, `Admin`
- **Divisions:** `Finance`, `Human Resources`, `Information Technology`,
  `Operations`, `Marketing` — plus `Admin` for the Admin account only
- **Designations by division:**
  - Finance: Finance Manager, Accountant, Accounts Clerk
  - Human Resources: HR Manager, HR Officer, HR Assistant
  - Information Technology: IT Manager, Software Developer, IT Support Officer
  - Operations: Operations Manager, Operations Supervisor, Operations Executive
  - Marketing: Marketing Manager, Marketing Executive, Marketing Assistant
  - Admin: Admin Manager
- **Login rules:** email must end `@budiman.com`; IC number format
  `xx-xxxxxx`; session expiry 30 minutes after the last activity; bcrypt
  cost as bcryptjs default

## Reference B. Demo data (loaded by `prisma/seed.ts`, all with password `password123`)

| Email | Name | IC No. | Role | Division | Designation |
|-------|------|--------|------|----------|-------------|
| `employee-1@budiman.com` | Employee 1 | 00-148888 | Employee | Finance | Accounts Clerk |
| `supervisor-1@budiman.com` | Supervisor 1 | 00-157777 | Supervisor | Finance | Finance Manager |
| `supervisor-2@budiman.com` | Supervisor 2 | 00-166666 | Supervisor | Finance | Accountant |
| `hr-1@budiman.com` | HR 1 | 00-175555 | HR | Human Resources | HR Officer |
| `hr-2@budiman.com` | HR 2 | 00-184444 | HR | Human Resources | HR Officer |
| `admin@budiman.com` | Admin | 00-193333 | Admin | Admin | Admin Manager |

The employee and both supervisors share the Finance division, so the
employee can pick either supervisor in the leave module later.

---

# Budiman HRMS – Design (Leave Request)

> **Scope of this section:** the Leave Request module, matching
> `01-requirements.md` "Requirements (Leave Request)" (stories U11–U23,
> checks AC-15 … AC-33). The login design above is unchanged; the same stack,
> session rules and visual language apply. If this section and the
> requirements disagree, fix the requirements first, then this file.

## 1. Tables

### `LeaveRequest` – one row per leave request

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `employeeId` | number → `User.id` | yes | The Employee who submitted it. Set by the server from the session, never from the form |
| `supervisorId` | number → `User.id` | yes | The signer. Must be a `Supervisor` in the submitter's division, or — only when the submitter's division has no Supervisor — an `HR` user (HR fallback, *(interview)*) |
| `leaveType` | text (enum) | yes | One of `Annual`, `Maternity`, `Unpaid`, `Compassionate`, `Other` (Reference C) |
| `otherLeaveType` | text | only when `Other` | What "Other" leave is for. Required exactly when `leaveType = Other`, empty/blank is refused; max 200 characters |
| `startDate` | date | yes | First day of leave. Server checks it is a real calendar date (ISO `yyyy-mm-dd`) |
| `endDate` | date | yes | Last day of leave. Server checks `endDate ≥ startDate`. Same-day (start = end) and past dates are allowed; no maximum span *(interview)* |
| `status` | text (enum) | yes | One of the seven statuses in Reference C. Set and changed only by the server through the actions below — never from a form |
| `supervisorRemark` | text | when rejected by the signer | The signer's reason. Required when `status = RejectedBySupervisor`; may also carry a note when signing; max 200 characters |
| `hrOfficerId` | number → `User.id` | when HR decides | The HR officer who approved or rejected, recorded at decision time (FR-05) |
| `hrRemark` | text | when rejected by HR | HR's reason. Required when `status = RejectedByHR`; max 200 characters |
| `submittedAt` | date | yes | Set automatically at creation |
| `signedAt` | date | no | Set when the signer signs |
| `sentToHrAt` | date | no | Set when the employee sends it to HR (audit trail for the queue) |
| `decidedAt` | date | no | Set when it reaches any final status (Approved, either Rejected, Withdrawn) |

Leave types and statuses are **fixed lists, not tables** (Reference C),
exactly as `division` and `role` are handled for `User` in §1 above — the
form renders them as choices and the server validates every submitted value
against the list.

## 2. Business rules

Rules of login §2 (1–11) keep applying to every page and action below.

1. **Forward-only status machine.** A request moves only through the table
   below; every other transition is refused. The server always reads the
   row's current status from the database and checks the action against it —
   the screen's buttons are a convenience, never the gate.

   | Current status | Who may act | Action | Becomes | Extra |
   |----------------|-------------|--------|---------|-------|
   | Pending supervisor | the assigned signer | Sign | Signed | sets `signedAt`; remark optional |
   | Pending supervisor | the assigned signer | Reject with remark | Rejected by supervisor | `supervisorRemark` required |
   | Pending supervisor | the owner | Withdraw | Withdrawn | final; no remark needed |
   | Signed | the owner | Send to HR | Pending HR | sets `sentToHrAt` |
   | Signed | the owner | Withdraw | Withdrawn | final |
   | Pending HR | any HR officer **except the one who signed it** | Approve | Approved | sets `hrOfficerId`, `decidedAt` |
   | Pending HR | any HR officer **except the one who signed it** | Reject with remark | Rejected by HR | `hrRemark`, `hrOfficerId`, `decidedAt` |
   | Approved / Rejected by supervisor / Rejected by HR / Withdrawn | — | nothing | — | final, read-only for everyone |

2. **Only Employees submit.** Supervisors and HR only decide (doc rule 2);
   Admin never mutates — no admin action exists in the code at all.

3. **The signer is validated on the server.** On submit the chosen signer
   must be (a) role `Supervisor` with the same `division` as the submitter,
   or (b) role `HR` when, and only when, the submitter's division has no
   `Supervisor` user at all *(interview)*. The form lists exactly those
   choices (ordered by name); anything else is refused.

4. **No self-deciding.** The HR officer recorded as `supervisorId` (possible
   only via the fallback) can never approve or reject that request; the
   other officers must *(interview)*. The fallback signer can still **sign**
   their own request — that is their job as signer — only the HR decision is
   blocked. The HR detail hides the buttons and shows "you signed this
   request"; the server refuses the action anyway.

5. **Rejections always carry a reason.** `supervisorRemark` is required when
   the signer rejects, `hrRemark` when HR rejects. Trimmed, non-empty, ≤ 200
   characters, checked on the server (doc rule and FR-03/FR-05).

6. **Ownership actions belong to the owner.** Send to HR, Withdraw and Copy
   to new are available only to the Employee whose `employeeId` it is; the
   buttons appear only where the status machine allows (requirements
   U15/U22).

7. **Whole days, loose dates.** Both dates required, `endDate ≥ startDate`,
   same-day and past dates allowed, no maximum span *(interview)*. No
   balance or entitlement is checked or stored.

8. **Duplicates are allowed, edits are not.** The same person may submit the
   same dates twice; nothing is deduplicated. Once submitted a row is never
   edited — changes are withdraw + new, or Copy to new, which merely prefills
   a blank new form client-side and creates a fresh row. A request has no
   free-text remark of its own (HRMS doc §7.2 has none), so what a copy
   prefills is type, dates, signer and the Other leave text.

9. **Visibility matrix (who can do what).**

   | | Their own requests | Others' requests | Queue they act on |
   |---|---|---|---|
   | Employee | full list + own actions | not visible (page-not-found, no data leak) | — |
   | Supervisor | — (cannot submit) | only requests where they are the signer: queue first, then history | Sign / Reject |
   | HR | — | queue (Pending HR, newest first) on top, then **every** request ever submitted (the full record, like the spreadsheet) | Approve / Reject, subject to rule 4 |
   | Admin | — | every request: table newest-first + read-only detail | nothing |

10. **Confirm then succeed.** Every action (submit, sign, reject, send to
    HR, approve, withdraw) opens the styled confirmation modal first — Cancel
    changes nothing — and after a confirmed action the page reloads with a
    green success banner. The banner text comes from a fixed list of keys
    (e.g. `?msg=request-submitted`), never from anything the user typed.

11. **Wrong access looks like absence.** Opening another person's
    `/employee/[id]`, a supervisor detail you are not the signer of, or any
    leave page while logged out ends in a page-not-found or the `/login`
    redirect — never a "this is not yours to see" page that leaks that the
    record exists.

## 3. Technology

Unchanged: exactly the login §3 table (Next.js 16 + TypeScript App Router,
server actions, SQLite via Prisma 6, Tailwind 4, signed session cookie). No
new package, no new tool.

## 4. Screens (routes)

The four home pages from login §4 grow real content; nothing else from login
changes. All pages sit inside the existing protected layout (header with
name, role badge, Sign out) on the lavender page + white card.

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/employee` | Employee | Own requests, newest first: type, dates, status badge, remarks when set; each row links to its detail. "New request" pill button top right. Row actions per the machine: Withdraw (Pending supervisor / Signed), Send to HR (Signed), Copy to new (any) | To do |
| `/employee/new` | Employee | Request form: leave type (5 choices, Reference C); "what is it for" box appearing only for Other; start and end date boxes; signer picker (same-division Supervisors by name, or HR officers when the division has none, per rule 3). Submit pill; server-side errors shown as red strips, values kept | To do |
| `/employee/[id]` | Employee (owner only) | Full record: type (with Other text), dates, status badge, remarks, signer, decider, the dates trail (submitted / signed / sent / decided). Buttons only where this owner's machine row allows. "Copy to new" button | To do |
| `/supervisor` | Supervisor | Top: to-sign queue (Pending supervisor addressed to me, oldest first so nothing waits unfairly). Below: every request ever addressed to me. Columns: employee, division, type, dates, status badge, remark when set, submitted date. Rows link to detail | To do |
| `/supervisor/[id]` | Supervisor (assigned signer only) | Full record; while Pending supervisor: Sign pill, Reject pill (opens the modal with a required remark box). After acting: the record read-only with what was decided | To do |
| `/hr` | HR | Top: shared Pending HR queue (any officer except their own signatures), newest first. Below: every request ever submitted, including supervisor rejections. Rows flagged "you signed this" carry no action links into deciding | To do |
| `/hr/[id]` | HR (any officer) | Full record. If Pending HR and you did not sign it: Approve pill, Reject pill (modal with required remark). If you signed it: "you signed this request" flag, no buttons | To do |
| `/admin` | Admin | One table, every request newest submitted first: employee, division, type, start/end, status badge, signer, HR officer, submitted/decided dates. Row click → detail. (Status/division filters are Low — build only if time remains) | To do |
| `/admin/[id]` | Admin | Same full record as `/employee/[id]`, strictly read-only: no buttons exist in the markup at all | To do |

### Visual design (extends login §4, same language)

- **Status badges:** small pill next to each request's title — Pending
  supervisor (amber), Signed (indigo), Pending HR (violet), Approved (green),
  Rejected by supervisor / Rejected by HR (red), Withdrawn (grey).
- **Confirmation modal (FR-07, *(interview)*):** dimmed lavender overlay;
  centred white card, rounded 24 px, soft shadow; short question ("Sign this
  request for Employee 1?"), optional remark box for the two rejects,
  full-width pill buttons — muted "CANCEL" and deep-purple "CONFIRM"; reject
  confirms use a red pill. It is a client component that submits to the
  server action; the server does the same checks again regardless.
- **Success banner:** rounded green strip above the list/detail with
  `role="status"` ("Request sent to HR."). **Form errors:** red strips,
  `role="alert"`, values kept — same treatment as the login error.
- **Empty states:** friendly one-liners ("No requests yet — press New
  request"; "Nothing waiting for you").

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | (change) `LeaveRequest` model + `LeaveType` and `Status` enums from §1 / Reference C |
| `prisma/seed.ts` | (change) the six login §Reference-B users plus the three test users of Reference D below — still upsert-by-email, safe to re-run |
| `src/lib/leave.ts` | (create) the one source of truth: status machine of §2 rule 1, the server validators (`validateRequest`, `validateRemark`), permission helpers (`canSign`, `canWithdraw`, `canSend`, `canDecide` — including the fallback and no-self-deciding checks) |
| `src/app/(protected)/employee/new/page.tsx` | (create) the request form (type, conditional Other text, dates, signer picker) |
| `src/app/(protected)/employee/actions.ts` | (create) server actions: `createRequest`, `sendToHr`, `withdraw` — each calls `requireUser`/`requireRole`, loads the row, applies `src/lib/leave.ts`, never reads status/ids from the form |
| `src/app/(protected)/employee/page.tsx` | (change) own-request list with badges and allowed row actions |
| `src/app/(protected)/employee/[id]/page.tsx` | (create) owner detail + allowed buttons; `notFound()` for non-owners |
| `src/app/(protected)/supervisor/page.tsx` | (change) to-sign queue + history list |
| `src/app/(protected)/supervisor/[id]/page.tsx` + `actions.ts` | (create) signer detail; `sign`, `rejectBySupervisor` actions (remark checked server-side; non-signers refused) |
| `src/app/(protected)/hr/page.tsx` | (change) shared queue + full record list with "you signed this" flags |
| `src/app/(protected)/hr/[id]/page.tsx` + `actions.ts` | (create) HR detail; `approve`, `rejectByHr` actions (decider recorded from the session; signer self-check) |
| `src/app/(protected)/admin/page.tsx` | (change) the all-requests table |
| `src/app/(protected)/admin/[id]/page.tsx` | (create) read-only detail — import-only, no actions module |
| `src/components/status-badge.tsx` | (create) badge per Reference C, one colour map |
| `src/components/confirm-modal.tsx` | (create) the styled modal of §4 (client component; optional required remark box) |
| `src/components/success-banner.tsx` | (create) reads a whitelisted `?msg=` key and renders the matching banner |
| `next.config.ts` | (change) extend the `no-store` header patterns to the new sub-routes (`/employee/*`, `/supervisor/*`, `/hr/*`, `/admin/*`) so detail pages are never cached |

## 6. Security (in plain words)

Everything from login §6 stays true; this module adds:

- **Every page checks** role *and* row ownership: the lists filter strictly
  by session user (Employee → own `employeeId`; Supervisor → own
  `supervisorId`; HR/Admin → all), and every `[id]` page calls `notFound()`
  for a row the session must not see — never a "forbidden" that leaks the
  record's existence.
- **Every action checks again on the server:** `requireUser()`/`requireRole()`,
  then the row is re-read from the database and the action is checked against
  its *stored* status and the session user (owner? signer? HR officer who is
  not the signer?). A forged fetch that posts `status`, `employeeId`,
  `supervisorId` or `hrOfficerId` changes nothing — those fields are never
  taken from form data (no mass assignment).
- **Every value is validated server-side:** dates are real calendar days
  with end ≥ start; leave type is one of the five; `otherLeaveType` is
  required and ≤ 200 chars exactly when type is Other; remarks for the two
  rejects are required and ≤ 200 chars; the signer matches rule 3.
- **Input reaches the screen safely:** values render through React (escaped)
  and queries through Prisma's parameterised calls — remarks and Other-text
  are free-form user text, so no raw HTML and no string SQL anywhere.
- **Logs:** normal business events (who acted on which request id, and
  refusals) with role and id only — no cookies, no full remarks in logs.
- **Session:** the existing signed cookie from login §6 is the only
  credential; `httpOnly`/`sameSite=Lax`/`secure`, re-checked on every new
  page and action; `no-store` extended to the sub-routes (§5).

## 7. Commands

Unchanged from login §7, plus after a schema change:

| Command | What it does |
|---------|--------------|
| `npx prisma migrate dev` | Applies the new `LeaveRequest` table + enums to the SQLite file |
| `npx prisma db seed` | Re-run: keeps the six original users, adds the three Reference-D test users (safe, upsert) |

---

## Reference C. Leave types and statuses (fixed lists)

**Leave types** — the choices on the leave form (HRMS doc §7.2):

| Value | Label on screen | What it is for |
|-------|-----------------|----------------|
| `Annual` | Annual leave | Yearly paid leave |
| `Maternity` | Maternity leave | For employees who are expecting or have just given birth |
| `Unpaid` | Unpaid leave | Leave without pay |
| `Compassionate` | Compassionate leave | For a family emergency or bereavement |
| `Other` | Other | The employee must write what the leave is for (`otherLeaveType`) |

**Statuses** — seven, matching HRMS doc §5.2 plus Withdrawn *(interview)*:

| Value | Label | Meaning |
|-------|-------|---------|
| `PendingSupervisor` | Pending supervisor | Submitted; waiting for the signer (a Supervisor, or an HR officer via the fallback) |
| `Signed` | Signed | The signer signed; the employee can send it to HR |
| `PendingHR` | Pending HR | In the shared HR queue, waiting for a decision |
| `Approved` | Approved | HR approved. Final |
| `RejectedBySupervisor` | Rejected by supervisor | The signer rejected it, with a remark. Final |
| `RejectedByHR` | Rejected by HR | HR rejected it, with a remark. Final |
| `Withdrawn` | Withdrawn | The employee took it back before HR. Final |

## Reference D. Extra demo users *(interview-approved addition)*

The six doc accounts (Reference B) are unchanged. These three exist so the
division rules and the HR fallback can be exercised in the UI; they log in
with `password123` (hashed) like everyone else and are documented as test
users wherever they appear.

| Email | Name | IC No. | Role | Division | Designation | Why it exists |
|-------|------|--------|------|----------|-------------|---------------|
| `employee-2@budiman.com` | Employee 2 | 00-200101 | Employee | Marketing | Marketing Assistant | A second employee (separation checks, AC-25/AC-31) |
| `supervisor-3@budiman.com` | Supervisor 3 | 00-200202 | Supervisor | Marketing | Marketing Manager | A second division (AC-17, AC-26: lists are division-scoped) |
| `employee-3@budiman.com` | Employee 3 | 00-200303 | Employee | Operations | Operations Executive | Operations has no Supervisor → exercises the HR fallback and the no-self-deciding rule (AC-18, AC-24) |
